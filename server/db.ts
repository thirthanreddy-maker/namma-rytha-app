import { and, count, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { agronomistReviewRequests, announcementEvents, announcementTranslations, announcements, communityComments, communityPostLikes, communityPosts, cropDiagnosisHistory, CropDiagnosisHistory, FarmExpense, FarmSale, FarmTask, InsertAgronomistReviewRequest, InsertAnnouncement, InsertCommunityPost, InsertCropDiagnosisHistory, InsertFarmExpense, InsertFarmSale, InsertFarmTask, InsertPlot, InsertSensorReading, NotificationDeliveryLog, Plot, SensorReading, users, plots, sensorReadings, farmTasks, farmExpenses, farmSales, cropCycles, notificationDeliveryLogs, signInHistory, SignInHistory } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { createHash } from "node:crypto";
import { randomBytes } from "node:crypto";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: import("../drizzle/schema").InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  try {
    const db = await getDb();
    if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
    const values: import("../drizzle/schema").InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod", "phoneNumber"] as const;
    textFields.forEach((field) => { const value = user[field]; if (value !== undefined) { const normalized = value ?? null; values[field] = normalized; updateSet[field] = normalized; } });
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.notificationChannel !== undefined) { values.notificationChannel = user.notificationChannel; updateSet.notificationChannel = user.notificationChannel; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; } else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); }
}

export async function upsertPhoneUser(phone: string) {
  const openId = `phone_${createHash("sha256").update(phone).digest("hex").slice(0, 48)}`;
  await upsertUser({ openId, loginMethod: "phone", lastSignedIn: new Date() });
  return { openId, name: "Farmer" };
}

export function hashUserPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = createHash("sha256").update(`${salt}:${password}`).digest("hex");
  return `${salt}:${hash}`;
}

export function verifyUserPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const hash = createHash("sha256").update(`${salt}:${password}`).digest("hex");
  return hash === expected;
}

export async function upsertNormalUser(emailOrUsername: string, name: string) {
  const cleanId = emailOrUsername.trim().toLowerCase();
  const openId = `usr_${createHash("sha256").update(cleanId).digest("hex").slice(0, 48)}`;
  await upsertUser({
    openId,
    name: name.trim() || "Farmer",
    email: cleanId.includes("@") ? cleanId : null,
    loginMethod: "password",
    lastSignedIn: new Date(),
  });
  return { openId, name: name.trim() || "Farmer" };
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
export async function getUserById(id: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(users).where(eq(users.id, id)).limit(1); return rows[0]; }
export async function updateUserNotificationPreferences(userId: number, phoneNumber: string | null, notificationChannel: "in_app" | "sms" | "whatsapp") { const db = await getDb(); if (!db) return false; const result = await db.update(users).set({ phoneNumber, notificationChannel }).where(eq(users.id, userId)); return Number(result[0].affectedRows ?? 0) > 0; }
export async function updateUserProfile(userId: number, input: { name: string; farmLocation: string; preferredLanguage: string }) { const db = await getDb(); if (!db) return undefined; await db.update(users).set(input).where(eq(users.id, userId)); return getUserById(userId); }
export async function updateUserAvatar(userId: number, avatarUrl: string) { const db = await getDb(); if (!db) return undefined; await db.update(users).set({ avatarUrl }).where(eq(users.id, userId)); return getUserById(userId); }
export async function createNotificationDeliveryLog(input: { userId: number; channel: "sms" | "whatsapp"; status: "delivered" | "failed"; recipient: string; message: string }) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(notificationDeliveryLogs).values(input);
  const rows = await db.select().from(notificationDeliveryLogs).where(
    and(eq(notificationDeliveryLogs.id, Number(result[0].insertId)), eq(notificationDeliveryLogs.userId, input.userId)),
  ).limit(1);
  return rows[0];
}
export async function getUserNotificationDeliveryLogs(userId: number): Promise<NotificationDeliveryLog[]> { const db = await getDb(); if (!db) return []; return db.select().from(notificationDeliveryLogs).where(eq(notificationDeliveryLogs.userId, userId)).orderBy(desc(notificationDeliveryLogs.createdAt)).limit(30); }
export async function getUserNotificationDeliveryLog(userId: number, id: number): Promise<NotificationDeliveryLog | undefined> { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(notificationDeliveryLogs).where(and(eq(notificationDeliveryLogs.userId, userId), eq(notificationDeliveryLogs.id, id))).limit(1); return rows[0]; }
export async function createSignInHistory(userId: number, method: string) { const db = await getDb(); if (!db) return undefined; try { const result = await db.insert(signInHistory).values({ userId, method: method.slice(0, 64) }); const rows = await db.select().from(signInHistory).where(and(eq(signInHistory.id, Number(result[0].insertId)), eq(signInHistory.userId, userId))).limit(1); return rows[0]; } catch (error) { console.warn("[Database] Sign-in history could not be recorded", error); return undefined; } }
export async function getUserSignInHistory(userId: number): Promise<SignInHistory[]> { const db = await getDb(); if (!db) return []; return db.select().from(signInHistory).where(eq(signInHistory.userId, userId)).orderBy(desc(signInHistory.createdAt)).limit(10); }

