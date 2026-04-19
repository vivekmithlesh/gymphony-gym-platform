import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { USER_ROLES } from "@/constants";
import { requireRole } from "@/server/auth/middleware";
import { verifyPayment } from "@/server/services/payment.service";

const paymentVerifySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  membershipId: z.string(),
});

export const paymentVerify = createServerFn({ method: "POST" })
  .middleware([requireRole(USER_ROLES.OWNER, USER_ROLES.ADMIN, USER_ROLES.MEMBER)])
  .inputValidator(paymentVerifySchema)
  .handler(async ({ context, data }) => {
    return verifyPayment(data, context.session.gymId, context.session.userId);
  });
