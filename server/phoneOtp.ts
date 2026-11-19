import { ENV } from "./_core/env";

const VERIFY_BASE = "https://verify.twilio.com/v2/Services";

function requireConfig() {
  if (!ENV.twilioAccountSid || !ENV.twilioAuthToken || !ENV.twilioVerifyServiceSid) {
    throw new Error("Phone verification is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID.");
  }
}

function authHeader() {
  return `Basic ${Buffer.from(`${ENV.twilioAccountSid}:${ENV.twilioAuthToken}`).toString("base64")}`;
}

async function twilioPost(path: string, body: URLSearchParams) {
  requireConfig();
  const response = await fetch(`${VERIFY_BASE}/${ENV.twilioVerifyServiceSid}/${path}`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await response.json().catch(() => ({})) as { status?: string; valid?: boolean; message?: string; code?: number };
  if (!response.ok) {
    const error = new Error(payload.message || "SMS verification provider rejected the request.");
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return payload;
}

export function normalizePhone(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(compact)) throw new Error("Enter a valid phone number in international format, for example +919876543210.");
  return compact;
}

export async function sendPhoneOtp(phone: string) {
  return twilioPost("Verifications", new URLSearchParams({ To: phone, Channel: "sms" }));
}

export async function checkPhoneOtp(phone: string, code: string) {
  return twilioPost("VerificationCheck", new URLSearchParams({ To: phone, Code: code }));
}
