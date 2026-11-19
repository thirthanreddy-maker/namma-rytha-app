import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";

export type DeliveryChannel = "sms" | "whatsapp";
export type DeliveryResult = { channel: DeliveryChannel; delivered: boolean; configured: boolean; message: string };

function providerConfigured(channel: DeliveryChannel) {
  if (!ENV.twilioAccountSid || !ENV.twilioAuthToken) return false;
  return channel === "sms" ? Boolean(ENV.twilioSmsFrom) : Boolean(ENV.twilioWhatsappFrom);
}

export async function sendFarmerAlert(channel: DeliveryChannel, to: string, body: string): Promise<DeliveryResult> {
  if (!providerConfigured(channel)) return { channel, delivered: false, configured: false, message: `${channel === "sms" ? "SMS" : "WhatsApp"} provider is not configured yet.` };
  if (!/^\+[1-9]\d{7,14}$/.test(to)) throw new TRPCError({ code: "BAD_REQUEST", message: "Phone number must use international format, for example +919876543210." });
  const from = channel === "sms" ? ENV.twilioSmsFrom : ENV.twilioWhatsappFrom;
  const params = new URLSearchParams({ To: channel === "sms" ? to : `whatsapp:${to}`, From: channel === "sms" ? from : `whatsapp:${from}`, Body: body.slice(0, 1400) });
  const token = Buffer.from(`${ENV.twilioAccountSid}:${ENV.twilioAuthToken}`).toString("base64");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ENV.twilioAccountSid}/Messages.json`, { method: "POST", headers: { Authorization: `Basic ${token}`, "Content-Type": "application/x-www-form-urlencoded" }, body: params });
  if (!response.ok) { const detail = await response.text().catch(() => ""); console.warn(`[Notifications] ${channel} provider rejected alert`, detail); return { channel, delivered: false, configured: true, message: `${channel === "sms" ? "SMS" : "WhatsApp"} provider rejected the alert.` }; }
  return { channel, delivered: true, configured: true, message: `${channel === "sms" ? "SMS" : "WhatsApp"} alert sent.` };
}