export async function createAgronomistReviewRequest(request: InsertAgronomistReviewRequest) { const db = await getDb(); if (!db) { console.warn("[Database] Cannot create review request: database not available"); return undefined; } return db.insert(agronomistReviewRequests).values(request); }
export async function getAgronomistReviewRequests(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(agronomistReviewRequests).where(eq(agronomistReviewRequests.userId, userId)).orderBy(desc(agronomistReviewRequests.updatedAt)); }
export async function markAgronomistReviewRead(userId: number, id: number) { const db = await getDb(); if (!db) return false; await db.update(agronomistReviewRequests).set({ readAt: new Date() }).where(and(eq(agronomistReviewRequests.id, id), eq(agronomistReviewRequests.userId, userId))); return true; }
export async function createCropDiagnosisHistory(entry: InsertCropDiagnosisHistory) { const db = await getDb(); if (!db) return undefined; await db.insert(cropDiagnosisHistory).values(entry); return true; }
export async function getCropDiagnosisHistory(userId: number, plotName?: string): Promise<CropDiagnosisHistory[]> { const db = await getDb(); if (!db) return []; const rows = await db.select().from(cropDiagnosisHistory).where(eq(cropDiagnosisHistory.userId, userId)).orderBy(desc(cropDiagnosisHistory.createdAt)); return plotName ? rows.filter((row) => row.plotName === plotName) : rows; }

export async function getUserPlots(userId: number): Promise<Plot[]> { const db = await getDb(); if (!db) return []; return db.select().from(plots).where(eq(plots.userId, userId)).orderBy(desc(plots.updatedAt)); }
export async function createUserPlot(userId: number, input: Omit<InsertPlot, "userId" | "ingestToken">): Promise<Plot | undefined> { const db = await getDb(); if (!db) return undefined; const result = await db.insert(plots).values({ ...input, userId, ingestToken: randomBytes(32).toString("hex") }); const id = Number(result[0].insertId); const rows = await db.select().from(plots).where(and(eq(plots.id, id), eq(plots.userId, userId))).limit(1); return rows[0]; }
export async function getOwnedPlot(userId: number, plotId: number): Promise<Plot | undefined> { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(plots).where(and(eq(plots.id, plotId), eq(plots.userId, userId))).limit(1); return rows[0]; }
export async function getPlotByIngestToken(ingestToken: string): Promise<Plot | undefined> { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(plots).where(eq(plots.ingestToken, ingestToken)).limit(1); return rows[0]; }

