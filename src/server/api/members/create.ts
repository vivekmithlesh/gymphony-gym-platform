import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { USER_ROLES } from "@/constants";
import { requireRole } from "@/server/auth/middleware";
import { createMember } from "@/server/services/member.service";

const createMemberSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  planId: z.string().uuid(),
  startDate: z.string().date(),
});

export const createMemberApi = createServerFn({ method: "POST" })
  .middleware([requireRole(USER_ROLES.OWNER, USER_ROLES.ADMIN)])
  .inputValidator(createMemberSchema)
  .handler(async ({ context, data }) => {
    return createMember(context.session.gymId, data);
  });
