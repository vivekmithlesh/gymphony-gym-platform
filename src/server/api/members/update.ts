import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { USER_ROLES } from "@/constants";
import { requireRole } from "@/server/auth/middleware";
import { updateMember } from "@/server/services/member.service";

const updateMemberSchema = z.object({
  memberId: z.string().uuid(),
  name: z.string().min(2).optional(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional(),
  planId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "OVERDUE", "EXPIRED"]).optional(),
});

export const updateMemberApi = createServerFn({ method: "POST" })
  .middleware([requireRole(USER_ROLES.OWNER, USER_ROLES.ADMIN, USER_ROLES.STAFF)])
  .inputValidator(updateMemberSchema)
  .handler(async ({ context, data }) => {
    return updateMember(data.memberId, context.session.gymId, data);
  });
