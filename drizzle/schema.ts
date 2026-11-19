import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  farmLocation: varchar("farmLocation", { length: 160 }),
  preferredLanguage: varchar("preferredLanguage", { length: 16 }).default("English").notNull(),
  avatarUrl: varchar("avatarUrl", { length: 512 }),
  phoneNumber: varchar("phoneNumber", { length: 32 }),
  notificationChannel: mysqlEnum("notificationChannel", ["in_app", "sms", "whatsapp"]).default("in_app").notNull(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const notificationDeliveryLogs = mysqlTable("notificationDeliveryLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  channel: mysqlEnum("channel", ["sms", "whatsapp"]).notNull(),
  status: mysqlEnum("status", ["delivered", "failed"]).notNull(),
  recipient: varchar("recipient", { length: 32 }).notNull(),
  message: varchar("message", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ userIdx: index("notification_logs_user_idx").on(table.userId, table.createdAt) }));

export type NotificationDeliveryLog = typeof notificationDeliveryLogs.$inferSelect;
export type InsertNotificationDeliveryLog = typeof notificationDeliveryLogs.$inferInsert;

export const signInHistory = mysqlTable("signInHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  method: varchar("method", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ userIdx: index("sign_in_history_user_idx").on(table.userId, table.createdAt) }));

export type SignInHistory = typeof signInHistory.$inferSelect;
export type InsertSignInHistory = typeof signInHistory.$inferInsert;

export const agronomistReviewRequests = mysqlTable("agronomistReviewRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  imageKey: varchar("imageKey", { length: 512 }).notNull(),
  crop: varchar("crop", { length: 80 }).notNull(),
  aiCondition: varchar("aiCondition", { length: 255 }),
  aiConfidence: int("aiConfidence"),
  farmerNote: text("farmerNote"),
  agronomistReply: text("agronomistReply"),
  repliedAt: timestamp("repliedAt"),
  readAt: timestamp("readAt"),
  status: mysqlEnum("status", ["requested", "assigned", "resolved"]).default("requested").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgronomistReviewRequest = typeof agronomistReviewRequests.$inferSelect;
export type InsertAgronomistReviewRequest = typeof agronomistReviewRequests.$inferInsert;

export const cropDiagnosisHistory = mysqlTable("cropDiagnosisHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  plotName: varchar("plotName", { length: 120 }).notNull(),
  crop: varchar("crop", { length: 80 }).notNull(),
  imageKey: varchar("imageKey", { length: 512 }).notNull(),
  likelyCondition: varchar("likelyCondition", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["disease", "pest", "nutrient_deficiency", "healthy", "unknown"]).notNull(),
  confidence: int("confidence").notNull(),
  severity: mysqlEnum("severity", ["low", "moderate", "high", "unknown"]).notNull(),
  explanation: text("explanation").notNull(),
  needsAgronomist: int("needsAgronomist").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CropDiagnosisHistory = typeof cropDiagnosisHistory.$inferSelect;
export type InsertCropDiagnosisHistory = typeof cropDiagnosisHistory.$inferInsert;

export const plots = mysqlTable("plots", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  name: varchar("name", { length: 120 }).notNull(),
  crop: varchar("crop", { length: 80 }).notNull(),
  areaAcres: int("areaAcres").notNull().default(1),
  soilType: varchar("soilType", { length: 80 }).notNull().default("Loamy"),
  growthStage: varchar("growthStage", { length: 80 }).notNull().default("Seedling"),
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),
  ingestToken: varchar("ingestToken", { length: 96 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ userIdx: index("plots_user_idx").on(table.userId) }));

export type Plot = typeof plots.$inferSelect;
export type InsertPlot = typeof plots.$inferInsert;

export const sensorReadings = mysqlTable("sensorReadings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  plotId: int("plotId").notNull().references(() => plots.id),
  moisture: int("moisture").notNull(),
  temperature: int("temperature").notNull(),
  humidity: int("humidity").notNull(),
  battery: int("battery").notNull().default(100),
  source: mysqlEnum("source", ["sensor", "simulated"]).default("simulated").notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
}, (table) => ({ plotIdx: index("sensor_readings_plot_idx").on(table.plotId, table.recordedAt) }));

export type SensorReading = typeof sensorReadings.$inferSelect;
export type InsertSensorReading = typeof sensorReadings.$inferInsert;

export const cropCycles = mysqlTable("cropCycles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  plotId: int("plotId").notNull().references(() => plots.id),
  crop: varchar("crop", { length: 80 }).notNull(),
  sowingDate: timestamp("sowingDate").notNull(),
  expectedHarvestDate: timestamp("expectedHarvestDate").notNull(),
  status: mysqlEnum("status", ["planned", "active", "harvested"]).default("active").notNull(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ userIdx: index("crop_cycles_user_idx").on(table.userId, table.status), scheduleIdx: index("crop_cycles_schedule_idx").on(table.scheduleCronTaskUid) }));

export type CropCycle = typeof cropCycles.$inferSelect;
export type InsertCropCycle = typeof cropCycles.$inferInsert;

