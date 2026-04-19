import { MembershipStatus } from "@prisma/client";
import { createServerFn } from "@tanstack/react-start";
import { USER_ROLES } from "@/constants";
import { requireRole } from "@/server/auth/middleware";
import { prisma } from "@/server/db";

export const memberPlans = createServerFn({ method: "GET" })
  .middleware([requireRole(USER_ROLES.OWNER, USER_ROLES.ADMIN, USER_ROLES.STAFF)])
  .handler(async ({ context }) => {
    return prisma.membershipPlan.findMany({
      where: {
        gymId: context.session.gymId,
        status: MembershipStatus.ACTIVE,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        name: true,
        displayPrice: true,
      },
    });
  });
