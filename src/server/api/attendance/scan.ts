import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { USER_ROLES } from "@/constants";
import { requireRole } from "@/server/auth/middleware";
import { recordCheckIn } from "@/server/services/attendance.service";

const attendanceScanSchema = z.object({
  memberUserId: z.string().uuid(),
});

export const attendanceScan = createServerFn({ method: "POST" })
  .middleware([requireRole(USER_ROLES.OWNER, USER_ROLES.ADMIN, USER_ROLES.STAFF)])
  .inputValidator(attendanceScanSchema)
  .handler(async ({ context, data }) => {
    return recordCheckIn(context.session.gymId, data.memberUserId);
  });