export async function getLatestSensorReadings(userId: number): Promise<SensorReading[]> { const db = await getDb(); if (!db) return []; return db.select().from(sensorReadings).where(eq(sensorReadings.userId, userId)).orderBy(desc(sensorReadings.recordedAt)).limit(50); }
export async function addSensorReading(userId: number, input: Omit<InsertSensorReading, "userId">): Promise<SensorReading | undefined> { const db = await getDb(); if (!db) return undefined; const plot = await getOwnedPlot(userId, input.plotId); if (!plot) return undefined; const result = await db.insert(sensorReadings).values({ ...input, userId }); const id = Number(result[0].insertId); const rows = await db.select().from(sensorReadings).where(and(eq(sensorReadings.id, id), eq(sensorReadings.userId, userId))).limit(1); return rows[0]; }
export async function getLatestSensorReadingForPlot(plotId: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(sensorReadings).where(eq(sensorReadings.plotId, plotId)).orderBy(desc(sensorReadings.recordedAt)).limit(1); return rows[0]; }

export async function getUserTasks(userId: number): Promise<FarmTask[]> { const db = await getDb(); if (!db) return []; return db.select().from(farmTasks).where(eq(farmTasks.userId, userId)).orderBy(desc(farmTasks.dueDate)); }
export async function createUserTask(userId: number, input: Omit<InsertFarmTask, "userId">): Promise<FarmTask | undefined> { const db = await getDb(); if (!db) return undefined; if (input.plotId && !(await getOwnedPlot(userId, input.plotId))) return undefined; const result = await db.insert(farmTasks).values({ ...input, userId }); const id = Number(result[0].insertId); const rows = await db.select().from(farmTasks).where(and(eq(farmTasks.id, id), eq(farmTasks.userId, userId))).limit(1); return rows[0]; }
export async function setTaskStatus(userId: number, id: number, completed: boolean): Promise<boolean> { const db = await getDb(); if (!db) return false; const result = await db.update(farmTasks).set({ status: completed ? "completed" : "pending", completedAt: completed ? new Date() : null }).where(and(eq(farmTasks.id, id), eq(farmTasks.userId, userId))); return Number(result[0].affectedRows ?? 0) > 0; }

export async function getUserExpenses(userId: number): Promise<FarmExpense[]> { const db = await getDb(); if (!db) return []; return db.select().from(farmExpenses).where(eq(farmExpenses.userId, userId)).orderBy(desc(farmExpenses.occurredAt)); }
export async function createUserExpense(userId: number, input: Omit<InsertFarmExpense, "userId">): Promise<FarmExpense | undefined> { const db = await getDb(); if (!db) return undefined; if (input.plotId && !(await getOwnedPlot(userId, input.plotId))) return undefined; const result = await db.insert(farmExpenses).values({ ...input, userId }); const id = Number(result[0].insertId); const rows = await db.select().from(farmExpenses).where(and(eq(farmExpenses.id, id), eq(farmExpenses.userId, userId))).limit(1); return rows[0]; }
export async function getUserSales(userId: number): Promise<FarmSale[]> { const db = await getDb(); if (!db) return []; return db.select().from(farmSales).where(eq(farmSales.userId, userId)).orderBy(desc(farmSales.soldAt)); }
export async function createUserSale(userId: number, input: Omit<InsertFarmSale, "userId">): Promise<FarmSale | undefined> { const db = await getDb(); if (!db) return undefined; if (input.plotId && !(await getOwnedPlot(userId, input.plotId))) return undefined; const result = await db.insert(farmSales).values({ ...input, userId }); const id = Number(result[0].insertId); const rows = await db.select().from(farmSales).where(and(eq(farmSales.id, id), eq(farmSales.userId, userId))).limit(1); return rows[0]; }
export async function getFinanceSummary(userId: number) { const db = await getDb(); if (!db) return { expenses: 0, sales: 0, profit: 0 }; const [expenseRows, saleRows] = await Promise.all([db.select({ total: sql<number>`coalesce(sum(${farmExpenses.amount}), 0)` }).from(farmExpenses).where(eq(farmExpenses.userId, userId)), db.select({ total: sql<number>`coalesce(sum(${farmSales.totalAmount}), 0)` }).from(farmSales).where(eq(farmSales.userId, userId))]); const expenses = Number(expenseRows[0]?.total ?? 0); const sales = Number(saleRows[0]?.total ?? 0); return { expenses, sales, profit: sales - expenses }; }

