import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { USER_ROLES } from "@/constants";
import { requireRole } from "@/server/auth/middleware";
import { createPaymentOrder } from "@/server/services/payment.service";

const createPaymentOrderSchema = z.object({
  planId: z.string().uuid(),
});

export const paymentCreateOrder = createServerFn({ method: "POST" })
  .middleware([requireRole(USER_ROLES.OWNER, USER_ROLES.ADMIN, USER_ROLES.MEMBER)])
  .inputValidator(createPaymentOrderSchema)
  .handler(async ({ context, data }) => {
    return createPaymentOrder(context.session.gymId, context.session.userId, data.planId);
  });
