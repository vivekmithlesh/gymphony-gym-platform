import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { USER_ROLES } from "@/constants";
import { requireRole } from "@/server/auth/middleware";
import { updateNotificationSettings } from "@/server/services/settings.service";

const updateNotificationSettingsSchema = z.object({
  automaticReminders: z.boolean().optional(),
  dailySummaryEmail: z.boolean().optional(),
});

export const settingsNotificationsUpdate = createServerFn({ method: "POST" })
  .middleware([requireRole(USER_ROLES.OWNER, USER_ROLES.ADMIN)])
  .inputValidator(updateNotificationSettingsSchema)
  .handler(async ({ context, data }) => {
    return updateNotificationSettings(context.session.gymId, data);
  });