export async function createCropCycle(userId: number, input: { plotId: number; crop: string; sowingDate: Date; expectedHarvestDate: Date }) { const db = await getDb(); if (!db || !(await getOwnedPlot(userId, input.plotId))) return undefined; const result = await db.insert(cropCycles).values({ ...input, userId }); return Number(result[0].insertId); }
export async function getUserCropCycles(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(cropCycles).where(eq(cropCycles.userId, userId)).orderBy(desc(cropCycles.sowingDate)); }
export async function setCropCycleSchedule(userId: number, id: number, scheduleCronTaskUid: string | null) { const db = await getDb(); if (!db) return false; const result = await db.update(cropCycles).set({ scheduleCronTaskUid }).where(and(eq(cropCycles.id, id), eq(cropCycles.userId, userId))); return Number(result[0].affectedRows ?? 0) > 0; }
export async function getCropCycleByScheduleUid(scheduleCronTaskUid: string) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(cropCycles).where(eq(cropCycles.scheduleCronTaskUid, scheduleCronTaskUid)).limit(1); return rows[0]; }

export async function getAdminSummary() {
  const db = await getDb();
  if (!db) return { users: 0, plots: 0, sensorReadings: 0, pendingTasks: 0, reviewRequests: 0 };
  const [userRows, plotRows, readingRows, taskRows, reviewRows] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(plots),
    db.select({ value: count() }).from(sensorReadings),
    db.select({ value: count() }).from(farmTasks).where(eq(farmTasks.status, "pending")),
    db.select({ value: count() }).from(agronomistReviewRequests).where(eq(agronomistReviewRequests.status, "requested")),
  ]);
  return { users: Number(userRows[0]?.value ?? 0), plots: Number(plotRows[0]?.value ?? 0), sensorReadings: Number(readingRows[0]?.value ?? 0), pendingTasks: Number(taskRows[0]?.value ?? 0), reviewRequests: Number(reviewRows[0]?.value ?? 0) };
}

export async function getPublishedAnnouncements(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const [user, userPlots, rows] = await Promise.all([
    getUserById(userId),
    getUserPlots(userId),
    db.select().from(announcements).where(and(eq(announcements.status, "published"), sql`${announcements.publishAt} <= UTC_TIMESTAMP()`, sql`(${announcements.expireAt} IS NULL OR ${announcements.expireAt} > UTC_TIMESTAMP())`)).orderBy(desc(announcements.publishAt)),
  ]);
  const crops = new Set(userPlots.map((plot) => plot.crop.trim().toLowerCase()));
  const location = user?.farmLocation?.trim().toLowerCase() ?? "";
  const language = user?.preferredLanguage === "Kannada" || user?.preferredLanguage === "Hindi" ? user.preferredLanguage : null;
  const translations = language && rows.length ? await db.select().from(announcementTranslations).where(and(eq(announcementTranslations.language, language), sql`${announcementTranslations.announcementId} IN (${sql.join(rows.map((row) => sql`${row.id}`), sql`, `)})`)) : [];
  const translationMap = new Map(translations.map((translation) => [translation.announcementId, translation]));
  return rows.filter((row) => {
    const cropMatches = !row.targetCrop || crops.has(row.targetCrop.trim().toLowerCase());
    const locationMatches = !row.targetLocation || location.includes(row.targetLocation.trim().toLowerCase());
    return cropMatches && locationMatches;
  }).map((row) => ({ ...row, ...(translationMap.get(row.id) ? { title: translationMap.get(row.id)!.title, message: translationMap.get(row.id)!.message, ctaLabel: translationMap.get(row.id)!.ctaLabel } : {}) }));
}

