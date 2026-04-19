import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { verifyWebhookSignature } from "@/server/payments/razorpay";

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
      };
    };
  };
}

const razorpayWebhookRequest = createMiddleware({ type: "request" }).server(
  async ({ request, next }) => {
    const rawBody = await request.text();

    return next({
      context: {
        rawBody,
        razorpaySignature: request.headers.get("x-razorpay-signature") ?? "",
      },
    });
  },
);

export const paymentWebhook = createServerFn({ method: "POST" })
  .middleware([razorpayWebhookRequest])
  .handler(async ({ context }) => {
    if (
      !context.razorpaySignature ||
      !verifyWebhookSignature(context.rawBody, context.razorpaySignature)
    ) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid webhook signature" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    let payload: RazorpayWebhookPayload;

    try {
      payload = JSON.parse(context.rawBody) as RazorpayWebhookPayload;
    } catch {
      return new Response(JSON.stringify({ success: false, message: "Invalid webhook payload" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    const paymentEntity = payload.payload?.payment?.entity;

    if (paymentEntity?.order_id) {
      const nextStatus =
        payload.event === "payment.failed" || paymentEntity.status === "failed"
          ? PaymentStatus.FAILED
          : PaymentStatus.PAID;

      await prisma.paymentRecord.updateMany({
        where: {
          provider: "RAZORPAY",
          providerOrderId: paymentEntity.order_id,
        },
        data: {
          status: nextStatus,
          providerPaymentId: paymentEntity.id,
          ...(nextStatus === PaymentStatus.PAID ? { paidAt: new Date() } : {}),
        },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  });
