import { createServerFn } from "@tanstack/react-start";
import { logout } from "@/server/services/auth.service";

export const logoutApi = createServerFn({ method: "POST" }).handler(async () => {
  await logout();

  return {
    success: true,
    message: "Logged out successfully",
  };
});