export async function getAllAnnouncements() {
  const db = await getDb();
  if (!db) return [];
  const [rows, translations, events] = await Promise.all([
    db.select().from(announcements).orderBy(desc(announcements.updatedAt)),
    db.select().from(announcementTranslations),
    db.select({ announcementId: announcementEvents.announcementId, eventType: announcementEvents.eventType, total: count() }).from(announcementEvents).groupBy(announcementEvents.announcementId, announcementEvents.eventType),
  ]);
  return rows.map((row) => ({ ...row, translations: translations.filter((translation) => translation.announcementId === row.id), viewCount: Number(events.find((event) => event.announcementId === row.id && event.eventType === "view")?.total ?? 0), ctaClickCount: Number(events.find((event) => event.announcementId === row.id && event.eventType === "cta_click")?.total ?? 0) }));
}

export async function getAnnouncementAnalytics(filters: { startDate?: Date; endDate?: Date; crop?: string; location?: string }) {
  const db = await getDb();
  if (!db) return { rows: [], totals: { views: 0, ctaClicks: 0, announcements: 0 } };
  const conditions = [];
  if (filters.crop) conditions.push(sql`(${announcements.targetCrop} IS NULL OR lower(${announcements.targetCrop}) = lower(${filters.crop}))`);
  if (filters.location) conditions.push(sql`(${announcements.targetLocation} IS NULL OR lower(${announcements.targetLocation}) LIKE lower(${`%${filters.location}%`}))`);
  const matching = await db.select().from(announcements).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(announcements.updatedAt));
  if (!matching.length) return { rows: [], totals: { views: 0, ctaClicks: 0, announcements: 0 } };
  const eventConditions = [sql`${announcementEvents.announcementId} IN (${sql.join(matching.map((row) => sql`${row.id}`), sql`, `)})`];
  if (filters.startDate) eventConditions.push(sql`${announcementEvents.createdAt} >= ${filters.startDate}`);
  if (filters.endDate) eventConditions.push(sql`${announcementEvents.createdAt} < ${filters.endDate}`);
  const events = await db.select({ announcementId: announcementEvents.announcementId, eventType: announcementEvents.eventType, total: count() }).from(announcementEvents).where(and(...eventConditions)).groupBy(announcementEvents.announcementId, announcementEvents.eventType);
  const rows = matching.map((row) => ({ id: row.id, title: row.title, status: row.status, targetCrop: row.targetCrop, targetLocation: row.targetLocation, publishAt: row.publishAt, viewCount: Number(events.find((event) => event.announcementId === row.id && event.eventType === "view")?.total ?? 0), ctaClickCount: Number(events.find((event) => event.announcementId === row.id && event.eventType === "cta_click")?.total ?? 0) }));
  return { rows, totals: { views: rows.reduce((sum, row) => sum + row.viewCount, 0), ctaClicks: rows.reduce((sum, row) => sum + row.ctaClickCount, 0), announcements: rows.length } };
}

type AnnouncementTranslationInput = { language: "Kannada" | "Hindi"; title: string; message: string; ctaLabel: string };

export async function createAnnouncement(input: InsertAnnouncement, translations: AnnouncementTranslationInput[] = []) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(announcements).values(input);
  const id = Number(result[0].insertId);
  if (translations.length) await db.insert(announcementTranslations).values(translations.map((translation) => ({ ...translation, announcementId: id })));
  const rows = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
  return rows[0];
}

export async function updateAnnouncement(id: number, input: Partial<Omit<InsertAnnouncement, "createdBy">>, translations: AnnouncementTranslationInput[] = []) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(announcements).set(input).where(eq(announcements.id, id));
  for (const translation of translations) {
    await db.insert(announcementTranslations).values({ ...translation, announcementId: id }).onDuplicateKeyUpdate({ set: { title: translation.title, message: translation.message, ctaLabel: translation.ctaLabel } });
  }
  const rows = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
  return rows[0];
}

