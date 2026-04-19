import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { USER_ROLES } from "@/constants";
import { requireRole } from "@/server/auth/middleware";
import { getGymSettings, updateGymProfile } from "@/server/services/settings.service";

const updateGymProfileSchema = z.object({
  gymName: z.string().min(2).optional(),
  city: z.string().min(2).optional(),
  ownerEmail: z.string().email().optional(),
  contactNumber: z.string().optional(),
});

export const settingsProfile = createServerFn({ method: "GET" })
  .middleware([requireRole(USER_ROLES.OWNER, USER_ROLES.ADMIN)])
  .handler(async ({ context }) => {
    return getGymSettings(context.session.gymId);
  });

export const settingsProfileUpdate = createServerFn({ method: "POST" })
  .middleware([requireRole(USER_ROLES.OWNER)])
  .inputValidator(updateGymProfileSchema)
  .handler(async ({ context, data }) => {
    return updateGymProfile(context.session.gymId, data);
  });
