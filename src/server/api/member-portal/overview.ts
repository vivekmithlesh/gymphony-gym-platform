import { createServerFn } from "@tanstack/react-start";
import { USER_ROLES } from "@/constants";
import { requireRole } from "@/server/auth/middleware";
import { getMemberOverview } from "@/server/services/member-portal.service";

export const memberPortalOverview = createServerFn({ method: "GET" })
  .middleware([requireRole(USER_ROLES.MEMBER)])
  .handler(async ({ context }) => {
    return getMemberOverview(context.session.userId, context.session.gymId);
  });