export const farmTasks = mysqlTable("farmTasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  plotId: int("plotId").references(() => plots.id),
  cycleId: int("cycleId").references(() => cropCycles.id),
  title: varchar("title", { length: 160 }).notNull(),
  detail: text("detail"),
  dueDate: timestamp("dueDate").notNull(),
  completedAt: timestamp("completedAt"),
  status: mysqlEnum("status", ["pending", "completed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ userIdx: index("farm_tasks_user_idx").on(table.userId, table.dueDate) }));

export type FarmTask = typeof farmTasks.$inferSelect;
export type InsertFarmTask = typeof farmTasks.$inferInsert;

export const farmExpenses = mysqlTable("farmExpenses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  plotId: int("plotId").references(() => plots.id),
  category: varchar("category", { length: 80 }).notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  amount: int("amount").notNull(),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
}, (table) => ({ userIdx: index("farm_expenses_user_idx").on(table.userId, table.occurredAt) }));

export type FarmExpense = typeof farmExpenses.$inferSelect;
export type InsertFarmExpense = typeof farmExpenses.$inferInsert;

export const farmSales = mysqlTable("farmSales", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  plotId: int("plotId").references(() => plots.id),
  crop: varchar("crop", { length: 80 }).notNull(),
  quantityKg: int("quantityKg").notNull(),
  pricePerQuintal: int("pricePerQuintal").notNull(),
  totalAmount: int("totalAmount").notNull(),
  soldAt: timestamp("soldAt").defaultNow().notNull(),
}, (table) => ({ userIdx: index("farm_sales_user_idx").on(table.userId, table.soldAt) }));

export type FarmSale = typeof farmSales.$inferSelect;
export type InsertFarmSale = typeof farmSales.$inferInsert;

export const communityPosts = mysqlTable("communityPosts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  kind: mysqlEnum("kind", ["post", "reel"]).notNull().default("post"),
  mediaType: mysqlEnum("mediaType", ["image", "video"]).notNull(),
  mediaUrl: varchar("mediaUrl", { length: 512 }).notNull(),
  mediaKey: varchar("mediaKey", { length: 512 }).notNull(),
  caption: text("caption"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ feedIdx: index("community_posts_feed_idx").on(table.kind, table.createdAt), userIdx: index("community_posts_user_idx").on(table.userId, table.createdAt) }));

export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = typeof communityPosts.$inferInsert;

export const communityPostLikes = mysqlTable("communityPostLikes", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull().references(() => communityPosts.id),
  userId: int("userId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ uniqueLike: uniqueIndex("community_post_like_unique").on(table.postId, table.userId), postIdx: index("community_post_likes_post_idx").on(table.postId) }));

export const communityComments = mysqlTable("communityComments", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull().references(() => communityPosts.id),
  userId: int("userId").notNull().references(() => users.id),
  body: varchar("body", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ postIdx: index("community_comments_post_idx").on(table.postId, table.createdAt) }));

export type CommunityComment = typeof communityComments.$inferSelect;

export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  createdBy: int("createdBy").notNull().references(() => users.id),
  title: varchar("title", { length: 120 }).notNull(),
  message: text("message").notNull(),
  ctaLabel: varchar("ctaLabel", { length: 40 }).notNull().default("Learn more"),
  targetView: varchar("targetView", { length: 80 }).notNull().default("Community"),
  tone: mysqlEnum("tone", ["green", "amber", "blue"]).notNull().default("green"),
  status: mysqlEnum("status", ["draft", "published", "archived"]).notNull().default("draft"),
  targetCrop: varchar("targetCrop", { length: 80 }),
  targetLocation: varchar("targetLocation", { length: 160 }),
  publishAt: timestamp("publishAt").notNull(),
  expireAt: timestamp("expireAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ statusIdx: index("announcements_status_idx").on(table.status, table.publishAt, table.expireAt), targetIdx: index("announcements_target_idx").on(table.targetCrop, table.targetLocation) }));

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = typeof announcements.$inferInsert;

export const announcementTranslations = mysqlTable("announcementTranslations", {
  id: int("id").autoincrement().primaryKey(),
  announcementId: int("announcementId").notNull().references(() => announcements.id, { onDelete: "cascade" }),
  language: mysqlEnum("language", ["Kannada", "Hindi"]).notNull(),
  title: varchar("title", { length: 120 }).notNull(),
  message: text("message").notNull(),
  ctaLabel: varchar("ctaLabel", { length: 40 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ uniqueLanguage: uniqueIndex("announcement_translation_unique").on(table.announcementId, table.language), announcementIdx: index("announcement_translation_announcement_idx").on(table.announcementId) }));

export type AnnouncementTranslation = typeof announcementTranslations.$inferSelect;
export type InsertAnnouncementTranslation = typeof announcementTranslations.$inferInsert;

export const announcementEvents = mysqlTable("announcementEvents", {
  id: int("id").autoincrement().primaryKey(),
  announcementId: int("announcementId").notNull().references(() => announcements.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id),
  eventType: mysqlEnum("eventType", ["view", "cta_click"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ announcementEventIdx: index("announcement_events_announcement_idx").on(table.announcementId, table.eventType, table.createdAt), userEventIdx: index("announcement_events_user_idx").on(table.userId, table.createdAt) }));

export type AnnouncementEvent = typeof announcementEvents.$inferSelect;
export type InsertAnnouncementEvent = typeof announcementEvents.$inferInsert;
