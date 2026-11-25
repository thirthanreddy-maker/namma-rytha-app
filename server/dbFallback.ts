import { randomBytes } from "node:crypto";
import type { CropDiagnosisHistory, FarmExpense, FarmSale, FarmTask, InsertAgronomistReviewRequest, InsertAnnouncement, InsertCommunityPost, InsertCropDiagnosisHistory, InsertFarmExpense, InsertFarmSale, InsertFarmTask, InsertPlot, InsertSensorReading, NotificationDeliveryLog, Plot, SensorReading, SignInHistory, User } from "../drizzle/schema";
import { ensureUserDefaultPlotsInMemory, getMemoryStore, getPgSql, pgGetOrUpsertUser, pgGetUserByOpenId, saveMemoryStore } from "./pgStore";

export async function fbUpsertUser(user: import("../drizzle/schema").InsertUser): Promise<void> {
  await pgGetOrUpsertUser(user.openId, user.name ?? undefined, user.email ?? undefined, user.loginMethod ?? undefined);
}

export async function fbGetUserByOpenId(openId: string): Promise<User | undefined> {
  const row = await pgGetUserByOpenId(openId);
  return row as unknown as User | undefined;
}

export async function fbGetUserById(id: number): Promise<User | undefined> {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql`
      SELECT id, open_id AS "openId", name, email, farm_location AS "farmLocation",
             preferred_language AS "preferredLanguage", avatar_url AS "avatarUrl",
             phone_number AS "phoneNumber", notification_channel AS "notificationChannel",
             login_method AS "loginMethod", role, created_at AS "createdAt",
             updated_at AS "updatedAt", last_signed_in AS "lastSignedIn"
      FROM rytha_users WHERE id = ${id} LIMIT 1
    `;
    return rows[0] as unknown as User | undefined;
  }
  return getMemoryStore().users.find((u) => u.id === id) as unknown as User | undefined;
}

export async function fbUpdateUserNotificationPreferences(userId: number, phoneNumber: string | null, notificationChannel: "in_app" | "sms" | "whatsapp") {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql`UPDATE rytha_users SET phone_number = ${phoneNumber}, notification_channel = ${notificationChannel}, updated_at = NOW() WHERE id = ${userId} RETURNING id`;
    return rows.length > 0;
  }
  const user = getMemoryStore().users.find((u) => u.id === userId);
  if (!user) return true;
  user.phoneNumber = phoneNumber;
  user.notificationChannel = notificationChannel;
  saveMemoryStore();
  return true;
}

export async function fbUpdateUserProfile(userId: number, input: { name: string; farmLocation: string; preferredLanguage: string }) {
  const sql = await getPgSql();
  if (sql) {
    await sql`UPDATE rytha_users SET name = ${input.name}, farm_location = ${input.farmLocation}, preferred_language = ${input.preferredLanguage}, updated_at = NOW() WHERE id = ${userId}`;
    return fbGetUserById(userId);
  }
  const user = getMemoryStore().users.find((u) => u.id === userId);
  if (user) {
    user.name = input.name;
    user.farmLocation = input.farmLocation;
    user.preferredLanguage = input.preferredLanguage;
    saveMemoryStore();
  }
  return (user ?? (await pgGetOrUpsertUser("usr_demo_farmer_access", input.name))) as unknown as User;
}

export async function fbUpdateUserAvatar(userId: number, avatarUrl: string) {
  const sql = await getPgSql();
  if (sql) {
    await sql`UPDATE rytha_users SET avatar_url = ${avatarUrl}, updated_at = NOW() WHERE id = ${userId}`;
    return fbGetUserById(userId);
  }
  const user = getMemoryStore().users.find((u) => u.id === userId);
  if (user) {
    user.avatarUrl = avatarUrl;
    saveMemoryStore();
  }
  return user as unknown as User | undefined;
}

