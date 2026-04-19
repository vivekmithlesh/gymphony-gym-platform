import { SignJWT, errors, jwtVerify } from "jose";
import { env } from "@/config";
import { SESSION_EXPIRY_SECONDS, USER_ROLES } from "@/constants";
import type { SessionPayload, UserRole } from "@/types/auth.types";

const jwtSecret = new TextEncoder().encode(env.JWT_SECRET);

/**
 * Creates a signed JWT session token for an authenticated user.
 */
export async function createSessionToken(payload: {
  userId: string;
  gymId: string;
  role: UserRole;
}): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    gymId: payload.gymId,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRY_SECONDS}s`)
    .sign(jwtSecret);
}

function isValidRole(value: unknown): value is UserRole {
  return Object.values(USER_ROLES).includes(value as UserRole);
}

/**
 * Verifies a JWT session token and returns a typed payload when valid.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret, {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.userId !== "string" ||
      typeof payload.gymId !== "string" ||
      !isValidRole(payload.role) ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      gymId: payload.gymId,
      role: payload.role,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (error) {
    if (error instanceof errors.JWTExpired || error instanceof errors.JWTInvalid) {
      return null;
    }

    if (error instanceof errors.JOSEError) {
      return null;
    }

    throw error;
  }
}
