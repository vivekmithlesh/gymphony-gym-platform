import { randomInt, createHash, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { OTP_EXPIRY_SECONDS } from "@/constants";
import type { OtpPayload, OtpPurpose } from "@/types/auth.types";

export interface StoredOtpRecord {
  id: string;
  phone: string;
  purpose: OtpPurpose;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Generates a zero-padded 6-digit OTP code.
 */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Hashes an OTP code with SHA-256 so the raw code is never persisted.
 */
export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Verifies a raw OTP against a stored SHA-256 hash.
 */
export function verifyOtpHash(code: string, storedHash: string): boolean {
  const incomingHash = hashOtp(code);
  const incomingBuffer = Buffer.from(incomingHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (incomingBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(incomingBuffer, storedBuffer);
}

function toMetadataRecord(metadata: Prisma.JsonValue | null): Record<string, unknown> | undefined {
  if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }

  return metadata as Record<string, unknown>;
}

/**
 * Stores a hashed OTP in the auth_otps table and returns the generated code for delivery.
 */
export async function createOtp(payload: OtpPayload): Promise<{
  code: string;
  record: StoredOtpRecord;
}> {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1_000);

  await prisma.authOtp.deleteMany({
    where: {
      phone: payload.phone,
      purpose: payload.purpose,
    },
  });

  const otpRecord = await prisma.authOtp.create({
    data: {
      phone: payload.phone,
      purpose: payload.purpose,
      codeHash: hashOtp(code),
      metadata: payload.metadata as Prisma.InputJsonValue | undefined,
      expiresAt,
    },
  });

  return {
    code,
    record: {
      id: otpRecord.id,
      phone: otpRecord.phone,
      purpose: otpRecord.purpose,
      expiresAt: otpRecord.expiresAt,
      metadata: toMetadataRecord(otpRecord.metadata),
    },
  };
}

/**
 * Deletes a stored OTP record by id.
 */
export async function deleteOtp(id: string): Promise<void> {
  await prisma.authOtp.deleteMany({
    where: { id },
  });
}

/**
 * Verifies and consumes the latest valid OTP for a phone and purpose.
 */
export async function verifyAndConsumeOtp(
  phone: string,
  purpose: OtpPurpose,
  code: string,
): Promise<StoredOtpRecord | null> {
  const otpRecord = await prisma.authOtp.findFirst({
    where: {
      phone,
      purpose,
      verifiedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!otpRecord) {
    return null;
  }

  if (!verifyOtpHash(code, otpRecord.codeHash)) {
    return null;
  }

  await prisma.authOtp.delete({
    where: {
      id: otpRecord.id,
    },
  });

  return {
    id: otpRecord.id,
    phone: otpRecord.phone,
    purpose: otpRecord.purpose,
    expiresAt: otpRecord.expiresAt,
    metadata: toMetadataRecord(otpRecord.metadata),
  };
}