export async function recordAnnouncementEvent(userId: number, announcementId: number, eventType: "view" | "cta_click") {
  const db = await getDb();
  if (!db) return false;
  const exists = await db.select({ id: announcements.id }).from(announcements).where(eq(announcements.id, announcementId)).limit(1);
  if (!exists.length) return false;
  await db.insert(announcementEvents).values({ userId, announcementId, eventType });
  return true;
}

export async function updateAnnouncementStatus(id: number, status: "draft" | "published" | "archived") {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(announcements).set({ status }).where(eq(announcements.id, id));
  const rows = await db.select().from(announcements).where(eq(announcements.id, id)).limit(1);
  return rows[0];
}

export async function deleteAnnouncement(id: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.delete(announcements).where(eq(announcements.id, id));
  return Number(result[0].affectedRows ?? 0) > 0;
}

export async function getCommunityFeed(userId: number, kind?: "post" | "reel") {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ post: communityPosts, authorName: users.name, authorAvatarUrl: users.avatarUrl }).from(communityPosts).innerJoin(users, eq(communityPosts.userId, users.id)).where(kind ? eq(communityPosts.kind, kind) : undefined).orderBy(desc(communityPosts.createdAt)).limit(50);
  return Promise.all(rows.map(async ({ post, authorName, authorAvatarUrl }) => {
    const [likeRows, commentRows, likedRows] = await Promise.all([
      db.select({ value: count() }).from(communityPostLikes).where(eq(communityPostLikes.postId, post.id)),
      db.select({ value: count() }).from(communityComments).where(eq(communityComments.postId, post.id)),
      db.select({ id: communityPostLikes.id }).from(communityPostLikes).where(and(eq(communityPostLikes.postId, post.id), eq(communityPostLikes.userId, userId))).limit(1),
    ]);
    return { ...post, authorName: authorName || "Farmer", authorAvatarUrl, likeCount: Number(likeRows[0]?.value ?? 0), commentCount: Number(commentRows[0]?.value ?? 0), likedByMe: likedRows.length > 0 };
  }));
}

export async function createCommunityPost(input: InsertCommunityPost) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(communityPosts).values(input);
  const rows = await db.select().from(communityPosts).where(and(eq(communityPosts.id, Number(result[0].insertId)), eq(communityPosts.userId, input.userId))).limit(1);
  return rows[0];
}

export async function getCommunityPost(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(communityPosts).where(eq(communityPosts.id, id)).limit(1);
  return rows[0];
}

export async function toggleCommunityLike(userId: number, postId: number) {
  const db = await getDb();
  if (!db) return { liked: false };
  const existing = await db.select({ id: communityPostLikes.id }).from(communityPostLikes).where(and(eq(communityPostLikes.userId, userId), eq(communityPostLikes.postId, postId))).limit(1);
  if (existing[0]) { await db.delete(communityPostLikes).where(eq(communityPostLikes.id, existing[0].id)); return { liked: false }; }
  await db.insert(communityPostLikes).values({ userId, postId });
  return { liked: true };
}

export async function getCommunityComments(postId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: communityComments.id, postId: communityComments.postId, body: communityComments.body, createdAt: communityComments.createdAt, authorName: users.name, authorAvatarUrl: users.avatarUrl }).from(communityComments).innerJoin(users, eq(communityComments.userId, users.id)).where(eq(communityComments.postId, postId)).orderBy(desc(communityComments.createdAt)).limit(50);
}

export async function addCommunityComment(userId: number, postId: number, body: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(communityComments).values({ userId, postId, body });
  const rows = await db.select().from(communityComments).where(and(eq(communityComments.id, Number(result[0].insertId)), eq(communityComments.userId, userId))).limit(1);
  return rows[0];
}
