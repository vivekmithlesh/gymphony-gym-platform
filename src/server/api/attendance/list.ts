import { createServerFn } from "@tanstack/react-start";
import { USER_ROLES } from "@/constants";
import { requireRole } from "@/server/auth/middleware";
import { getAttendanceForGym } from "@/server/services/attendance.service";

export const attendanceList = createServerFn({ method: "GET" })
  .middleware([requireRole(USER_ROLES.OWNER, USER_ROLES.ADMIN, USER_ROLES.STAFF)])
  .handler(async ({ context }) => {
    return getAttendanceForGym(context.session.gymId);
  });
