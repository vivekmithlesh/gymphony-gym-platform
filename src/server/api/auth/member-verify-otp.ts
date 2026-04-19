import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { env } from "@/config";
import { SESSION_EXPIRY_SECONDS } from "@/constants";
import { verifyMemberLoginOtp } from "@/server/services/auth.service";

const memberVerifyOtpSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/),
  code: z.string().regex(/^\d{6}$/),
});

export const memberVerifyOtp = createServerFn({ method: "POST" })
  .inputValidator(memberVerifyOtpSchema)
  .handler(async ({ data }) => {
    const result = await verifyMemberLoginOtp(data.phone, data.code);

    if (result.success && result.sessionToken) {
      setCookie("gym_session", result.sessionToken, {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: env.NODE_ENV === "production",
        maxAge: SESSION_EXPIRY_SECONDS,
      });
    }

    return result;
  });
