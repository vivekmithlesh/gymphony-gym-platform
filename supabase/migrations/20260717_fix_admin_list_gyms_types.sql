-- =============================================================================
-- 20260717 — Fix: "Could not load gyms" on /platform-admin.
-- -----------------------------------------------------------------------------
-- app_admin_list_gyms() / app_admin_recent_logins() are RETURNS TABLE functions,
-- so PostgreSQL requires every projected column's type to EXACTLY match the
-- declared OUT type, otherwise it raises 42804 "structure of query does not
-- match function result type" at call time (the stats RPC returns jsonb and is
-- unaffected — which is why stat cards loaded but the gym table didn't).
--
-- Root cause: gym_settings.created_at may pre-exist as `timestamp without time
-- zone` (so the 20260716 "add column if not exists ... timestamptz" was a no-op),
-- while the function declared it timestamptz. We make this whole class of error
-- impossible by casting every returned column to its declared type explicitly.
--
-- Idempotent; safe to re-run. Apply AFTER 20260716_platform_admin_panel.sql.
-- =============================================================================

begin;

-- Gyms + subscription + member count + last login (now cast-safe). -----------
create or replace function public.app_admin_list_gyms(p_limit integer default 500)
returns table (
  gym_id        uuid,
  gym_name      text,
  owner_id      uuid,
  owner_name    text,
  owner_email   text,
  plan_tier     text,
  plan_status   text,
  billing_cycle text,
  member_count  bigint,
  created_at    timestamptz,
  trial_ends_at timestamptz,
  expiry_date   timestamptz,
  last_login    timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'not authorized' using errcode = 'insufficient_privilege';
  end if;

  return query
    select
      gs.id::uuid,
      coalesce(nullif(btrim(gs.gym_name), ''), 'Unnamed gym')::text,
      gs.gym_owner_id::uuid,
      op.full_name::text,
      coalesce(nullif(btrim(gs.owner_email), ''), op.email)::text,
      gs.plan_tier::text,
      gs.plan_status::text,
      gs.billing_cycle::text,
      (select count(*) from public.profiles mp where mp.gym_id = gs.id and mp.role = 'member')::bigint,
      gs.created_at::timestamptz,
      gs.trial_ends_at::timestamptz,
      gs.expiry_date::timestamptz,
      (select max(le.login_at) from public.app_login_events le where le.user_id = gs.gym_owner_id)::timestamptz
    from public.gym_settings gs
    left join public.profiles op on op.id = gs.gym_owner_id
    order by gs.created_at desc nulls last
    limit greatest(coalesce(p_limit, 500), 0);
end;
$$;
grant execute on function public.app_admin_list_gyms(integer) to authenticated;

-- Recent login feed (cast-safe, same defensive treatment). -------------------
create or replace function public.app_admin_recent_logins(p_limit integer default 100)
returns table (
  id         uuid,
  user_id    uuid,
  email      text,
  role       text,
  gym_id     uuid,
  gym_name   text,
  login_at   timestamptz,
  user_agent text,
  device     text,
  status     text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'not authorized' using errcode = 'insufficient_privilege';
  end if;

  return query
    select le.id::uuid, le.user_id::uuid, le.email::text, le.role::text,
           le.gym_id::uuid, le.gym_name::text, le.login_at::timestamptz,
           le.user_agent::text, le.device::text, le.status::text
    from public.app_login_events le
    order by le.login_at desc
    limit greatest(coalesce(p_limit, 100), 0);
end;
$$;
grant execute on function public.app_admin_recent_logins(integer) to authenticated;

commit;

notify pgrst, 'reload schema';

-- ============================================================================
-- After applying, the Gyms tab loads. To confirm the exact original cause:
--   select column_name, data_type from information_schema.columns
--   where table_schema='public' and table_name='gym_settings'
--     and column_name in ('created_at','trial_ends_at','expiry_date');
-- ============================================================================
