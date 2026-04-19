import { parse } from "cookie-es";
import { createMiddleware } from "@tanstack/react-start";
import type { SessionPayload, UserRole } from "@/types/auth.types";
import { verifySessionToken } from "./session";

const SESSION_COOKIE_NAME = "gym_session";

function jsonErrorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ success: false, message }), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Reads and verifies the current session from an incoming request.
 */
export async function getSession(request: Request): Promise<SessionPayload | null> {
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

/**
 * Request middleware that requires a valid authenticated session.
 */
export const requireAuth = createMiddleware({ type: "request" }).server(
  async ({ request, next }) => {
    const session = await getSession(request);

    if (!session) {
      return jsonErrorResponse(401, "Unauthorized");
    }

    return next({
      context: {
        session,
      },
    });
  },
);

/**
 * Request middleware factory that restricts access to one or more roles.
 */
export function requireRole(...roles: UserRole[]) {
  return createMiddleware({ type: "request" })
    .middleware([requireAuth])
    .server(async ({ context, next }) => {
      if (!roles.includes(context.session.role)) {
        return jsonErrorResponse(403, "Forbidden");
      }

      return next();
    });
}
