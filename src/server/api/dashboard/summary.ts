import { createServerFn } from "@tanstack/react-start";
import { USER_ROLES } from "@/constants";
import { requireRole } from "@/server/auth/middleware";
import { getDashboardSummary } from "@/server/services/gym.service";

export const dashboardSummary = createServerFn({ method: "GET" })
  .middleware([requireRole(USER_ROLES.OWNER, USER_ROLES.ADMIN)])
  .handler(async ({ context }) => {
    return getDashboardSummary(context.session.gymId);
  });
