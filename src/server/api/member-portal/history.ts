import { createServerFn } from "@tanstack/react-start";
import { USER_ROLES } from "@/constants";
import { requireRole } from "@/server/auth/middleware";
import { getWorkoutHistory } from "@/server/services/member-portal.service";

export const memberPortalHistory = createServerFn({ method: "GET" })
  .middleware([requireRole(USER_ROLES.MEMBER)])
  .handler(async ({ context }) => {
    return getWorkoutHistory(context.session.userId, context.session.gymId);
  });
