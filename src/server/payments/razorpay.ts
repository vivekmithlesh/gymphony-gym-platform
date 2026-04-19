import crypto from "node:crypto";
import Razorpay from "razorpay";
import { env } from "@/config";

type GlobalRazorpay = typeof globalThis & {
  __razorpayClient__?: Razorpay;
};

function createRazorpayClient(): Razorpay {
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

const globalForRazorpay = globalThis as GlobalRazorpay;

const razorpayClient = globalForRazorpay.__razorpayClient__ ?? createRazorpayClient();

if (env.NODE_ENV !== "production") {
  globalForRazorpay.__razorpayClient__ = razorpayClient;
}

export async function createOrder(amountPaise: number, receipt: string): Promise<{ id: string }> {
  const order = await razorpayClient.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt,
  });

  return {
    id: order.id,
  };
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
}
