// =============================================================================
// platform-billing — client helpers for the manual-UPI OWNER subscription flow.
// -----------------------------------------------------------------------------
// Owner pays the platform's UPI, enters a UTR, and submits a pending request
// (app_submit_subscription_payment). A platform admin approves/rejects it
// (app_review_subscription_payment) — approval activates the plan server-side.
// All writes go through SECURITY DEFINER RPCs (migration 20260629); the client
// never writes plan/subscription rows directly.
// =============================================================================

import { supabase } from "@/supabase";
import type { PlanTier, BillingCycle } from "@/lib/plans";

export interface PlatformUpi {
  upi_id: string;
  name: string;
  note: string;
}

export interface SubscriptionPayment {
  id: string;
  owner_id: string;
  gym_id: string | null;
  tier: string;
  billing_cycle: string;
  amount: number;
  utr: string | null;
  evidence_url: string | null;
  status: "pending_verification" | "approved" | "rejected" | string;
  reject_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; error: string; duplicate?: boolean; notConfigured?: boolean };

/** The platform's UPI payee details (where owners send subscription payments). */
export async function getPlatformUpi(): Promise<PlatformUpi> {
  const { data, error } = await supabase.rpc("get_platform_upi");
  if (error || !data) return { upi_id: "", name: "", note: "" };
  const d = data as Partial<PlatformUpi>;
  return { upi_id: d.upi_id || "", name: d.name || "", note: d.note || "" };
}

/** Submit a pending subscription payment. Amount is computed server-side. */
export async function submitSubscriptionPayment(args: {
  tier: PlanTier;
  cycle: BillingCycle;
  utr: string;
  evidenceUrl?: string | null;
}): Promise<SubmitResult> {
  const { data, error } = await supabase.rpc("app_submit_subscription_payment", {
    p_tier: args.tier,
    p_cycle: args.cycle,
    p_utr: args.utr,
    p_evidence_url: args.evidenceUrl ?? null,
  });
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") return { ok: false, error: "This UTR has already been submitted.", duplicate: true };
    if (code === "PGRST202") return { ok: false, error: "Billing isn't set up yet. Please contact support.", notConfigured: true };
    return { ok: false, error: error.message || "Could not submit your payment." };
  }
  return { ok: true, id: data as string };
}

/** Admin: approve or reject a pending request. Approval activates the plan. */
export async function reviewSubscriptionPayment(
  id: string,
  action: "approve" | "reject",
  reason?: string,
): Promise<{ success: boolean; error?: string; status?: string }> {
  const { data, error } = await supabase.rpc("app_review_subscription_payment", {
    p_id: id,
    p_action: action,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return (data ?? { success: false }) as { success: boolean; error?: string; status?: string };
}

/** Admin: pending requests awaiting verification. */
export async function fetchPendingSubscriptions(): Promise<SubscriptionPayment[]> {
  const { data, error } = await supabase
    .from("subscription_payments")
    .select("*")
    .eq("status", "pending_verification")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SubscriptionPayment[];
}

/** Admin: full history (RLS lets admins read all; owners only their own). */
export async function fetchAllSubscriptions(limit = 100): Promise<SubscriptionPayment[]> {
  const { data, error } = await supabase
    .from("subscription_payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SubscriptionPayment[];
}

/** Owner: this owner's subscription payment history. */
export async function fetchMySubscriptionPayments(ownerId: string): Promise<SubscriptionPayment[]> {
  const { data, error } = await supabase
    .from("subscription_payments")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SubscriptionPayment[];
}

/** Admin: update the platform UPI payee details. */
export async function setPlatformUpi(upiId: string, name: string, note?: string): Promise<void> {
  const { error } = await supabase.rpc("app_set_platform_upi", {
    p_upi_id: upiId,
    p_name: name,
    p_note: note ?? null,
  });
  if (error) throw error;
}
