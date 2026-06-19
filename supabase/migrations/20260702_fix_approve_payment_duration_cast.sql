-- =============================================================================
-- 20260702 — Fix approve_payment: guard the gym_plans.duration -> days math.
-- -----------------------------------------------------------------------------
-- BUG: approve_payment (last defined in 20260607) computed the plan length with
--   coalesce(gp.duration_days, gp.duration * 30, 30)
-- but gym_plans.duration is stored as TEXT in the live DB (see 20260618). Postgres
-- type-checks `text * integer` at plan time, so the whole statement failed with:
--   operator does not exist: text * integer
-- That broke EVERY member-payment approval (OwnerPendingPayments → approve_payment),
-- regardless of the row's data.
--
-- FIX: use the same defensive cast the rest of the codebase already uses
-- (20260605 / 20260617 / 20260618 / 20260626): only multiply when duration is a
-- numeric string, else fall back to 30 days. Function body is otherwise identical
-- to the 20260607 version. Idempotent (create or replace); safe to re-run.
-- =============================================================================

create or replace function public.approve_payment(p_payment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner       uuid := auth.uid();
  v_member      uuid;
  v_gym         uuid;
  v_plan        text;
  v_amount      numeric;
  v_status      text;
  v_member_name text;
  v_duration    integer;
  v_expiry      timestamptz;
begin
  if v_owner is null then
    return jsonb_build_object('success', false, 'error', 'Not signed in.');
  end if;

  select member_id, gym_id, plan_name, amount, status
    into v_member, v_gym, v_plan, v_amount, v_status
  from public.payments
  where id = p_payment_id and gym_owner_id = v_owner
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Payment not found or not yours.');
  end if;
  if v_status = 'Success' then
    return jsonb_build_object('success', true, 'already', true);
  end if;

  -- duration is TEXT in the live DB: cast through text->int only when numeric,
  -- otherwise fall back to 30 days. Avoids `text * integer` (the old bug).
  select coalesce(
           gp.duration_days,
           case when (gp.duration)::text ~ '^[0-9]+$' then (gp.duration)::text::int * 30 end,
           30
         )
    into v_duration
  from public.gym_plans gp
  where gp.gym_id = v_gym and (gp.name = v_plan or gp.plan_name = v_plan)
  order by gp.created_at desc
  limit 1;
  if v_duration is null then v_duration := 30; end if;
  v_expiry := now() + make_interval(days => v_duration);

  update public.payments set status = 'Success' where id = p_payment_id;

  -- Activate via the single authorized writer (sets the lockdown flag).
  perform public.app_activate_member(v_member, v_plan, v_expiry);

  select coalesce(m.full_name, m.member_name, 'A member')
    into v_member_name from public.members m where m.id = v_member;

  insert into public.activity_log (gym_owner_id, activity_type, description, is_read)
  values (
    v_owner, 'payment',
    coalesce(v_member_name, 'A member') || ' payment of ₹' || v_amount::text || ' approved (' || coalesce(v_plan, 'plan') || ').',
    false
  );

  return jsonb_build_object('success', true, 'expiry_date', v_expiry, 'plan', v_plan);
end;
$$;

revoke all on function public.approve_payment(uuid) from public;
grant execute on function public.approve_payment(uuid) to authenticated;

notify pgrst, 'reload schema';
