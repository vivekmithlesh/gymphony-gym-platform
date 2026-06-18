// =============================================================================
// member-signup — the single, isolated "create a member" flow.
// -----------------------------------------------------------------------------
// Counterpart to owner-signup.ts. Members are created here ONLY (role=member);
// they never touch the owner "Create My Gym" path. Two entry shapes:
//   • self-serve  → registerMember() then pick a gym on /member-join
//   • invite claim → registerMember() then claimInvite() to bind the pending
//     members slot the owner created in BulkOnboard.
//
// `ensureMemberProfile` is shared with /member-login so a returning member who
// lacks a profile/members row still gets one (role=member).
// =============================================================================

import type { User } from "@supabase/supabase-js";
import { supabase } from "@/supabase";

export interface MemberSignupInput {
  email: string;
  password: string;
  fullName?: string;
}

export type RegisterMemberOutcome =
  | { status: "created"; hasSession: boolean; user: User }
  | { status: "exists" };

/** Create a member auth user (role=member). Never creates an owner. */
export async function registerMember(input: MemberSignupInput): Promise<RegisterMemberOutcome> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: { data: { role: "member", full_name: input.fullName } },
  });

  if (error) {
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("already") || msg.includes("exists") || msg.includes("registered")) {
      return { status: "exists" };
    }
    throw error;
  }

  if (!data.user) throw new Error("Failed to create auth user");
  return { status: "created", hasSession: Boolean(data.session), user: data.user };
}

/** Idempotently ensure a member has profiles + members rows (role=member). */
export async function ensureMemberProfile(user: User): Promise<void> {
  try {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileRow) {
      await supabase.from("profiles").insert([
        {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Member",
          email: user.email,
          status: "Active",
          role: "member",
        },
      ]);
    }

    const { data: existingMember } = await supabase
      .from("members")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!existingMember) {
      await supabase.from("members").insert([
        {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "New Member",
          email: user.email,
          status: "Active",
          joining_date: new Date().toISOString().split("T")[0],
          role: "member",
        },
      ]);
    }
  } catch (err) {
    console.error("ensureMemberProfile failed:", err);
  }
}

/** True when a Supabase error is a unique-violation (account already exists). */
function isDuplicate(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return (
    String(error.message || "").toLowerCase().includes("duplicate") ||
    String(error.code || "").includes("23505")
  );
}

/**
 * Bind a freshly-created member to the pending `members` slot from a BulkOnboard
 * invite. Returns `{ duplicate: true }` when the account already exists.
 */
export async function claimInvite(params: {
  userId: string;
  inviteToken: string | null;
  inviteGymId: string | null;
  fullName: string;
  phoneE164: string;
}): Promise<{ duplicate: boolean }> {
  const { userId, inviteToken, inviteGymId, fullName, phoneE164 } = params;

  const baseRow = {
    full_name: fullName,
    mobile_number: phoneE164,
    phone: phoneE164,
    status: "Active",
  };

  if (inviteToken) {
    const updates: Record<string, unknown> = { ...baseRow, auth_user_id: userId };
    if (inviteGymId) updates.gym_id = inviteGymId;

    const { error: updateError } = await supabase.from("members").update(updates).eq("id", inviteToken);
    if (!updateError) return { duplicate: false };

    // The slot couldn't be updated — fall back to creating the member row.
    const { error: insertError } = await supabase.from("members").upsert(
      [{ id: userId, auth_user_id: userId, gym_id: inviteGymId || null, joining_date: new Date().toISOString().split("T")[0], ...baseRow }],
      { onConflict: "id" },
    );
    if (insertError) {
      if (isDuplicate(insertError)) return { duplicate: true };
      throw insertError;
    }
    return { duplicate: false };
  }

  if (inviteGymId) {
    const { error: insertError } = await supabase.from("members").upsert(
      [{ id: userId, auth_user_id: userId, gym_id: inviteGymId, joining_date: new Date().toISOString().split("T")[0], ...baseRow }],
      { onConflict: "id" },
    );
    if (insertError) {
      if (isDuplicate(insertError)) return { duplicate: true };
      throw insertError;
    }
  }

  return { duplicate: false };
}
