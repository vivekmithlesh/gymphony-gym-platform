// =============================================================================
// owner-signup — the single, isolated "create a gym owner" flow.
// -----------------------------------------------------------------------------
// Owner and member signup are deliberately separate code paths. This module owns
// the OWNER path: create the auth user (role=owner), then provision the gym and
// stamp role='owner' through the trusted `app_register_owner` RPC (migration
// 20260628) so the client never writes role itself.
//
// Resilience: if that RPC isn't deployed yet (a live DB without 20260628), we
// fall back to the legacy `ensure_gym_settings` + client profile upserts so
// production owner signup never breaks. Once the migration is applied, the
// `role` column is locked server-side and the RPC is the only way in.
// =============================================================================

import { supabase } from "@/supabase";
import { toIndianE164 } from "@/lib/phone";

export interface OwnerSignupInput {
  gymName: string;
  city: string;
  email: string;
  /** 10-digit Indian local number (stored canonically as +91 E.164). */
  mobile: string;
  password: string;
}

export type RegisterOwnerOutcome =
  | { status: "created"; hasSession: boolean; gymId: string }
  | { status: "exists" }
  | { status: "rate_limited"; ownerExists: boolean };

/** PostgREST returns code PGRST202 when an RPC isn't in the schema cache. */
function isFunctionMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST202") return true;
  return /could not find the function|does not exist/i.test(error.message || "");
}

async function provisionOwner(userId: string, input: OwnerSignupInput, e164: string): Promise<string> {
  // Preferred: trusted server RPC — provisions the gym + stamps role='owner'.
  const { data, error } = await supabase.rpc("app_register_owner", {
    p_gym_name: input.gymName,
    p_city: input.city,
    p_email: input.email,
    p_mobile: e164,
  });
  if (!error && data) return data as string;
  // A real RPC error (exists but failed) must surface — don't silently fall back
  // to the client path, which the role lock would (correctly) reject post-migration.
  if (error && !isFunctionMissing(error)) throw error;

  // Legacy fallback (DB without 20260628): create the gym + write profile rows.
  let gymId: string = crypto.randomUUID();
  try {
    const { data: ensuredId, error: ensureErr } = await supabase.rpc("ensure_gym_settings", {
      p_gym_id: gymId,
      p_gym_name: input.gymName,
      p_email: input.email,
    });
    if (ensureErr) throw ensureErr;
    if (ensuredId) gymId = ensuredId as string;
  } catch (e) {
    console.warn("ensure_gym_settings failed (dashboard will retry):", e);
  }

  await supabase.from("profiles").upsert(
    [{ id: userId, role: "owner", gym_id: gymId, gym_name: input.gymName, city: input.city, email: input.email, mobile_number: e164 }],
    { onConflict: "id" },
  );
  await supabase.from("gym_profiles").upsert(
    [{ id: userId, role: "owner", gym_id: gymId, gym_name: input.gymName, city: input.city, email: input.email, phone: e164, mobile_number: e164 }],
    { onConflict: "id" },
  );

  return gymId;
}

/**
 * Create a gym owner. Returns a discriminated outcome so the caller drives the
 * UI (toasts / redirects). Throws only on unexpected errors.
 */
export async function registerOwner(input: OwnerSignupInput): Promise<RegisterOwnerOutcome> {
  const email = input.email.trim();
  const e164 = toIndianE164(input.mobile);

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: { data: { role: "owner" } },
  });

  if (authError) {
    const msg = String(authError.message || "").toLowerCase();
    if (authError.status === 429 || msg.includes("rate limit") || msg.includes("over_email_send_rate_limit")) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("role")
        .eq("email", email)
        .maybeSingle();
      return { status: "rate_limited", ownerExists: existing?.role === "owner" };
    }
    if (msg.includes("already") || msg.includes("exists") || msg.includes("registered")) {
      return { status: "exists" };
    }
    throw authError;
  }

  const userId = authData.user?.id;
  if (!userId) throw new Error("Failed to create auth user");

  const gymId = await provisionOwner(userId, { ...input, email }, e164);
  return { status: "created", hasSession: Boolean(authData.session), gymId };
}
