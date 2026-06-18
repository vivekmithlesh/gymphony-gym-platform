-- =====================================================================
-- 20260701 — Member payment: capture payer name alongside the UTR.
-- =====================================================================
-- The member UPI checkout (MemberUpiCheckout) now asks for the name used
-- for the payment, shown above the UTR field, so the owner can cross-check
-- a pending payment against the name on the UPI transfer when verifying it.
-- Mirrors subscription_payments.payer_name (owner→platform side, 20260630).
--
-- payments.payer_name = free text the member submits; nullable so existing
-- rows and non-UPI (cash/desk) payments are unaffected. The member-insert
-- RLS (member_id = self AND status = 'pending_verification') is row-based
-- and unchanged — a new nullable column needs no policy/grant changes.
--
-- Idempotent; safe to re-run.
-- =====================================================================

alter table public.payments add column if not exists payer_name text;

notify pgrst, 'reload schema';
