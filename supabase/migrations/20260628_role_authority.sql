-- =============================================================================
-- 20260628 — Role authority: make profiles.role server-managed.
-- -----------------------------------------------------------------------------
-- PROBLEM: profiles.role is the source of truth for "owner vs member" (the
-- `members` relation is a VIEW over profiles), yet it was fully client-writable.
-- Owner signup client-wrote role='owner', and nothing stopped a MEMBER from
-- doing the same → role escalation. The 20260607 lockdown covers status/plan/
-- expiry, NOT role.
--
-- FIX (two parts, same GUC-flag pattern as 20260607 / 20260621):
--   1. app_register_owner() — the ONE trusted path to become an owner. Reuses
--      ensure_gym_settings() (which creates a gym_settings row with
--      gym_owner_id = auth.uid()), then stamps the CALLER'S OWN profile/
--      gym_profile role='owner' behind a transaction-local flag. Ownership is
--      bound to auth.uid(), so a caller can only ever own the gym they just
--      created — never claim an existing one.
--   2. trg_lock_role (BEFORE INSERT OR UPDATE on profiles) — an untrusted caller
--      may only ever be a member: INSERT with role <> 'member' is rejected
--      (NULL defaults to 'member'); an UPDATE that *changes* role is rejected.
--      The flag is set only inside the SECURITY DEFINER RPC; PostgREST clients
--      cannot issue a bare SET, so it can't be spoofed.
--
-- Idempotent; safe to re-run. Apply AFTER 20260621_subscription_security.
-- =============================================================================

begin;

-- 1. Trusted owner-registration RPC. -----------------------------------------
create or replace function public.app_register_owner(
  p_gym_name text default null,
  p_city     text default null,
  p_email    text default null,
  p_mobile   text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_gym   uuid;
begin
  if v_owner is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  -- Provision (idempotently) this owner's gym_settings row + 7-day trial.
  -- ensure_gym_settings keys the row to auth.uid() and returns its id.
  v_gym := public.ensure_gym_settings(null, p_gym_name, p_email);

  -- Authorize the role write for the remainder of THIS transaction only.
  perform set_config('app.allow_role_write', 'on', true);

  insert into public.profiles (id, role, gym_id, gym_name, city, email, mobile_number)
  values (v_owner, 'owner', v_gym, p_gym_name, p_city, p_email, p_mobile)
  on conflict (id) do update
    set role          = 'owner',
        gym_id        = excluded.gym_id,
        gym_name      = coalesce(excluded.gym_name, profiles.gym_name),
        city          = coalesce(excluded.city, profiles.city),
        email         = coalesce(excluded.email, profiles.email),
        mobile_number = coalesce(excluded.mobile_number, profiles.mobile_number);

  -- Mirror into gym_profiles (owner directory) when that table exists.
  begin
    insert into public.gym_profiles (id, role, gym_id, gym_name, city, email, phone, mobile_number)
    values (v_owner, 'owner', v_gym, p_gym_name, p_city, p_email, p_mobile, p_mobile)
    on conflict (id) do update
      set role          = 'owner',
          gym_id        = excluded.gym_id,
          gym_name      = coalesce(excluded.gym_name, gym_profiles.gym_name),
          city          = coalesce(excluded.city, gym_profiles.city),
          email         = coalesce(excluded.email, gym_profiles.email),
          phone         = coalesce(excluded.phone, gym_profiles.phone),
          mobile_number = coalesce(excluded.mobile_number, gym_profiles.mobile_number);
  exception
    when undefined_table then null;  -- gym_profiles not present in this env
  end;

  return v_gym;
end;
$$;

grant execute on function public.app_register_owner(text, text, text, text) to authenticated;

-- 2. Lock the role column on profiles (the members chokepoint). ---------------
create or replace function public.app_lock_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Trusted server path (app_register_owner) — allow any role write.
  if coalesce(current_setting('app.allow_role_write', true), '') = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A client may only ever self-register as a member.
    if new.role is null then
      new.role := 'member';
    elsif new.role <> 'member' then
      raise exception 'role is server-managed; become an owner via app_register_owner()'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  -- UPDATE: role may not change through an untrusted path (no self-promotion).
  if new.role is distinct from old.role then
    raise exception 'role is server-managed and cannot be changed here'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_lock_role on public.profiles;
create trigger trg_lock_role
  before insert or update on public.profiles
  for each row execute function public.app_lock_role();

commit;

-- ============================================================================
-- Post-apply verification (SQL editor):
--   • As an authenticated user:  select app_register_owner('My Gym','Pune','o@x.com','+919999999999');
--       → returns a uuid; profiles.role='owner', a gym_settings row on trial.
--   • As a member: update profiles set role='owner' where id = auth.uid();
--       → must RAISE check_violation (role is server-managed).
--   • As a member: insert into profiles (id, role) values (gen_random_uuid(),'owner');
--       → must RAISE check_violation.
-- ============================================================================
