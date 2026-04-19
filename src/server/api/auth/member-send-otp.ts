import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendMemberLoginOtp } from "@/server/services/auth.service";

const memberSendOtpSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/),
});

export const memberSendOtp = createServerFn({ method: "POST" })
  .inputValidator(memberSendOtpSchema)
  .handler(async ({ data }) => {
    return sendMemberLoginOtp(data.phone);
  });
