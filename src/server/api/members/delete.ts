import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { USER_ROLES } from "@/constants";
import { requireRole } from "@/server/auth/middleware";
import { deleteMember } from "@/server/services/member.service";

const deleteMemberSchema = z.object({
  memberId: z.string().uuid(),
});

export const deleteMemberApi = createServerFn({ method: "POST" })
  .middleware([requireRole(USER_ROLES.OWNER, USER_ROLES.ADMIN)])
  .inputValidator(deleteMemberSchema)
  .handler(async ({ context, data }) => {
    await deleteMember(data.memberId, context.session.gymId);

    return {
      success: true,
    };
  });
