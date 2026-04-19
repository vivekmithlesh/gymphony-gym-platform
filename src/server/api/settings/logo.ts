import { createServerFn } from "@tanstack/react-start";
import { USER_ROLES } from "@/constants";
import { requireRole } from "@/server/auth/middleware";
import { updateGymLogo } from "@/server/services/settings.service";

const settingsLogoSchema = (data: unknown) => {
  if (!(data instanceof FormData)) {
    throw new Error("Expected multipart form data");
  }

  const file = data.get("file");

  if (!(file instanceof File)) {
    throw new Error("Logo file is required");
  }

  return { file };
};

export const settingsLogoUpload = createServerFn({ method: "POST" })
  .middleware([requireRole(USER_ROLES.OWNER)])
  .inputValidator(settingsLogoSchema)
  .handler(async ({ context, data }) => {
    const buffer = Buffer.from(await data.file.arrayBuffer());

    return updateGymLogo(context.session.gymId, buffer, data.file.type, data.file.name);
  });
