import { env } from "@/config";
import type { OtpSendResult } from "@/types/auth.types";

const MSG91_SEND_OTP_URL = "https://control.msg91.com/api/v5/otp";
const MSG91_SEND_SMS_URL = "https://control.msg91.com/api/v5/sms";

function maskPhone(phone: string): string {
  return phone.length <= 4 ? phone : `${"*".repeat(phone.length - 4)}${phone.slice(-4)}`;
}

function extractMessage(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const candidate = payload as Record<string, unknown>;

  if (typeof candidate.message === "string" && candidate.message.length > 0) {
    return candidate.message;
  }

  if (typeof candidate.error === "string" && candidate.error.length > 0) {
    return candidate.error;
  }

  if (Array.isArray(candidate.errors) && typeof candidate.errors[0] === "string") {
    return candidate.errors[0];
  }

  return undefined;
}

/**
 * Sends an OTP using the MSG91 REST API.
 */
export async function sendOtpViaMsg91(phone: string, code: string): Promise<OtpSendResult> {
  const query = new URLSearchParams({
    authkey: env.MSG91_API_KEY,
    template_id: env.MSG91_TEMPLATE_ID,
    mobile: `91${phone}`,
    otp: code,
  });

  try {
    const response = await fetch(`${MSG91_SEND_OTP_URL}?${query.toString()}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const message = extractMessage(payload);
    const payloadType =
      typeof payload === "object" && payload !== null
        ? (payload as Record<string, unknown>).type
        : undefined;

    if (!response.ok || payloadType === "error") {
      console.error("[msg91] OTP send failed", {
        phone: maskPhone(phone),
        status: response.status,
        message,
      });

      return {
        success: false,
        message: message ?? "Unable to send OTP right now. Please try again.",
      };
    }

    return {
      success: true,
      message: "OTP sent successfully",
    };
  } catch (error) {
    console.error("[msg91] OTP send request failed", {
      phone: maskPhone(phone),
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      message: "Unable to send OTP right now. Please try again.",
    };
  }
}

export async function sendReminderSmsViaMsg91(
  phone: string,
  message: string,
): Promise<OtpSendResult> {
  try {
    const response = await fetch(MSG91_SEND_SMS_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        authkey: env.MSG91_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mobile: `91${phone}`,
        message,
        template_id: env.MSG91_TEMPLATE_ID,
      }),
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const messageText = extractMessage(payload);
    const payloadType =
      typeof payload === "object" && payload !== null
        ? (payload as Record<string, unknown>).type
        : undefined;

    if (!response.ok || payloadType === "error") {
      console.error("[msg91] Reminder SMS send failed", {
        phone: maskPhone(phone),
        status: response.status,
        message: messageText,
      });

      return {
        success: false,
        message: messageText ?? "Unable to send reminder SMS right now.",
      };
    }

    return {
      success: true,
      message: "Reminder SMS sent successfully",
    };
  } catch (error) {
    console.error("[msg91] Reminder SMS request failed", {
      phone: maskPhone(phone),
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      message: "Unable to send reminder SMS right now.",
    };
  }
}
