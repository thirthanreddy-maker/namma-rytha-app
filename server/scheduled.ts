import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { createNotificationDeliveryLog, getCropCycleByScheduleUid, getLatestSensorReadingForPlot, getUserById } from "./db";
import { sendFarmerAlert } from "./notifications";

export async function scheduledIrrigationHandler(req: Request, res: Response) {
  const context = { url: req.originalUrl, taskUid: undefined as string | undefined };
  let user;
  try {
    user = await sdk.authenticateRequest(req);
  } catch {
    return res.status(403).json({ error: "cron-only" });
  }
  try {
    context.taskUid = user.taskUid;
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const cycle = await getCropCycleByScheduleUid(user.taskUid);
    if (!cycle) return res.json({ ok: true, skipped: "orphan" });
    const owner = await getUserById(cycle.userId);
    if (!owner) return res.json({ ok: true, skipped: "owner-missing" });
    const sensor = await getLatestSensorReadingForPlot(cycle.plotId);
    const moisture = sensor?.moisture ?? 0;
    const needsWater = moisture < 35;
    if (!needsWater || owner.notificationChannel === "in_app") return res.json({ ok: true, delivered: false, reason: needsWater ? "in-app-only" : "moisture-healthy", moisture });
    if (!owner.phoneNumber) return res.json({ ok: true, delivered: false, reason: "phone-not-configured", moisture });
    const delivery = await sendFarmerAlert(owner.notificationChannel, owner.phoneNumber, `Namma Rytha alert: ${cycle.crop} moisture is ${moisture}%. Irrigate soon and recheck the plot tomorrow.`);
    await createNotificationDeliveryLog({ userId: owner.id, channel: owner.notificationChannel, status: delivery.delivered ? "delivered" : "failed", recipient: owner.phoneNumber, message: delivery.message });
    return res.json({ ok: true, ...delivery, moisture });
  } catch (error) {
    return res.status(500).json({ error: String(error), context, timestamp: new Date().toISOString() });
  }
}
