-- =============================================================================
-- 20260629 — Manual-UPI owner subscriptions + platform admin; remove mock.
-- -----------------------------------------------------------------------------
-- Replaces the mock/Razorpay owner-billing path with a production manual-UPI
-- flow that mirrors the member rails (20260626): owner submits a
-- 'pending_verification' subscription_payment with a UTR; a PLATFORM ADMIN
-- approves/rejects; approval activates the plan via the existing GUC-flagged
-- gym_settings write (lockdown trigger from 20260621). Full audit throughout.
--
-- Also REMOVES the mock system: app_simulate_online_payment, the
-- mock_payments_enabled config flag, and gym_settings.allow_mock_payments.
--
-- Idempotent; safe to re-run. Depends on app_config (20260625), the
-- gym_settings plan columns + lockdown (20260621), profiles.
-- =============================================================================

begin;

-- 1. Platform admin flag (server-managed; never user-editable). ---------------
alter table public.profiles
  add column if not exists is_platform_admin boolean not null default false;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_platform_admin from public.profiles where id = auth.uid()), false);
$$;
grant execute on function public.is_platform_admin() to authenticated;

-- A client (real JWT) may never set/raise the admin flag. Only a non-JWT context
-- (SQL editor / service role, where auth.uid() is null) can grant admin-ship.
create or replace function public.app_lock_admin_flag()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.is_platform_admin, false) and auth.uid() is not null then
      new.is_platform_admin := false;
    end if;
  elsif tg_op = 'UPDATE'
        and new.is_platform_admin is distinct from old.is_platform_admin
        and auth.uid() is not null then
    raise exception 'is_platform_admin is not user-editable'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;
drop trigger if exists trg_lock_admin_flag on public.profiles;
create trigger trg_lock_admin_flag
  before insert or update on public.profiles
  for each row execute function public.app_lock_admin_flag();

-- 2. Platform UPI config (admin-editable; app_config is RLS-locked so access is
--    only ever through these SECURITY DEFINER functions). ---------------------
insert into public.app_config (key, value) values
  ('platform_upi_id', ''),
  ('platform_upi_name', ''),
  ('platform_upi_note', '')
on conflict (key) do nothing;

create or replace function public.get_platform_upi()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'upi_id', coalesce((select value from public.app_config where key = 'platform_upi_id'), ''),
    'name',   coalesce((select value from public.app_config where key = 'platform_upi_name'), ''),
    'note',   coalesce((select value from public.app_config where key = 'platform_upi_note'), '')
  );
$$;
grant execute on function public.get_platform_upi() to authenticated;

