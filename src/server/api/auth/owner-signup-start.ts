import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendOwnerSignupOtp } from "@/server/services/auth.service";

const ownerSignupStartSchema = z.object({
  ownerName: z.string().min(2),
  gymName: z.string().min(2),
  city: z.string().min(2),
  email: z.string().email(),
  phone: z.string().regex(/^[6-9]\d{9}$/),
});

export const ownerSignupStart = createServerFn({ method: "POST" })
  .inputValidator(ownerSignupStartSchema)
  .handler(async ({ data }) => {
    return sendOwnerSignupOtp(data);
  });
