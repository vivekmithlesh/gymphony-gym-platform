import { getRequest } from "@tanstack/react-start/server";
import { parse } from "cookie-es";
import { USER_ROLES } from "@/constants";
import { verifySessionToken } from "@/server/auth/session";
import type { SessionPayload, UserRole } from "@/types/auth.types";

const SESSION_COOKIE_NAME = "gym_session";

export async function getSessionFromCookie(): Promise<SessionPayload | null> {
  const request = getRequest();
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  const cookies = parse(cookieHeader);
  const sessionToken = cookies[SESSION_COOKIE_NAME];

  if (!sessionToken) {
    return null;
  }

  return verifySessionToken(sessionToken);
}

export function getRedirectForRole(role: UserRole): "/dashboard" | "/member-dashboard" {
  return role === USER_ROLES.MEMBER ? "/member-dashboard" : "/dashboard";
}