create or replace function public.app_set_platform_upi(
  p_upi_id text,
  p_name   text,
  p_note   text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'not authorized' using errcode = 'insufficient_privilege';
  end if;
  insert into public.app_config (key, value) values ('platform_upi_id', coalesce(p_upi_id, ''))
    on conflict (key) do update set value = excluded.value;
  insert into public.app_config (key, value) values ('platform_upi_name', coalesce(p_name, ''))
    on conflict (key) do update set value = excluded.value;
  insert into public.app_config (key, value) values ('platform_upi_note', coalesce(p_note, ''))
    on conflict (key) do update set value = excluded.value;
end;
$$;
grant execute on function public.app_set_platform_upi(text, text, text) to authenticated;

-- 3. subscription_payments — owner SaaS payment requests. ---------------------
create table if not exists public.subscription_payments (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null,
  gym_id        uuid,
  tier          text not null,
  billing_cycle text not null default 'monthly',
  amount        numeric not null,
  utr           text,
  evidence_url  text,
  status        text not null default 'pending_verification',
  reject_reason text,
  reviewed_by   uuid,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- A UPI UTR is globally unique per real transaction — never allow it twice.
create unique index if not exists subscription_payments_utr_unique_idx
  on public.subscription_payments (lower(utr))
  where utr is not null and btrim(utr) <> '';
create index if not exists subscription_payments_owner_idx  on public.subscription_payments (owner_id, created_at desc);
create index if not exists subscription_payments_status_idx on public.subscription_payments (status, created_at desc);

alter table public.subscription_payments enable row level security;
-- Owner reads own; admin reads all. ALL writes go through the SECURITY DEFINER
-- RPCs below (no client INSERT/UPDATE policy = clients can't write directly).
drop policy if exists subpay_select on public.subscription_payments;
create policy subpay_select on public.subscription_payments
  for select to authenticated
  using (owner_id = auth.uid() or public.is_platform_admin());

-- 4. Append-only audit trail (trigger-written; mirrors payment_audit). --------
create table if not exists public.subscription_audit (
  id          uuid primary key default gen_random_uuid(),
  payment_id  uuid not null,
  owner_id    uuid,
  actor       uuid,
  action      text not null,   -- submitted | approved | rejected | status_changed
  old_status  text,
  new_status  text,
  tier        text,
  amount      numeric,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists subscription_audit_payment_idx on public.subscription_audit (payment_id, created_at desc);
create index if not exists subscription_audit_owner_idx   on public.subscription_audit (owner_id, created_at desc);

alter table public.subscription_audit enable row level security;
drop policy if exists subaudit_select on public.subscription_audit;
create policy subaudit_select on public.subscription_audit
  for select to authenticated
  using (owner_id = auth.uid() or public.is_platform_admin());

create or replace function public.fn_subscription_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_action text;
begin
  begin
    if tg_op = 'INSERT' then
      insert into public.subscription_audit (payment_id, owner_id, actor, action, old_status, new_status, tier, amount)
      values (new.id, new.owner_id, auth.uid(), 'submitted', null, new.status, new.tier, new.amount);
    elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
      v_action := case new.status when 'approved' then 'approved' when 'rejected' then 'rejected' else 'status_changed' end;
      insert into public.subscription_audit (payment_id, owner_id, actor, action, old_status, new_status, tier, amount, note)
      values (new.id, new.owner_id, auth.uid(), v_action, old.status, new.status, new.tier, new.amount, new.reject_reason);
    end if;
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists trg_subscription_audit on public.subscription_payments;
create trigger trg_subscription_audit
  after insert or update on public.subscription_payments
  for each row execute function public.fn_subscription_audit();

-- 5. Submit RPC (owner) — server computes the amount; client can't tamper. ----
create or replace function public.app_submit_subscription_payment(
  p_tier         text,
  p_cycle        text default 'monthly',
  p_utr          text default null,
  p_evidence_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner   uuid := auth.uid();
  v_gym     uuid;
  v_tier    text := lower(coalesce(p_tier, ''));
  v_cycle   text := case when lower(coalesce(p_cycle, 'monthly')) = 'yearly' then 'yearly' else 'monthly' end;
  v_monthly integer;
  v_amount  numeric;
  v_id      uuid;
begin
  if v_owner is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;

  -- Server-side price map mirroring src/lib/plans.ts. Pro is waitlist-only.
  v_monthly := case v_tier when 'starter' then 999 when 'growth' then 1999 else null end;
  if v_monthly is null then
    raise exception 'invalid or unavailable plan tier %', p_tier using errcode = 'check_violation';
  end if;
  v_amount := case when v_cycle = 'yearly' then v_monthly * 10 else v_monthly end;  -- 2 months free

  if p_utr is null or btrim(p_utr) = '' then
    raise exception 'UTR is required' using errcode = 'check_violation';
  end if;

  select id into v_gym from public.gym_settings where gym_owner_id = v_owner limit 1;

  insert into public.subscription_payments
    (owner_id, gym_id, tier, billing_cycle, amount, utr, evidence_url, status)
  values
    (v_owner, v_gym, v_tier, v_cycle, v_amount, btrim(p_utr), p_evidence_url, 'pending_verification')
  returning id into v_id;

  return v_id;
end;
$$;
grant execute on function public.app_submit_subscription_payment(text, text, text, text) to authenticated;

-- 6. Review RPC (admin only) — approve activates the plan; reject keeps it off.
create or replace function public.app_review_subscription_payment(
  p_id     uuid,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin  uuid := auth.uid();
  v_rec    public.subscription_payments%rowtype;
  v_expiry timestamptz;
begin
  if not public.is_platform_admin() then
    raise exception 'not authorized' using errcode = 'insufficient_privilege';
  end if;

  select * into v_rec from public.subscription_payments where id = p_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Payment not found.');
  end if;
  if v_rec.status <> 'pending_verification' then
    return jsonb_build_object('success', false, 'error', 'This request is already ' || v_rec.status || '.');
  end if;

  if lower(p_action) = 'approve' then
    v_expiry := now() + case when v_rec.billing_cycle = 'yearly' then interval '365 days' else interval '30 days' end;

    -- Authorized plan write — honored by the 20260621 plan-column lockdown trigger.
    perform set_config('app.allow_plan_write', 'on', true);
    update public.gym_settings
       set plan_tier          = v_rec.tier,
           plan_type          = initcap(v_rec.tier),
           plan_status        = 'active',
           billing_cycle      = v_rec.billing_cycle,
           subscription_start = now(),
           expiry_date        = v_expiry,
           trial_ends_at      = null
     where gym_owner_id = v_rec.owner_id;

    update public.subscription_payments
       set status = 'approved', reviewed_by = v_admin, reviewed_at = now()
     where id = p_id;

    return jsonb_build_object('success', true, 'status', 'approved', 'tier', v_rec.tier, 'expiry', v_expiry);

  elsif lower(p_action) = 'reject' then
    update public.subscription_payments
       set status = 'rejected', reject_reason = p_reason, reviewed_by = v_admin, reviewed_at = now()
     where id = p_id;
    return jsonb_build_object('success', true, 'status', 'rejected');
  else
    raise exception 'invalid action %', p_action using errcode = 'check_violation';
  end if;
end;
$$;
grant execute on function public.app_review_subscription_payment(uuid, text, text) to authenticated;

-- 7. REMOVE the mock payment system. -----------------------------------------
drop function if exists public.app_simulate_online_payment(uuid);
delete from public.app_config where key = 'mock_payments_enabled';
alter table public.gym_settings drop column if exists allow_mock_payments;

commit;

notify pgrst, 'reload schema';

-- ============================================================================
-- Post-apply: bootstrap the first admin (no admin exists yet to grant it):
--   update public.profiles set is_platform_admin = true where email = 'you@example.com';
-- Then set the platform UPI from the admin dashboard (or):
--   select app_set_platform_upi('platform@upi', 'Gymphony Pvt Ltd', 'SaaS subscription');
-- Verification:
--   • a non-admin calling app_review_subscription_payment → raises 'not authorized'
--   • a client UPDATE profiles set is_platform_admin=true → raises (trigger)
--   • duplicate UTR insert → 23505
-- ============================================================================