export async function fbGetUserPlots(userId: number): Promise<Plot[]> {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql`
      SELECT id, user_id AS "userId", name, crop, area_acres::float AS "areaAcres",
             soil_type AS "soilType", growth_stage AS "growthStage", latitude, longitude,
             ingest_token AS "ingestToken", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM rytha_plots WHERE user_id = ${userId} ORDER BY updated_at DESC
    `;
    return rows as unknown as Plot[];
  }
  ensureUserDefaultPlotsInMemory(userId);
  return getMemoryStore().plots.filter((p) => p.userId === userId).map((p) => ({ ...p, createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt) })) as unknown as Plot[];
}

export async function fbCreateUserPlot(userId: number, input: Omit<InsertPlot, "userId" | "ingestToken">): Promise<Plot | undefined> {
  const token = randomBytes(24).toString("hex");
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql`
      INSERT INTO rytha_plots (user_id, name, crop, area_acres, soil_type, growth_stage, latitude, longitude, ingest_token)
      VALUES (${userId}, ${input.name}, ${input.crop}, ${input.areaAcres ?? 1}, ${input.soilType ?? "Loamy"}, ${input.growthStage ?? "Seedling"}, ${input.latitude ?? "13.135"}, ${input.longitude ?? "78.132"}, ${token})
      RETURNING id, user_id AS "userId", name, crop, area_acres::float AS "areaAcres",
                soil_type AS "soilType", growth_stage AS "growthStage", latitude, longitude,
                ingest_token AS "ingestToken", created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    return rows[0] as unknown as Plot;
  }
  const store = getMemoryStore();
  const now = new Date().toISOString();
  const row = {
    id: ++store.nextId,
    userId,
    name: input.name,
    crop: input.crop,
    areaAcres: Number(input.areaAcres ?? 1),
    soilType: input.soilType ?? "Loamy",
    growthStage: input.growthStage ?? "Seedling",
    latitude: input.latitude ?? "13.135",
    longitude: input.longitude ?? "78.132",
    ingestToken: token,
    createdAt: now,
    updatedAt: now,
  };
  store.plots.unshift(row);
  saveMemoryStore();
  return { ...row, createdAt: new Date(now), updatedAt: new Date(now) } as unknown as Plot;
}

export async function fbGetOwnedPlot(userId: number, plotId: number): Promise<Plot | undefined> {
  const plots = await fbGetUserPlots(userId);
  return plots.find((p) => p.id === plotId);
}

export async function fbGetPlotByIngestToken(ingestToken: string): Promise<Plot | undefined> {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql`SELECT id, user_id AS "userId", name, crop, area_acres::float AS "areaAcres", soil_type AS "soilType", growth_stage AS "growthStage", ingest_token AS "ingestToken", created_at AS "createdAt", updated_at AS "updatedAt" FROM rytha_plots WHERE ingest_token = ${ingestToken} LIMIT 1`;
    return rows[0] as unknown as Plot | undefined;
  }
  const row = getMemoryStore().plots.find((p) => p.ingestToken === ingestToken);
  return row ? ({ ...row, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) } as unknown as Plot) : undefined;
}

export async function fbGetLatestSensorReadings(userId: number): Promise<SensorReading[]> {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql`SELECT id, user_id AS "userId", plot_id AS "plotId", moisture, temperature, humidity, battery, source, recorded_at AS "recordedAt" FROM rytha_sensor_readings WHERE user_id = ${userId} ORDER BY recorded_at DESC LIMIT 50`;
    return rows as unknown as SensorReading[];
  }
  const rows = getMemoryStore().readings.filter((r) => r.userId === userId || r.userId === 1);
  return rows.map((r) => ({ ...r, recordedAt: new Date(r.recordedAt) })) as unknown as SensorReading[];
}

export async function fbAddSensorReading(userId: number, input: Omit<InsertSensorReading, "userId">): Promise<SensorReading | undefined> {
  const plot = await fbGetOwnedPlot(userId, input.plotId);
  if (!plot) return undefined;
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql`
      INSERT INTO rytha_sensor_readings (user_id, plot_id, moisture, temperature, humidity, battery, source)
      VALUES (${userId}, ${input.plotId}, ${input.moisture}, ${input.temperature}, ${input.humidity}, ${input.battery ?? 100}, ${input.source ?? "simulated"})
      RETURNING id, user_id AS "userId", plot_id AS "plotId", moisture, temperature, humidity, battery, source, recorded_at AS "recordedAt"
    `;
    return rows[0] as unknown as SensorReading;
  }
  const store = getMemoryStore();
  const now = new Date().toISOString();
  const row = { id: ++store.nextId, userId, plotId: input.plotId, moisture: input.moisture, temperature: input.temperature, humidity: input.humidity, battery: input.battery ?? 100, source: (input.source ?? "simulated") as "sensor" | "simulated", recordedAt: now };
  store.readings.unshift(row);
  saveMemoryStore();
  return { ...row, recordedAt: new Date(now) } as unknown as SensorReading;
}

export async function fbGetUserTasks(userId: number): Promise<FarmTask[]> {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql`SELECT id, user_id AS "userId", plot_id AS "plotId", cycle_id AS "cycleId", title, detail, due_date AS "dueDate", completed_at AS "completedAt", status, created_at AS "createdAt" FROM rytha_farm_tasks WHERE user_id = ${userId} ORDER BY due_date DESC`;
    return rows as unknown as FarmTask[];
  }
  const rows = getMemoryStore().tasks.filter((t) => t.userId === userId || t.userId === 1);
  return rows.map((t) => ({ ...t, dueDate: new Date(t.dueDate), completedAt: t.completedAt ? new Date(t.completedAt) : null, createdAt: new Date(t.createdAt) })) as unknown as FarmTask[];
}

export async function fbCreateUserTask(userId: number, input: Omit<InsertFarmTask, "userId">): Promise<FarmTask | undefined> {
  if (input.plotId && !(await fbGetOwnedPlot(userId, input.plotId))) return undefined;
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql`
      INSERT INTO rytha_farm_tasks (user_id, plot_id, cycle_id, title, detail, due_date, status)
      VALUES (${userId}, ${input.plotId ?? null}, ${input.cycleId ?? null}, ${input.title}, ${input.detail ?? null}, ${input.dueDate}, ${input.status ?? "pending"})
      RETURNING id, user_id AS "userId", plot_id AS "plotId", cycle_id AS "cycleId", title, detail, due_date AS "dueDate", completed_at AS "completedAt", status, created_at AS "createdAt"
    `;
    return rows[0] as unknown as FarmTask;
  }
  const store = getMemoryStore();
  const now = new Date().toISOString();
  const row = { id: ++store.nextId, userId, plotId: input.plotId ?? null, cycleId: input.cycleId ?? null, title: input.title, detail: input.detail ?? null, dueDate: new Date(input.dueDate).toISOString(), completedAt: null, status: "pending" as const, createdAt: now };
  store.tasks.unshift(row);
  saveMemoryStore();
  return { ...row, dueDate: new Date(row.dueDate), completedAt: null, createdAt: new Date(now) } as unknown as FarmTask;
}

export async function fbSetTaskStatus(userId: number, id: number, completed: boolean) {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql`UPDATE rytha_farm_tasks SET status = ${completed ? "completed" : "pending"}, completed_at = ${completed ? new Date() : null} WHERE id = ${id} AND user_id = ${userId} RETURNING id`;
    return rows.length > 0;
  }
  const store = getMemoryStore();
  const t = store.tasks.find((item) => item.id === id && (item.userId === userId || item.userId === 1));
  if (!t) return false;
  t.status = completed ? "completed" : "pending";
  t.completedAt = completed ? new Date().toISOString() : null;
  saveMemoryStore();
  return true;
}

export async function fbGetUserExpenses(userId: number): Promise<FarmExpense[]> {
  const sql = await getPgSql();
  if (sql) {
    return (await sql`SELECT id, user_id AS "userId", plot_id AS "plotId", category, label, amount, occurred_at AS "occurredAt" FROM rytha_farm_expenses WHERE user_id = ${userId} ORDER BY occurred_at DESC`) as unknown as FarmExpense[];
  }
  return getMemoryStore().expenses.filter((e) => e.userId === userId || e.userId === 1).map((e) => ({ ...e, occurredAt: new Date(e.occurredAt) })) as unknown as FarmExpense[];
}

export async function fbCreateUserExpense(userId: number, input: Omit<InsertFarmExpense, "userId">): Promise<FarmExpense | undefined> {
  if (input.plotId && !(await fbGetOwnedPlot(userId, input.plotId))) return undefined;
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql`INSERT INTO rytha_farm_expenses (user_id, plot_id, category, label, amount) VALUES (${userId}, ${input.plotId ?? null}, ${input.category}, ${input.label}, ${input.amount}) RETURNING id, user_id AS "userId", plot_id AS "plotId", category, label, amount, occurred_at AS "occurredAt"`;
    return rows[0] as unknown as FarmExpense;
  }
  const store = getMemoryStore();
  const now = new Date().toISOString();
  const row = { id: ++store.nextId, userId, plotId: input.plotId ?? null, category: input.category, label: input.label, amount: input.amount, occurredAt: now };
  store.expenses.unshift(row);
  saveMemoryStore();
  return { ...row, occurredAt: new Date(now) } as unknown as FarmExpense;
}

export async function fbGetUserSales(userId: number): Promise<FarmSale[]> {
  const sql = await getPgSql();
  if (sql) {
    return (await sql`SELECT id, user_id AS "userId", plot_id AS "plotId", crop, quantity_kg AS "quantityKg", price_per_quintal AS "pricePerQuintal", total_amount AS "totalAmount", sold_at AS "soldAt" FROM rytha_farm_sales WHERE user_id = ${userId} ORDER BY sold_at DESC`) as unknown as FarmSale[];
  }
  return getMemoryStore().sales.filter((s) => s.userId === userId || s.userId === 1).map((s) => ({ ...s, soldAt: new Date(s.soldAt) })) as unknown as FarmSale[];
}

export async function fbCreateUserSale(userId: number, input: Omit<InsertFarmSale, "userId">): Promise<FarmSale | undefined> {
  if (input.plotId && !(await fbGetOwnedPlot(userId, input.plotId))) return undefined;
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql`INSERT INTO rytha_farm_sales (user_id, plot_id, crop, quantity_kg, price_per_quintal, total_amount) VALUES (${userId}, ${input.plotId ?? null}, ${input.crop}, ${input.quantityKg}, ${input.pricePerQuintal}, ${input.totalAmount}) RETURNING id, user_id AS "userId", plot_id AS "plotId", crop, quantity_kg AS "quantityKg", price_per_quintal AS "pricePerQuintal", total_amount AS "totalAmount", sold_at AS "soldAt"`;
    return rows[0] as unknown as FarmSale;
  }
  const store = getMemoryStore();
  const now = new Date().toISOString();
  const row = { id: ++store.nextId, userId, plotId: input.plotId ?? null, crop: input.crop, quantityKg: input.quantityKg, pricePerQuintal: input.pricePerQuintal, totalAmount: input.totalAmount, soldAt: now };
  store.sales.unshift(row);
  saveMemoryStore();
  return { ...row, soldAt: new Date(now) } as unknown as FarmSale;
}

export async function fbGetFinanceSummary(userId: number) {
  const [expenses, sales] = await Promise.all([fbGetUserExpenses(userId), fbGetUserSales(userId)]);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  return { expenses: totalExpenses, sales: totalSales, profit: totalSales - totalExpenses };
}

export async function fbCreateCropCycle(userId: number, input: { plotId: number; crop: string; sowingDate: Date; expectedHarvestDate: Date }) {
  if (!(await fbGetOwnedPlot(userId, input.plotId))) return undefined;
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql<{ id: number }[]>`INSERT INTO rytha_crop_cycles (user_id, plot_id, crop, sowing_date, expected_harvest_date) VALUES (${userId}, ${input.plotId}, ${input.crop}, ${input.sowingDate}, ${input.expectedHarvestDate}) RETURNING id`;
    return rows[0]?.id;
  }
  const store = getMemoryStore();
  const id = ++store.nextId;
  store.cycles.unshift({ id, userId, plotId: input.plotId, crop: input.crop, sowingDate: input.sowingDate.toISOString(), expectedHarvestDate: input.expectedHarvestDate.toISOString(), status: "active", scheduleCronTaskUid: null, createdAt: new Date().toISOString() });
  saveMemoryStore();
  return id;
}

export async function fbGetUserCropCycles(userId: number) {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql<Array<{ id: number; userId: number; plotId: number; crop: string; sowingDate: Date; expectedHarvestDate: Date; status: "planned" | "active" | "harvested"; scheduleCronTaskUid: string | null; createdAt: Date }>>`SELECT id, user_id AS "userId", plot_id AS "plotId", crop, sowing_date AS "sowingDate", expected_harvest_date AS "expectedHarvestDate", status, schedule_cron_task_uid AS "scheduleCronTaskUid", created_at AS "createdAt" FROM rytha_crop_cycles WHERE user_id = ${userId} ORDER BY sowing_date DESC`;
    return [...rows];
  }
  return getMemoryStore().cycles.filter((c) => c.userId === userId || c.userId === 1).map((c) => ({ ...c, sowingDate: new Date(c.sowingDate), expectedHarvestDate: new Date(c.expectedHarvestDate), createdAt: new Date(c.createdAt) }));
}

export async function fbCreateCropDiagnosisHistory(entry: InsertCropDiagnosisHistory) {
  const sql = await getPgSql();
  if (sql) {
    await sql`INSERT INTO rytha_crop_diagnosis_history (user_id, plot_name, crop, image_key, likely_condition, category, confidence, severity, explanation, needs_agronomist) VALUES (${entry.userId}, ${entry.plotName}, ${entry.crop}, ${entry.imageKey}, ${entry.likelyCondition}, ${entry.category}, ${entry.confidence}, ${entry.severity}, ${entry.explanation}, ${entry.needsAgronomist ?? 0})`;
    return true;
  }
  const store = getMemoryStore();
  store.diagnoses.unshift({
    id: ++store.nextId,
    userId: entry.userId,
    plotName: entry.plotName,
    crop: entry.crop,
    imageKey: entry.imageKey,
    likelyCondition: entry.likelyCondition,
    category: entry.category,
    confidence: entry.confidence,
    severity: entry.severity,
    explanation: entry.explanation,
    needsAgronomist: entry.needsAgronomist ?? 0,
    createdAt: new Date().toISOString(),
  });
  saveMemoryStore();
  return true;
}

export async function fbGetCropDiagnosisHistory(userId: number, plotName?: string): Promise<CropDiagnosisHistory[]> {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql`SELECT id, user_id AS "userId", plot_name AS "plotName", crop, image_key AS "imageKey", likely_condition AS "likelyCondition", category, confidence, severity, explanation, needs_agronomist AS "needsAgronomist", created_at AS "createdAt" FROM rytha_crop_diagnosis_history WHERE user_id = ${userId} ORDER BY created_at DESC`;
    const list = rows as unknown as CropDiagnosisHistory[];
    return plotName ? list.filter((r) => r.plotName === plotName) : list;
  }
  const rows = getMemoryStore().diagnoses.filter((d) => d.userId === userId).map((d) => ({ ...d, createdAt: new Date(d.createdAt) }));
  return (plotName ? rows.filter((r) => r.plotName === plotName) : rows) as unknown as CropDiagnosisHistory[];
}

export async function fbCreateAgronomistReviewRequest(request: InsertAgronomistReviewRequest) {
  const sql = await getPgSql();
  if (sql) {
    return await sql`INSERT INTO rytha_agronomist_requests (user_id, image_key, crop, ai_condition, ai_confidence, farmer_note, status) VALUES (${request.userId}, ${request.imageKey}, ${request.crop}, ${request.aiCondition ?? null}, ${request.aiConfidence ?? null}, ${request.farmerNote ?? null}, ${request.status ?? "requested"}) RETURNING id`;
  }
  const store = getMemoryStore();
  const now = new Date().toISOString();
  const row = { id: ++store.nextId, userId: request.userId, imageKey: request.imageKey, crop: request.crop, aiCondition: request.aiCondition ?? null, aiConfidence: request.aiConfidence ?? null, farmerNote: request.farmerNote ?? null, agronomistReply: null, repliedAt: null, readAt: null, status: (request.status ?? "requested") as "requested" | "assigned" | "resolved", createdAt: now, updatedAt: now };
  store.reviews.unshift(row);
  saveMemoryStore();
  return row;
}

export async function fbGetAgronomistReviewRequests(userId: number) {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql<Array<{ id: number; userId: number; imageKey: string; crop: string; aiCondition: string | null; aiConfidence: number | null; farmerNote: string | null; agronomistReply: string | null; repliedAt: Date | null; readAt: Date | null; status: "requested" | "assigned" | "resolved"; createdAt: Date; updatedAt: Date }>>`SELECT id, user_id AS "userId", image_key AS "imageKey", crop, ai_condition AS "aiCondition", ai_confidence AS "aiConfidence", farmer_note AS "farmerNote", agronomist_reply AS "agronomistReply", replied_at AS "repliedAt", read_at AS "readAt", status, created_at AS "createdAt", updated_at AS "updatedAt" FROM rytha_agronomist_requests WHERE user_id = ${userId} ORDER BY updated_at DESC`;
    return [...rows];
  }
  return getMemoryStore().reviews.filter((r) => r.userId === userId).map((r) => ({ ...r, createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt) }));
}

export async function fbMarkAgronomistReviewRead(userId: number, id: number) {
  const sql = await getPgSql();
  if (sql) {
    await sql`UPDATE rytha_agronomist_requests SET read_at = NOW() WHERE id = ${id} AND user_id = ${userId}`;
    return true;
  }
  const row = getMemoryStore().reviews.find((r) => r.id === id && r.userId === userId);
  if (row) {
    row.readAt = new Date().toISOString();
    saveMemoryStore();
  }
  return true;
}

type AnnouncementDto = {
  id: number;
  createdBy: number;
  title: string;
  message: string;
  ctaLabel: string;
  targetView: string;
  tone: "green" | "amber" | "blue";
  status: "draft" | "published" | "archived";
  targetCrop: string | null;
  targetLocation: string | null;
  publishAt: Date;
  expireAt: Date | null;
  translations: Array<{ language: "Kannada" | "Hindi"; title: string; message: string; ctaLabel: string }>;
  viewCount: number;
  ctaClickCount: number;
  updatedAt: Date;
};

export async function fbGetPublishedAnnouncements(_userId: number): Promise<AnnouncementDto[]> {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql<AnnouncementDto[]>`SELECT id, created_by AS "createdBy", title, message, cta_label AS "ctaLabel", target_view AS "targetView", tone, status, target_crop AS "targetCrop", target_location AS "targetLocation", publish_at AS "publishAt", expire_at AS "expireAt", translations_json AS translations, views_count AS "viewCount", cta_clicks_count AS "ctaClickCount", updated_at AS "updatedAt" FROM rytha_announcements WHERE status = 'published' AND publish_at <= NOW() AND (expire_at IS NULL OR expire_at > NOW()) ORDER BY publish_at DESC`;
    if (rows.length > 0) return [...rows];
  }
  const now = new Date();
  return getMemoryStore().announcements.filter((a) => a.status === "published" && new Date(a.publishAt) <= now && (!a.expireAt || new Date(a.expireAt) > now)).map((a) => ({ ...a, publishAt: new Date(a.publishAt), expireAt: a.expireAt ? new Date(a.expireAt) : null, updatedAt: new Date(a.updatedAt) }));
}

export async function fbGetAllAnnouncements(): Promise<AnnouncementDto[]> {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql<AnnouncementDto[]>`SELECT id, created_by AS "createdBy", title, message, cta_label AS "ctaLabel", target_view AS "targetView", tone, status, target_crop AS "targetCrop", target_location AS "targetLocation", publish_at AS "publishAt", expire_at AS "expireAt", translations_json AS translations, views_count AS "viewCount", cta_clicks_count AS "ctaClickCount", updated_at AS "updatedAt" FROM rytha_announcements ORDER BY updated_at DESC`;
    if (rows.length > 0) return [...rows];
  }
  return getMemoryStore().announcements.map((a) => ({ ...a, publishAt: new Date(a.publishAt), expireAt: a.expireAt ? new Date(a.expireAt) : null, updatedAt: new Date(a.updatedAt) }));
}

export async function fbCreateAnnouncement(input: InsertAnnouncement, translations: Array<{ language: "Kannada" | "Hindi"; title: string; message: string; ctaLabel: string }>) {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql`
      INSERT INTO rytha_announcements (created_by, title, message, cta_label, target_view, tone, status, target_crop, target_location, publish_at, expire_at, translations_json)
      VALUES (${input.createdBy}, ${input.title}, ${input.message}, ${input.ctaLabel ?? "Learn more"}, ${input.targetView ?? "Community"}, ${input.tone ?? "green"}, ${input.status ?? "draft"}, ${input.targetCrop ?? null}, ${input.targetLocation ?? null}, ${input.publishAt}, ${input.expireAt ?? null}, ${JSON.stringify(translations)}::jsonb)
      RETURNING id, created_by AS "createdBy", title, message, cta_label AS "ctaLabel", target_view AS "targetView", tone, status, target_crop AS "targetCrop", target_location AS "targetLocation", publish_at AS "publishAt", expire_at AS "expireAt", updated_at AS "updatedAt"
    `;
    return rows[0];
  }
  const store = getMemoryStore();
  const now = new Date().toISOString();
  const row = { id: ++store.nextId, createdBy: input.createdBy, title: input.title, message: input.message, ctaLabel: input.ctaLabel ?? "Learn more", targetView: input.targetView ?? "Community", tone: (input.tone ?? "green") as "green" | "amber" | "blue", status: (input.status ?? "draft") as "draft" | "published" | "archived", targetCrop: input.targetCrop ?? null, targetLocation: input.targetLocation ?? null, publishAt: new Date(input.publishAt).toISOString(), expireAt: input.expireAt ? new Date(input.expireAt).toISOString() : null, translations, viewCount: 0, ctaClickCount: 0, updatedAt: now };
  store.announcements.unshift(row);
  saveMemoryStore();
  return row;
}

export async function fbRecordAnnouncementEvent(announcementId: number, eventType: "view" | "cta_click") {
  const sql = await getPgSql();
  if (sql) {
    if (eventType === "view") await sql`UPDATE rytha_announcements SET views_count = views_count + 1 WHERE id = ${announcementId}`;
    else await sql`UPDATE rytha_announcements SET cta_clicks_count = cta_clicks_count + 1 WHERE id = ${announcementId}`;
    return true;
  }
  const target = getMemoryStore().announcements.find((a) => a.id === announcementId);
  if (!target) return true;
  if (eventType === "view") target.viewCount += 1;
  else target.ctaClickCount += 1;
  saveMemoryStore();
  return true;
}

export async function fbGetCommunityFeed(userId: number, kind?: "post" | "reel") {
  const sql = await getPgSql();
  if (sql) {
    const posts = await sql<{ id: number; userId: number; kind: "post" | "reel"; mediaType: "image" | "video"; mediaUrl: string; mediaKey: string; caption: string | null; createdAt: Date; authorName: string | null; authorAvatarUrl: string | null }[]>`
      SELECT p.id, p.user_id AS "userId", p.kind, p.media_type AS "mediaType", p.media_url AS "mediaUrl", p.media_key AS "mediaKey", p.caption, p.created_at AS "createdAt", u.name AS "authorName", u.avatar_url AS "authorAvatarUrl"
      FROM rytha_community_posts p LEFT JOIN rytha_users u ON u.id = p.user_id
      ORDER BY p.created_at DESC LIMIT 50
    `;
    const filtered = kind ? posts.filter((p) => p.kind === kind) : posts;
    return filtered.map((p) => ({ ...p, authorName: p.authorName || "Farmer", likeCount: 0, commentCount: 0, likedByMe: false }));
  }
  const posts = getMemoryStore().communityPosts.filter((p) => !kind || p.kind === kind);
  return posts.map((p) => ({
    id: p.id, userId: p.userId, kind: p.kind, mediaType: p.mediaType, mediaUrl: p.mediaUrl, mediaKey: p.mediaKey, caption: p.caption, createdAt: new Date(p.createdAt),
    authorName: p.authorName, authorAvatarUrl: p.authorAvatarUrl,
    likeCount: p.likedUserIds.length, commentCount: getMemoryStore().communityComments.filter((c) => c.postId === p.id).length,
    likedByMe: p.likedUserIds.includes(userId),
  }));
}

export async function fbCreateCommunityPost(input: InsertCommunityPost) {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql`
      INSERT INTO rytha_community_posts (user_id, kind, media_type, media_url, media_key, caption)
      VALUES (${input.userId}, ${input.kind ?? "post"}, ${input.mediaType}, ${input.mediaUrl}, ${input.mediaKey}, ${input.caption ?? null})
      RETURNING id, user_id AS "userId", kind, media_type AS "mediaType", media_url AS "mediaUrl", media_key AS "mediaKey", caption, created_at AS "createdAt"
    `;
    return rows[0];
  }
  const store = getMemoryStore();
  const user = store.users.find((u) => u.id === input.userId);
  const now = new Date().toISOString();
  const row = { id: ++store.nextId, userId: input.userId, authorName: user?.name || "Farmer", authorAvatarUrl: user?.avatarUrl ?? null, kind: (input.kind ?? "post") as "post" | "reel", mediaType: input.mediaType, mediaUrl: input.mediaUrl, mediaKey: input.mediaKey, caption: input.caption ?? null, createdAt: now, likedUserIds: [] };
  store.communityPosts.unshift(row);
  saveMemoryStore();
  return row;
}

export async function fbGetAdminSummary() {
  const sql = await getPgSql();
  if (sql) {
    const [u, p, r, t, rev] = await Promise.all([
      sql<{ c: string }[]>`SELECT count(*)::text AS c FROM rytha_users`,
      sql<{ c: string }[]>`SELECT count(*)::text AS c FROM rytha_plots`,
      sql<{ c: string }[]>`SELECT count(*)::text AS c FROM rytha_sensor_readings`,
      sql<{ c: string }[]>`SELECT count(*)::text AS c FROM rytha_farm_tasks WHERE status = 'pending'`,
      sql<{ c: string }[]>`SELECT count(*)::text AS c FROM rytha_agronomist_requests WHERE status = 'requested'`,
    ]);
    return { users: Number(u[0]?.c ?? 0), plots: Number(p[0]?.c ?? 0), sensorReadings: Number(r[0]?.c ?? 0), pendingTasks: Number(t[0]?.c ?? 0), reviewRequests: Number(rev[0]?.c ?? 0) };
  }
  const s = getMemoryStore();
  return { users: Math.max(1, s.users.length), plots: s.plots.length, sensorReadings: s.readings.length, pendingTasks: s.tasks.filter((t) => t.status === "pending").length, reviewRequests: s.reviews.length };
}
