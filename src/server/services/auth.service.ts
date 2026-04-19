import {
  MembershipBillingPeriod,
  MembershipStatus,
  UserRole as PrismaUserRole,
} from "@prisma/client";
import { deleteCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { OTP_PURPOSES, OTP_RATE_LIMITS } from "@/constants";
import { cacheKeys, redisCache } from "@/server/cache";
import { prisma } from "@/server/db";
import { createOtp, deleteOtp, verifyAndConsumeOtp } from "@/server/auth/otp";
import { sendOtpViaMsg91 } from "@/server/auth/msg91";
import { createSessionToken } from "@/server/auth/session";
import type { AuthResult, OtpSendResult, OwnerSignupMetadata } from "@/types/auth.types";

const ownerSignupMetadataSchema = z.object({
  ownerName: z.string().min(2),
  gymName: z.string().min(2),
  city: z.string().min(2),
  email: z.string().email(),
  phone: z.string().regex(/^[6-9]\d{9}$/),
});

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

async function consumeRateLimit(phone: string): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const normalizedPhone = normalizePhone(phone);
  const key = cacheKeys.otpRateLimit(normalizedPhone);
  const count = await redisCache.incr(key, OTP_RATE_LIMITS.WINDOW_SECONDS);
  const remaining = Math.max(OTP_RATE_LIMITS.MAX_REQUESTS_PER_HOUR - count, 0);

  return {
    allowed: count <= OTP_RATE_LIMITS.MAX_REQUESTS_PER_HOUR,
    remaining,
  };
}

async function createAndSendOtp(
  phone: string,
  purpose: (typeof OTP_PURPOSES)[keyof typeof OTP_PURPOSES],
  metadata?: Record<string, unknown>,
): Promise<OtpSendResult> {
  const { allowed, remaining } = await consumeRateLimit(phone);

  if (!allowed) {
    return {
      success: false,
      message: "Too many OTP requests. Please try again in an hour.",
      rateLimitRemaining: 0,
    };
  }

  const { code, record } = await createOtp({
    phone: normalizePhone(phone),
    purpose,
    metadata,
  });

  const sendResult = await sendOtpViaMsg91(record.phone, code);

  if (!sendResult.success) {
    await deleteOtp(record.id);
    return {
      ...sendResult,
      rateLimitRemaining: remaining,
    };
  }

  return {
    success: true,
    message: sendResult.message,
    rateLimitRemaining: remaining,
  };
}

async function getMemberSessionTarget(phone: string) {
  return prisma.membership.findFirst({
    where: {
      memberUser: {
        phone: normalizePhone(phone),
        role: PrismaUserRole.MEMBER,
      },
    },
    include: {
      memberUser: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Sends OTP for owner signup. Enforces rate limit.
 */
export async function sendOwnerSignupOtp(data: OwnerSignupMetadata): Promise<OtpSendResult> {
  const normalizedData = ownerSignupMetadataSchema.parse({
    ...data,
    phone: normalizePhone(data.phone),
  });

  const existingOwner = await prisma.user.findFirst({
    where: {
      OR: [{ phone: normalizedData.phone }, { email: normalizedData.email }],
    },
    select: {
      id: true,
    },
  });

  if (existingOwner) {
    return {
      success: false,
      message: "An account already exists with this phone or email",
    };
  }

  return createAndSendOtp(normalizedData.phone, OTP_PURPOSES.OWNER_SIGNUP, normalizedData);
}

/**
 * Verifies owner OTP, creates user+gym+settings, returns session token.
 */
export async function verifyOwnerSignupOtp(phone: string, code: string): Promise<AuthResult> {
  const normalizedPhone = normalizePhone(phone);
  const otpRecord = await verifyAndConsumeOtp(normalizedPhone, OTP_PURPOSES.OWNER_SIGNUP, code);

  if (!otpRecord) {
    return {
      success: false,
      message: "Invalid or expired OTP",
    };
  }

  const metadata = ownerSignupMetadataSchema.safeParse(otpRecord.metadata);

  if (!metadata.success) {
    return {
      success: false,
      message: "Signup data is incomplete. Please restart signup.",
    };
  }

  const existingOwner = await prisma.user.findFirst({
    where: {
      OR: [{ phone: normalizedPhone }, { email: metadata.data.email }],
    },
    select: {
      id: true,
    },
  });

  if (existingOwner) {
    return {
      success: false,
      message: "An account already exists with this phone or email",
    };
  }

  const { user, gym } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        role: PrismaUserRole.OWNER,
        fullName: metadata.data.ownerName,
        phone: normalizedPhone,
        email: metadata.data.email,
      },
    });

    const gym = await tx.gym.create({
      data: {
        ownerUserId: user.id,
        name: metadata.data.gymName,
        city: metadata.data.city,
        status: "TRIAL",
      },
    });

    await tx.gymSetting.create({
      data: {
        gymId: gym.id,
        ownerEmail: metadata.data.email,
        contactNumber: normalizedPhone,
      },
    });

    await tx.membershipPlan.create({
      data: {
        gymId: gym.id,
        name: "Trial Plan",
        billingPeriod: MembershipBillingPeriod.TRIAL,
        pricePaise: 0,
        displayPrice: "Free",
        status: MembershipStatus.ACTIVE,
      },
    });

    return { user, gym };
  });

  const sessionToken = await createSessionToken({
    userId: user.id,
    gymId: gym.id,
    role: PrismaUserRole.OWNER,
  });

  return {
    success: true,
    message: "Signup completed successfully",
    sessionToken,
    redirectTo: "/dashboard",
  };
}

/**
 * Sends OTP for member login. Enforces rate limit.
 */
export async function sendMemberLoginOtp(phone: string): Promise<OtpSendResult> {
  const normalizedPhone = normalizePhone(phone);
  const memberTarget = await getMemberSessionTarget(normalizedPhone);

  if (!memberTarget) {
    return {
      success: false,
      message: "No member account found for this number",
    };
  }

  return createAndSendOtp(normalizedPhone, OTP_PURPOSES.MEMBER_LOGIN);
}

/**
 * Verifies member OTP, returns session token.
 */
export async function verifyMemberLoginOtp(phone: string, code: string): Promise<AuthResult> {
  const normalizedPhone = normalizePhone(phone);
  const memberTarget = await getMemberSessionTarget(normalizedPhone);

  if (!memberTarget) {
    return {
      success: false,
      message: "No member account found for this number",
    };
  }

  const otpRecord = await verifyAndConsumeOtp(normalizedPhone, OTP_PURPOSES.MEMBER_LOGIN, code);

  if (!otpRecord) {
    return {
      success: false,
      message: "Invalid or expired OTP",
    };
  }

  const sessionToken = await createSessionToken({
    userId: memberTarget.memberUser.id,
    gymId: memberTarget.gymId,
    role: memberTarget.memberUser.role,
  });

  return {
    success: true,
    message: "Login successful",
    sessionToken,
    redirectTo: "/member-dashboard",
  };
}

/**
 * Destroys session (clears cookie).
 */
export async function logout(): Promise<void> {
  deleteCookie("gym_session", {
    path: "/",
    sameSite: "strict",
    httpOnly: true,
    maxAge: 0,
  });
}
