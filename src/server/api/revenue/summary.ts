import { createServerFn } from "@tanstack/react-start";
import { USER_ROLES } from "@/constants";
import { requireRole } from "@/server/auth/middleware";
import { getRevenueSummary } from "@/server/services/revenue.service";

export const revenueSummary = createServerFn({ method: "GET" })
  .middleware([requireRole(USER_ROLES.OWNER, USER_ROLES.ADMIN)])
  .handler(async ({ context }) => {
    return getRevenueSummary(context.session.gymId);
  });
