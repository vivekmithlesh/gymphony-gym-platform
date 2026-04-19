import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { USER_ROLES } from "@/constants";
import { requireRole } from "@/server/auth/middleware";
import { getMembers } from "@/server/services/member.service";

const listMembersSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireRole(USER_ROLES.OWNER, USER_ROLES.ADMIN, USER_ROLES.STAFF)])
  .inputValidator(listMembersSchema)
  .handler(async ({ context, data }) => {
    return getMembers(context.session.gymId, data.page, data.pageSize);
  });
