import { createServerFn } from "@tanstack/react-start";
import { USER_ROLES } from "@/constants";
import { requireRole } from "@/server/auth/middleware";
import { getStoreItems } from "@/server/services/member-portal.service";

export const memberPortalStore = createServerFn({ method: "GET" })
  .middleware([requireRole(USER_ROLES.MEMBER)])
  .handler(async ({ context }) => {
    return getStoreItems(context.session.gymId);
  });
