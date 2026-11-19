import type { Request, Response } from "express";
import { addSensorReading, getPlotByIngestToken } from "./db";

export async function iotIngestHandler(req: Request, res: Response) {
  const token = req.header("x-iot-device-token")?.trim();
  if (!token || token.length < 32) return res.status(401).json({ error: "missing-or-invalid-device-token" });
  const plot = await getPlotByIngestToken(token);
  if (!plot) return res.status(401).json({ error: "invalid-device-token" });
  const body = req.body as Record<string, unknown>;
  const values = { moisture: Number(body.moisture), temperature: Number(body.temperature), humidity: Number(body.humidity), battery: Number(body.battery ?? 100) };
  if (!Number.isInteger(values.moisture) || values.moisture < 0 || values.moisture > 100 || !Number.isInteger(values.temperature) || values.temperature < -30 || values.temperature > 70 || !Number.isInteger(values.humidity) || values.humidity < 0 || values.humidity > 100 || !Number.isInteger(values.battery) || values.battery < 0 || values.battery > 100) return res.status(400).json({ error: "readings-out-of-range" });
  const reading = await addSensorReading(plot.userId, { plotId: plot.id, ...values, source: body.source === "sensor" ? "sensor" : "simulated" });
  if (!reading) return res.status(503).json({ error: "reading-could-not-be-saved" });
  return res.status(201).json({ ok: true, readingId: reading.id, plotId: plot.id, recordedAt: reading.recordedAt });
}
