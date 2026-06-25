-- =============================================================================
-- 20260715 — Member-specific invite Accept/Reject flow (server-authoritative).
-- -----------------------------------------------------------------------------
-- Adds the RPCs behind /join/:gymId?invite=<token>:
--   • app_resolve_invite      — safe preview (gym + invited name + masked phone +
--                               plan + status). By token (the secret) for anyone;
--                               or by the CALLER'S OWN phone (no enumeration).
--   • app_accept_member_invite — links the invite to auth.uid() ONLY if the phone
--                               the member confirms matches the invite's phone
--                               (blocks a wrong-phone user from claiming a token).
--                               Binds the profile to the gym, status stays Pending
--                               (owner approval still gates activation).
--   • app_reject_member_invite — marks the invite rejected + notifies the owner.
--
-- Security: definer + validates auth.uid()/gym/phone; never trusts a client gym
-- owner id. Idempotent; safe to re-run.
-- =============================================================================

begin;

-- ── 1. Resolve (preview) ────────────────────────────────────────────────────
create or replace function public.app_resolve_invite(p_gym_id uuid, p_token text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_caller   uuid := auth.uid();
  v_gym_name text;
  v_phone    text;
  v_inv      public.member_invites%rowtype;
begin
  select gym_name into v_gym_name from public.gym_settings where id = p_gym_id;
  if v_gym_name is null then
    return jsonb_build_object('found', false, 'code', 'invalid_gym');
  end if;

  if nullif(trim(p_token), '') is not null then
    select * into v_inv from public.member_invites
    where gym_id = p_gym_id and invite_token = trim(p_token) limit 1;
  elsif v_caller is not null then
    -- Resolve by the CALLER'S OWN phone only (prevents enumerating invites).
    select coalesce(nullif(trim(phone), ''), nullif(trim(mobile_number), ''))
      into v_phone from public.profiles where id = v_caller;
    if v_phone is not null then
      select * into v_inv from public.member_invites
      where gym_id = p_gym_id
        and coalesce(status, '') in ('pending', 'invited', 'accepted', 'payment_pending')
        and (phone = v_phone or mobile_number = v_phone)
      order by created_at desc limit 1;
    end if;
  end if;

  if v_inv.id is null then
    return jsonb_build_object('found', false, 'code', 'no_invite', 'gym_name', v_gym_name);
  end if;

  return jsonb_build_object(
    'found', true,
    'gym_name', v_gym_name,
    'invite_id', v_inv.id,
    'full_name', v_inv.full_name,
    'phone_masked', case when v_inv.phone is not null
      then repeat('•', greatest(length(v_inv.phone) - 4, 0)) || right(v_inv.phone, 4) else null end,
    'membership_plan', v_inv.membership_plan,
    'status', v_inv.status
  );
end $$;
revoke all on function public.app_resolve_invite(uuid, text) from public;
grant execute on function public.app_resolve_invite(uuid, text) to anon, authenticated;

-- ── 2. Accept (link + bind) ─────────────────────────────────────────────────
create or replace function public.app_accept_member_invite(
  p_gym_id uuid, p_token text default null, p_phone text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_member uuid := auth.uid();
  v_owner  uuid;
  v_phone  text := nullif(trim(p_phone), '');
  v_name   text;
  v_inv    public.member_invites%rowtype;
begin
  if v_member is null then
    return jsonb_build_object('success', false, 'code', 'unauthenticated', 'error', 'Please sign in first.');
  end if;
  select gym_owner_id into v_owner from public.gym_settings where id = p_gym_id;
  if v_owner is null then
    return jsonb_build_object('success', false, 'code', 'invalid_gym', 'error', 'Gym not found.');
  end if;

  if nullif(trim(p_token), '') is not null then
    select * into v_inv from public.member_invites
    where gym_id = p_gym_id and invite_token = trim(p_token) limit 1;
  elsif v_phone is not null then
    select * into v_inv from public.member_invites
    where gym_id = p_gym_id and (phone = v_phone or mobile_number = v_phone)
      and coalesce(status, '') in ('pending', 'invited', 'accepted', 'payment_pending')
    order by created_at desc limit 1;
  end if;

  if v_inv.id is null then
    return jsonb_build_object('success', false, 'code', 'no_invite', 'error', 'No invite found for this gym.');
  end if;
  if v_phone is null then
    return jsonb_build_object('success', false, 'code', 'phone_required', 'error', 'Please enter your phone number.');
  end if;
  -- SECURITY: the confirmed phone MUST match the invite's number.
  if v_inv.phone is distinct from v_phone and v_inv.mobile_number is distinct from v_phone then
    return jsonb_build_object('success', false, 'code', 'phone_mismatch',
      'error', 'This invite is linked to a different mobile number. Please contact the gym.');
  end if;

  v_name := coalesce((select full_name from public.profiles where id = v_member), v_inv.full_name);

  -- Bind the member's own profile to the gym. status stays Pending (owner approval
  -- activates). gym_id/gym_owner_id/phone/name aren't lockdown columns.
  insert into public.profiles (id, full_name, phone, mobile_number, gym_id, gym_owner_id, status, role)
  values (v_member, v_name, v_phone, v_phone, p_gym_id, v_owner, 'Pending', 'member')
  on conflict (id) do update
    set full_name     = coalesce(public.profiles.full_name, excluded.full_name),
        phone         = coalesce(excluded.phone, public.profiles.phone),
        mobile_number = coalesce(excluded.mobile_number, public.profiles.mobile_number),
        gym_id        = excluded.gym_id,
        gym_owner_id  = excluded.gym_owner_id;

  update public.member_invites
     set status = 'accepted', claimed_by = v_member, claimed_at = coalesce(claimed_at, now())
   where id = v_inv.id;

  insert into public.activity_log (gym_owner_id, activity_type, description, is_read)
  values (v_owner, 'invite', coalesce(v_name, 'A member') || ' accepted the gym invite.', false);

  return jsonb_build_object('success', true, 'code', 'accepted',
    'invite_id', v_inv.id, 'gym_id', p_gym_id, 'membership_plan', v_inv.membership_plan);
end $$;
revoke all on function public.app_accept_member_invite(uuid, text, text) from public, anon;
grant execute on function public.app_accept_member_invite(uuid, text, text) to authenticated;

-- ── 3. Reject ───────────────────────────────────────────────────────────────
create or replace function public.app_reject_member_invite(p_gym_id uuid, p_token text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_member uuid := auth.uid();
  v_owner  uuid;
  v_inv    public.member_invites%rowtype;
begin
  if v_member is null then
    return jsonb_build_object('success', false, 'code', 'unauthenticated');
  end if;
  if nullif(trim(p_token), '') is not null then
    select * into v_inv from public.member_invites where gym_id = p_gym_id and invite_token = trim(p_token) limit 1;
  end if;
  if v_inv.id is null then
    return jsonb_build_object('success', false, 'code', 'no_invite');
  end if;

  update public.member_invites set status = 'rejected'
   where id = v_inv.id and coalesce(status, '') <> 'active';

  select gym_owner_id into v_owner from public.gym_settings where id = p_gym_id;
  if v_owner is not null then
    insert into public.activity_log (gym_owner_id, activity_type, description, is_read)
    values (v_owner, 'invite', coalesce(v_inv.full_name, 'A member') || ' declined the gym invite.', false);
  end if;

  return jsonb_build_object('success', true, 'code', 'rejected');
end $$;
revoke all on function public.app_reject_member_invite(uuid, text) from public, anon;
grant execute on function public.app_reject_member_invite(uuid, text) to authenticated;

commit;

notify pgrst, 'reload schema';
