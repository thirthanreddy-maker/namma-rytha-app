import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import { addCommunityComment, addSensorReading, createAgronomistReviewRequest, createAnnouncement, createCommunityPost, createCropDiagnosisHistory, createNotificationDeliveryLog, createSignInHistory, createUserExpense, createUserPlot, createUserSale, createUserTask, deleteAnnouncement, getAdminSummary, getAgronomistReviewRequests, getAllAnnouncements, getAnnouncementAnalytics, getCommunityComments, getCommunityFeed, getCommunityPost, getCropDiagnosisHistory, getFinanceSummary, getLatestSensorReadings, getPublishedAnnouncements, getUserByOpenId, getUserExpenses, getUserNotificationDeliveryLog, getUserNotificationDeliveryLogs, getUserPlots, getUserSales, getUserSignInHistory, getUserTasks, markAgronomistReviewRead, recordAnnouncementEvent, setTaskStatus, toggleCommunityLike, updateAnnouncement, updateAnnouncementStatus, updateUserAvatar, updateUserProfile, upsertNormalUser, upsertPhoneUser } from "./db";
import { checkPhoneOtp, normalizePhone, sendPhoneOtp } from "./phoneOtp";
import { sdk } from "./_core/sdk";
import { getOtpLimiter } from "./redis";
import { parse as parseCookieHeader } from "cookie";
import { createCropCycle, getUserCropCycles, setCropCycleSchedule, updateUserNotificationPreferences } from "./db";
import { createHeartbeatJob } from "./_core/heartbeat";
import { sendFarmerAlert } from "./notifications";
import { getMarketPrices } from "./market";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access is required." });
  return next();
});

const diagnosisSchema = {
  name: "crop_diagnosis",
  strict: true,
  schema: {
    type: "object",
    properties: {
      likelyCondition: { type: "string" },
      category: { type: "string", enum: ["disease", "pest", "nutrient_deficiency", "healthy", "unknown"] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      severity: { type: "string", enum: ["low", "moderate", "high", "unknown"] },
      explanation: { type: "string" },
      immediateActions: { type: "array", items: { type: "string" } },
      preventionSteps: { type: "array", items: { type: "string" } },
      needsAgronomist: { type: "boolean" },
      safetyNote: { type: "string" },
    },
    required: ["likelyCondition", "category", "confidence", "severity", "explanation", "immediateActions", "preventionSteps", "needsAgronomist", "safetyNote"],
    additionalProperties: false,
  },
} as const;

const cropDiagnosisInput = z.object({
  imageDataUrl: z.string().regex(/^data:image\/(jpeg|jpg|png|webp);base64,/, "Only JPEG, PNG, or WebP images are supported"),
  crop: z.string().min(1).max(80),
  plotName: z.string().min(1).max(120).default("Plot A · Tomato"),
  symptoms: z.string().max(800).optional(),
  language: z.enum(["English", "Kannada", "Hindi", "Telugu", "Tamil"]).default("English"),
});

export const appRouter = router({
  system: systemRouter,
  admin: router({
    summary: adminProcedure.query(() => getAdminSummary()),
  }),
  weather: router({
    current: protectedProcedure.input(z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })).query(async ({ input }) => {
      const fallback = { temperature: 28, rainProbability: 40, windSpeed: 12, weatherCode: 2, hourly: [], source: "fallback" as const, fetchedAt: new Date().toISOString() };
      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.search = new URLSearchParams({ latitude: String(input.lat), longitude: String(input.lng), current: "temperature_2m,precipitation,weather_code,wind_speed_10m", hourly: "temperature_2m,precipitation_probability,precipitation,weather_code", forecast_days: "2", timezone: "auto" }).toString();
        const response = await fetch(url);
        if (!response.ok) return fallback;
        const payload = await response.json() as { current?: { temperature_2m?: number; wind_speed_10m?: number; weather_code?: number }; hourly?: { time?: string[]; temperature_2m?: number[]; precipitation_probability?: number[]; precipitation?: number[]; weather_code?: number[] } };
        const current = payload.current;
        const hourly = payload.hourly;
        if (!current || !hourly?.time) return fallback;
        return {
          temperature: Math.round(current.temperature_2m ?? fallback.temperature),
          rainProbability: hourly.precipitation_probability?.[0] ?? fallback.rainProbability,
          windSpeed: Math.round(current.wind_speed_10m ?? fallback.windSpeed),
          weatherCode: current.weather_code ?? fallback.weatherCode,
          hourly: hourly.time.slice(0, 6).map((time, index) => ({ time, temperature: Math.round(hourly.temperature_2m?.[index] ?? fallback.temperature), rainProbability: hourly.precipitation_probability?.[index] ?? 0, precipitation: hourly.precipitation?.[index] ?? 0, weatherCode: hourly.weather_code?.[index] ?? 0 })),
          source: "live" as const,
          fetchedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.warn("[Weather] Live forecast unavailable", error);
        return fallback;
      }
    }),
  }),
  market: router({
    current: protectedProcedure.input(z.object({ commodity: z.string().trim().min(1).max(80).default("Tomato"), state: z.string().trim().max(80).optional(), district: z.string().trim().max(80).optional() })).query(({ input }) => getMarketPrices(input.commodity, input.state, input.district)),
  }),
  sensors: router({
    moistureHistory: protectedProcedure.input(z.object({ lat: z.number(), lng: z.number() })).query(async ({ input }) => {
      const fallback = { plots: { "Plot A · Tomato": { values: [58, 53, 55, 49, 46, 50, 46], moisture: 46 }, "Plot B · Ragi": { values: [62, 60, 57, 55, 58, 56, 58], moisture: 58 } }, source: "saved sensor cache" as const, fetchedAt: new Date().toISOString() };
      const endpoint = process.env.IOT_MOISTURE_API_URL;
      if (!endpoint) return fallback;
      try {
        const url = new URL(endpoint);
        url.search = new URLSearchParams({ latitude: String(input.lat), longitude: String(input.lng), days: "7" }).toString();
        const response = await fetch(url);
        if (!response.ok) return fallback;
        const payload = await response.json() as typeof fallback;
        if (!payload?.plots) return fallback;
        return { ...payload, source: "live IoT sensors" as const, fetchedAt: new Date().toISOString() };
      } catch (error) {
        console.warn("[Sensors] Live moisture history unavailable", error);
        return fallback;
      }
    }),
    readings: protectedProcedure.query(({ ctx }) => getLatestSensorReadings(ctx.user.id)),
    ingest: protectedProcedure.input(z.object({ plotId: z.number().int().positive(), moisture: z.number().int().min(0).max(100), temperature: z.number().int().min(-30).max(70), humidity: z.number().int().min(0).max(100), battery: z.number().int().min(0).max(100).default(100), source: z.enum(["sensor", "simulated"]).default("simulated") })).mutation(async ({ ctx, input }) => {
      const reading = await addSensorReading(ctx.user.id, input);
      if (!reading) throw new TRPCError({ code: "NOT_FOUND", message: "Plot not found or sensor reading could not be saved." });
      return reading;
    }),
  }),
  farm: router({
    plots: router({
      list: protectedProcedure.query(({ ctx }) => getUserPlots(ctx.user.id)),
      create: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(120), crop: z.string().trim().min(1).max(80), areaAcres: z.number().int().min(1).max(1000).default(1), soilType: z.string().trim().min(1).max(80).default("Loamy"), growthStage: z.string().trim().min(1).max(80).default("Seedling"), latitude: z.string().max(32).optional(), longitude: z.string().max(32).optional() })).mutation(async ({ ctx, input }) => { const plot = await createUserPlot(ctx.user.id, input); if (!plot) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Plot could not be created." }); return plot; }),
    }),
    irrigation: router({
      recommendation: protectedProcedure.input(z.object({ soilMoisture: z.number().min(0).max(100), threshold: z.number().min(0).max(100), rainProbability: z.number().min(0).max(100) })).query(({ input }) => { if (input.soilMoisture < input.threshold && input.rainProbability < 50) return { tone: "amber" as const, status: "IRRIGATE SOON", title: "Irrigate within 4 hours", detail: `Moisture is ${input.soilMoisture}%, below the ${input.threshold}% threshold. Run a short cycle and recheck tomorrow.` }; if (input.soilMoisture < input.threshold) return { tone: "blue" as const, status: "WAIT FOR RAIN", title: "Hold irrigation for now", detail: `${input.rainProbability}% rain is expected. Reassess after the forecast window.` }; return { tone: "green" as const, status: "MOISTURE OK", title: "No irrigation needed yet", detail: "The plot is within its target range. Keep monitoring before the next watering decision." }; }),
    }),
    cycles: router({
      list: protectedProcedure.query(({ ctx }) => getUserCropCycles(ctx.user.id)),
      create: protectedProcedure.input(z.object({ plotId: z.number().int().positive(), crop: z.string().trim().min(1).max(80), sowingDate: z.coerce.date(), expectedHarvestDate: z.coerce.date() })).mutation(async ({ ctx, input }) => { if (input.expectedHarvestDate <= input.sowingDate) throw new TRPCError({ code: "BAD_REQUEST", message: "Expected harvest must be after sowing date." }); const id = await createCropCycle(ctx.user.id, input); if (!id) throw new TRPCError({ code: "NOT_FOUND", message: "Plot not found or crop cycle could not be created." }); return { id }; }),
      scheduleIrrigation: protectedProcedure.input(z.object({ id: z.number().int().positive(), cron: z.string().regex(/^\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+$/, "Use a six-field UTC cron expression.") })).mutation(async ({ ctx, input }) => { const sessionToken = parseCookieHeader(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? ""; if (!sessionToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "A browser session is required to create a schedule." }); const job = await createHeartbeatJob({ name: `irrigation-${ctx.user.id}-${input.id}`, cron: input.cron, path: "/api/scheduled/irrigation-alert", description: "Namma Rytha irrigation alert" }, sessionToken); const saved = await setCropCycleSchedule(ctx.user.id, input.id, job.taskUid); if (!saved) throw new TRPCError({ code: "NOT_FOUND", message: "Crop cycle not found." }); return job; }),
    }),
    notifications: router({
      preferences: protectedProcedure.input(z.object({ phoneNumber: z.string().regex(/^\+[1-9]\d{7,14}$/).nullable(), notificationChannel: z.enum(["in_app", "sms", "whatsapp"]) })).mutation(async ({ ctx, input }) => { const updated = await updateUserNotificationPreferences(ctx.user.id, input.phoneNumber, input.notificationChannel); if (!updated) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Notification preferences could not be saved." }); return { success: true as const }; }),
      test: protectedProcedure.input(z.object({ channel: z.enum(["sms", "whatsapp"]), phoneNumber: z.string().regex(/^\+[1-9]\d{7,14}$/) })).mutation(async ({ ctx, input }) => { try { const result = await sendFarmerAlert(input.channel, input.phoneNumber, "Namma Rytha test alert: your notification channel is connected."); await createNotificationDeliveryLog({ userId: ctx.user.id, channel: input.channel, status: result.delivered ? "delivered" : "failed", recipient: input.phoneNumber, message: result.message }); return result; } catch (error) { await createNotificationDeliveryLog({ userId: ctx.user.id, channel: input.channel, status: "failed", recipient: input.phoneNumber, message: "Delivery request failed." }); throw error; } }),
    }),
    planning: router({
      tasks: protectedProcedure.query(({ ctx }) => getUserTasks(ctx.user.id)),
      createTask: protectedProcedure.input(z.object({ plotId: z.number().int().positive().optional(), title: z.string().trim().min(1).max(160), detail: z.string().max(1000).optional(), dueDate: z.coerce.date() })).mutation(async ({ ctx, input }) => { const task = await createUserTask(ctx.user.id, input); if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Plot not found or task could not be created." }); return task; }),
      completeTask: protectedProcedure.input(z.object({ id: z.number().int().positive(), completed: z.boolean() })).mutation(async ({ ctx, input }) => { const updated = await setTaskStatus(ctx.user.id, input.id, input.completed); if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found." }); return { success: true as const }; }),
    }),
    finance: router({
      expenses: protectedProcedure.query(({ ctx }) => getUserExpenses(ctx.user.id)),
      sales: protectedProcedure.query(({ ctx }) => getUserSales(ctx.user.id)),
      summary: protectedProcedure.query(({ ctx }) => getFinanceSummary(ctx.user.id)),
      addExpense: protectedProcedure.input(z.object({ plotId: z.number().int().positive().optional(), category: z.string().trim().min(1).max(80), label: z.string().trim().min(1).max(160), amount: z.number().int().positive().max(100000000) })).mutation(async ({ ctx, input }) => { const expense = await createUserExpense(ctx.user.id, input); if (!expense) throw new TRPCError({ code: "NOT_FOUND", message: "Plot not found or expense could not be saved." }); return expense; }),
      addSale: protectedProcedure.input(z.object({ plotId: z.number().int().positive().optional(), crop: z.string().trim().min(1).max(80), quantityKg: z.number().int().positive().max(1000000), pricePerQuintal: z.number().int().positive().max(1000000), totalAmount: z.number().int().positive().max(100000000) })).mutation(async ({ ctx, input }) => { const sale = await createUserSale(ctx.user.id, input); if (!sale) throw new TRPCError({ code: "NOT_FOUND", message: "Plot not found or sale could not be saved." }); return sale; }),
    }),
  }),
  announcements: router({
    feed: protectedProcedure.query(({ ctx }) => getPublishedAnnouncements(ctx.user.id)),
    adminList: adminProcedure.query(() => getAllAnnouncements()),
    analytics: adminProcedure.input(z.object({ startDate: z.coerce.date().optional(), endDate: z.coerce.date().optional(), crop: z.string().trim().max(80).optional(), location: z.string().trim().max(160).optional() }).superRefine((input, ctx) => { if (input.startDate && input.endDate && input.endDate <= input.startDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after start date." }); })).query(({ input }) => getAnnouncementAnalytics(input)),
    create: adminProcedure.input(z.object({ title: z.string().trim().min(3).max(120), message: z.string().trim().min(3).max(1000), ctaLabel: z.string().trim().min(1).max(40).default("Learn more"), targetView: z.string().trim().min(1).max(80).default("Community"), tone: z.enum(["green", "amber", "blue"]).default("green"), status: z.enum(["draft", "published"]).default("draft"), targetCrop: z.string().trim().max(80).nullable().optional(), targetLocation: z.string().trim().max(160).nullable().optional(), publishAt: z.coerce.date(), expireAt: z.coerce.date().nullable().optional(), translations: z.array(z.object({ language: z.enum(["Kannada", "Hindi"]), title: z.string().trim().min(3).max(120), message: z.string().trim().min(3).max(1000), ctaLabel: z.string().trim().min(1).max(40) })).max(2).default([]) }).superRefine((input, ctx) => { if (input.expireAt && input.expireAt <= input.publishAt) ctx.addIssue({ code: "custom", path: ["expireAt"], message: "Expiry must be after publish date." }); })).mutation(async ({ ctx, input }) => { const { translations, ...announcementInput } = input; const announcement = await createAnnouncement({ ...announcementInput, createdBy: ctx.user.id, targetCrop: input.targetCrop || null, targetLocation: input.targetLocation || null, expireAt: input.expireAt || null }, translations); if (!announcement) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Announcement could not be saved." }); return announcement; }),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().trim().min(3).max(120), message: z.string().trim().min(3).max(1000), ctaLabel: z.string().trim().min(1).max(40), targetView: z.string().trim().min(1).max(80), tone: z.enum(["green", "amber", "blue"]), status: z.enum(["draft", "published", "archived"]), targetCrop: z.string().trim().max(80).nullable().optional(), targetLocation: z.string().trim().max(160).nullable().optional(), publishAt: z.coerce.date(), expireAt: z.coerce.date().nullable().optional(), translations: z.array(z.object({ language: z.enum(["Kannada", "Hindi"]), title: z.string().trim().min(3).max(120), message: z.string().trim().min(3).max(1000), ctaLabel: z.string().trim().min(1).max(40) })).max(2).default([]) }).superRefine((input, ctx) => { if (input.expireAt && input.expireAt <= input.publishAt) ctx.addIssue({ code: "custom", path: ["expireAt"], message: "Expiry must be after publish date." }); })).mutation(async ({ input }) => { const { id, translations, ...announcementInput } = input; const announcement = await updateAnnouncement(id, { ...announcementInput, targetCrop: input.targetCrop || null, targetLocation: input.targetLocation || null, expireAt: input.expireAt || null }, translations); if (!announcement) throw new TRPCError({ code: "NOT_FOUND", message: "Announcement not found." }); return announcement; }),
    event: protectedProcedure.input(z.object({ id: z.number().int().positive(), eventType: z.enum(["view", "cta_click"]) })).mutation(async ({ ctx, input }) => { if (!(await recordAnnouncementEvent(ctx.user.id, input.id, input.eventType))) throw new TRPCError({ code: "NOT_FOUND", message: "Announcement not found." }); return { success: true as const }; }),
    setStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["draft", "published", "archived"]) })).mutation(async ({ input }) => { const announcement = await updateAnnouncementStatus(input.id, input.status); if (!announcement) throw new TRPCError({ code: "NOT_FOUND", message: "Announcement not found." }); return announcement; }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { if (!(await deleteAnnouncement(input.id))) throw new TRPCError({ code: "NOT_FOUND", message: "Announcement not found." }); return { success: true as const }; }),
  }),
  community: router({
    feed: protectedProcedure.input(z.object({ kind: z.enum(["post", "reel"]).optional() }).optional()).query(({ ctx, input }) => getCommunityFeed(ctx.user.id, input?.kind)),
    create: protectedProcedure.input(z.object({ kind: z.enum(["post", "reel"]), mediaType: z.enum(["image", "video"]), mediaDataUrl: z.string().min(32).max(18_000_000), caption: z.string().trim().max(1000).optional() })).mutation(async ({ ctx, input }) => {
      if (input.kind === "post" && input.mediaType !== "image") throw new TRPCError({ code: "BAD_REQUEST", message: "Photo posts must use an image." });
      if (input.kind === "reel" && input.mediaType !== "video") throw new TRPCError({ code: "BAD_REQUEST", message: "Reels must use a video." });
      const match = input.mediaDataUrl.match(/^data:(image\/(?:png|jpeg|webp)|video\/(?:mp4|webm|quicktime));base64,(.+)$/);
      if (!match?.[1] || !match[2]) throw new TRPCError({ code: "BAD_REQUEST", message: "Upload a supported image or video file." });
      if ((input.mediaType === "image" && !match[1].startsWith("image/")) || (input.mediaType === "video" && !match[1].startsWith("video/"))) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected media type does not match the uploaded file." });
      const extension = match[1].split("/")[1].replace("quicktime", "mov");
      const stored = await storagePut(`community/${ctx.user.id}/${Date.now()}.${extension}`, Buffer.from(match[2], "base64"), match[1]);
      const post = await createCommunityPost({ userId: ctx.user.id, kind: input.kind, mediaType: input.mediaType, mediaUrl: stored.url, mediaKey: stored.key, caption: input.caption?.trim() || null });
      if (!post) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The community post could not be saved." });
      return post;
    }),
    like: protectedProcedure.input(z.object({ postId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (!(await getCommunityPost(input.postId))) throw new TRPCError({ code: "NOT_FOUND", message: "Community post not found." });
      return toggleCommunityLike(ctx.user.id, input.postId);
    }),
    comments: protectedProcedure.input(z.object({ postId: z.number().int().positive() })).query(async ({ input }) => getCommunityComments(input.postId)),
    comment: protectedProcedure.input(z.object({ postId: z.number().int().positive(), body: z.string().trim().min(1).max(500) })).mutation(async ({ ctx, input }) => {
      if (!(await getCommunityPost(input.postId))) throw new TRPCError({ code: "NOT_FOUND", message: "Community post not found." });
      const comment = await addCommunityComment(ctx.user.id, input.postId, input.body);
      if (!comment) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "The comment could not be saved." });
      return comment;
    }),
  }),
  assistant: router({
    ask: protectedProcedure.input(z.object({ question: z.string().min(1).max(800), language: z.enum(["English", "Kannada", "Hindi", "Telugu", "Tamil"]).default("English"), crop: z.string().max(80), stage: z.string().max(80), soilMoisture: z.number().min(0).max(100), threshold: z.number().min(0).max(100), recommendation: z.string().max(240), temperature: z.number(), rainProbability: z.number().min(0).max(100) })).mutation(async ({ input }) => {
      const response = await invokeLLM({
        model: "claude-haiku-4-5",
        messages: [
          { role: "system", content: `You are Namma Rytha, a careful agricultural assistant for smallholder farmers in India. Answer in ${input.language} using simple, practical language. Use the provided farm context. Do not invent sensor readings, weather data, or certainty. Do not prescribe restricted pesticide chemicals or exact doses. If a question needs field inspection or an agronomist, say so. Keep answers under 120 words.` },
          { role: "user", content: `Farmer question: ${input.question}\nFarm context: ${input.crop}, ${input.stage}; soil moisture ${input.soilMoisture}%; configured irrigation threshold ${input.threshold}%; current recommendation: ${input.recommendation}; temperature ${input.temperature}°C; rain probability ${input.rainProbability}%.` },
        ],
        max_tokens: 500,
      });
      const raw = response.choices[0]?.message?.content;
      return { answer: typeof raw === "string" ? raw : "I could not prepare an answer right now. Please review the recommendation and contact an agronomist if you are unsure." };
    }),
    escalate: protectedProcedure.input(z.object({ question: z.string().min(1).max(800), crop: z.string().max(80), language: z.string().max(30), imageDataUrl: z.string().regex(/^data:image\/(jpeg|jpg|png|webp);base64,/, "Only JPEG, PNG, or WebP images are supported").optional() })).mutation(async ({ ctx, input }) => {
      let imageKey = `assistant-query/${ctx.user.id}/${Date.now()}`;
      if (input.imageDataUrl) {
        const [, encodedImage] = input.imageDataUrl.split(",", 2);
        if (!encodedImage || encodedImage.length > 11_000_000) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Please choose an image smaller than 8 MB." });
        const mime = input.imageDataUrl.slice(5, input.imageDataUrl.indexOf(";"));
        const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
        const stored = await storagePut(`agronomist-requests/${ctx.user.id}/${Date.now()}.${extension}`, Buffer.from(encodedImage, "base64"), mime);
        imageKey = stored.key;
      }
      const result = await createAgronomistReviewRequest({ userId: ctx.user.id, imageKey, crop: input.crop, farmerNote: `Chatbot escalation (${input.language}): ${input.question}`, status: "requested" });
      if (!result) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Agronomist requests are temporarily unavailable. Please try again." });
      return { success: true as const, message: "Your question has been sent to an agronomist. The team will follow up soon." };
    }),
    inbox: protectedProcedure.query(({ ctx }) => getAgronomistReviewRequests(ctx.user.id)),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => markAgronomistReviewRead(ctx.user.id, input.id)),
    transcribeAudio: protectedProcedure.input(z.object({ audioDataUrl: z.string().regex(/^data:audio\/(webm|ogg|wav|mpeg|mp4);base64,/, "Unsupported audio format"), language: z.enum(["English", "Kannada", "Hindi", "Telugu", "Tamil"]).default("English") })).mutation(async ({ ctx, input }) => {
      const [, encodedAudio] = input.audioDataUrl.split(",", 2);
      if (!encodedAudio || encodedAudio.length > 22_000_000) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Please keep the voice note under 16 MB." });
      const mime = input.audioDataUrl.slice(5, input.audioDataUrl.indexOf(";"));
      const stored = await storagePut(`voice-notes/${ctx.user.id}/${Date.now()}.webm`, Buffer.from(encodedAudio, "base64"), mime);
      const languageCode: Record<string, string> = { English: "en", Kannada: "kn", Hindi: "hi", Telugu: "te", Tamil: "ta" };
      const result = await transcribeAudio({ audioUrl: stored.url, language: languageCode[input.language], prompt: "Farmer question about crops, irrigation, soil moisture, or weather." });
      return { text: "text" in result ? result.text ?? "" : "" };
    }),
  }),
    auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    profile: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(120), farmLocation: z.string().trim().min(2).max(160), preferredLanguage: z.enum(["English", "Kannada", "Hindi", "Telugu", "Tamil"]) })).mutation(async ({ ctx, input }) => { const user = await updateUserProfile(ctx.user.id, input); if (!user) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Your profile could not be saved right now." }); return user; }),
    avatar: protectedProcedure.input(z.object({ imageDataUrl: z.string().max(7_000_000) })).mutation(async ({ ctx, input }) => { const match = input.imageDataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/); if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Please upload a PNG, JPEG, or WebP image." }); const buffer = Buffer.from(match[2], "base64"); if (buffer.length > 5_000_000) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Please keep your profile photo under 5 MB." }); const extension = match[1] === "image/jpeg" ? "jpg" : match[1].slice("image/".length); const stored = await storagePut(`avatars/${ctx.user.id}/${Date.now()}.${extension}`, buffer, match[1]); const user = await updateUserAvatar(ctx.user.id, stored.url); if (!user) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Your profile photo could not be saved right now." }); return user; }),
    alertHistory: protectedProcedure.query(({ ctx }) => getUserNotificationDeliveryLogs(ctx.user.id)),
    signInHistory: protectedProcedure.query(({ ctx }) => getUserSignInHistory(ctx.user.id)),
    alertRetry: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const log = await getUserNotificationDeliveryLog(ctx.user.id, input.id); if (!log) throw new TRPCError({ code: "NOT_FOUND", message: "Alert record not found." }); if (log.status !== "failed") throw new TRPCError({ code: "BAD_REQUEST", message: "Only failed alerts can be retried." }); try { const result = await sendFarmerAlert(log.channel, log.recipient, log.message); await createNotificationDeliveryLog({ userId: ctx.user.id, channel: log.channel, status: result.delivered ? "delivered" : "failed", recipient: log.recipient, message: result.message }); return result; } catch (error) { await createNotificationDeliveryLog({ userId: ctx.user.id, channel: log.channel, status: "failed", recipient: log.recipient, message: "Retry request failed." }); throw error; } }),
    login: publicProcedure.input(z.object({
      identifier: z.string().trim().min(2).max(100),
      password: z.string().min(4).max(100),
      name: z.string().trim().max(100).optional(),
    })).mutation(async ({ ctx, input }) => {
      try {
        const displayName = input.name?.trim() || input.identifier.split("@")[0] || "Farmer";
        const user = await upsertNormalUser(input.identifier, displayName);
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name, expiresInMs: ONE_YEAR_MS });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        const signedInUser = await getUserByOpenId(user.openId);
        if (signedInUser) await createSignInHistory(signedInUser.id, "Standard Login");
        return { success: true as const, name: user.name };
      } catch (error) {
        console.error("[Auth] Login error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Sign-in failed. Please try again." });
      }
    }),
    demoLogin: publicProcedure.mutation(async ({ ctx }) => {
      try {
        const demoUser = await upsertNormalUser("demo-farmer", "Demo Farmer");
        const sessionToken = await sdk.createSessionToken(demoUser.openId, { name: demoUser.name, expiresInMs: ONE_YEAR_MS });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        try {
          const signedInUser = await getUserByOpenId(demoUser.openId);
          if (signedInUser) await createSignInHistory(signedInUser.id, "Demo Access");
        } catch {}
        return { success: true as const, name: demoUser.name };
      } catch (error) {
        console.error("[Auth] Demo login error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Demo access failed: " + (error instanceof Error ? error.message : String(error)) });
      }
    }),
    phoneOtpSend: publicProcedure.input(z.object({ phone: z.string().min(8).max(20) })).mutation(async ({ input }) => {
      const phone = normalizePhone(input.phone);
      try {
        const limiter = await getOtpLimiter();
        if (!(await limiter.claimSendCooldown(phone))) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please wait a minute before requesting another code." });
        }
        await sendPhoneOtp(phone);
        return { success: true as const, phoneMasked: `${phone.slice(0, 3)}••••${phone.slice(-2)}` };
      } catch (error) {
        console.error("[PhoneOTP] Send failed", error);
        throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: error instanceof Error ? error.message : "SMS verification is temporarily unavailable." });
      }
    }),
    phoneOtpVerify: publicProcedure.input(z.object({ phone: z.string().min(8).max(20), code: z.string().regex(/^\d{6}$/) })).mutation(async ({ ctx, input }) => {
      const phone = normalizePhone(input.phone);
      try {
        const limiter = await getOtpLimiter();
        const attempt = await limiter.consumeVerificationAttempt(phone);
        if (!attempt.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many incorrect attempts or the verification window expired. Request a new code." });
        const result = await checkPhoneOtp(phone, input.code);
        if (result.status !== "approved" || result.valid !== true) throw new TRPCError({ code: "UNAUTHORIZED", message: "That code is not correct. Please try again." });
        await limiter.clear(phone);
        const user = await upsertPhoneUser(phone);
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name, expiresInMs: ONE_YEAR_MS });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        const signedInUser = await getUserByOpenId(user.openId);
        if (signedInUser) await createSignInHistory(signedInUser.id, "Phone OTP");
        return { success: true as const };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[PhoneOTP] Verify failed", error);
        throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "We could not verify that code right now. Please try again." });
      }
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  crop: router({
    history: protectedProcedure.input(z.object({ plotName: z.string().max(120).optional() }).optional()).query(({ ctx, input }) => getCropDiagnosisHistory(ctx.user.id, input?.plotName)),
    diagnose: protectedProcedure.input(cropDiagnosisInput).mutation(async ({ ctx, input }) => {
      const [, encodedImage] = input.imageDataUrl.split(",", 2);
      if (!encodedImage || encodedImage.length > 11_000_000) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Please choose an image smaller than 8 MB." });
      }

      const mime = input.imageDataUrl.slice(5, input.imageDataUrl.indexOf(";"));
      const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const stored = await storagePut(`crop-diagnosis/${ctx.user.id}/${Date.now()}.${extension}`, Buffer.from(encodedImage, "base64"), mime);

      try {
        const response = await invokeLLM({
          model: "gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are an agricultural crop-health assistant for smallholder farmers in India. Analyze the crop photo conservatively. Do not claim certainty from one image. Never recommend restricted or exact pesticide chemical doses. Prefer inspection, sanitation, cultural practices, integrated pest management, label compliance, and agronomist escalation. Return all explanation and actions in ${input.language}. If the image is unclear, unrelated, or insufficient, use category unknown, confidence below 0.5, and needsAgronomist true.`,
            },
            {
              role: "user",
              content: [
                { type: "text", text: `Crop: ${input.crop}. Farmer-reported symptoms: ${input.symptoms || "none provided"}. Give a likely first assessment from the image.` },
                { type: "image_url", image_url: { url: input.imageDataUrl, detail: "auto" } },
              ],
            },
          ],
          response_format: { type: "json_schema", json_schema: diagnosisSchema },
          max_tokens: 1200,
        });

        const raw = response.choices[0]?.message?.content;
        const content = typeof raw === "string" ? raw : JSON.stringify(raw);
        const diagnosis = JSON.parse(content) as z.infer<typeof diagnosisSchemaInput>;
        const historySaved = await createCropDiagnosisHistory({
          userId: ctx.user.id,
          plotName: input.plotName,
          crop: input.crop,
          imageKey: stored.key,
          likelyCondition: diagnosis.likelyCondition,
          category: diagnosis.category,
          confidence: Math.round(diagnosis.confidence * 100),
          severity: diagnosis.severity,
          explanation: diagnosis.explanation,
          needsAgronomist: diagnosis.needsAgronomist ? 1 : 0,
        });
        if (!historySaved) throw new Error("Diagnosis history could not be saved");
        return {
          ...diagnosis,
          imageUrl: stored.url,
          imageKey: stored.key,
          plotName: input.plotName,
          crop: input.crop,
          reviewedBy: diagnosis.needsAgronomist || diagnosis.confidence < 0.7 ? "Agronomist review recommended" : "AI first check",
          disclaimer: "This is decision support, not a confirmed diagnosis. Confirm high-risk cases with a qualified agronomist and follow local product labels.",
        };
      } catch (error) {
        console.error("[CropDiagnosis] AI analysis failed", error);
        throw new TRPCError({ code: "BAD_GATEWAY", message: "The crop image was saved, but diagnosis is temporarily unavailable. Please retry or ask an agronomist." });
      }
    }),
    requestReview: protectedProcedure.input(z.object({
      imageKey: z.string().min(1).max(512),
      crop: z.string().min(1).max(80),
      aiCondition: z.string().max(255).optional(),
      aiConfidence: z.number().min(0).max(1).optional(),
      farmerNote: z.string().max(800).optional(),
    })).mutation(async ({ ctx, input }) => {
      const ownedImagePrefixes = [
        `crop-diagnosis/${ctx.user.id}/`,
        `agronomist-requests/${ctx.user.id}/`,
      ];
      if (!ownedImagePrefixes.some(prefix => input.imageKey.startsWith(prefix))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only submit images from your own crop history." });
      }
      const result = await createAgronomistReviewRequest({
        userId: ctx.user.id,
        imageKey: input.imageKey,
        crop: input.crop,
        aiCondition: input.aiCondition,
        aiConfidence: input.aiConfidence === undefined ? undefined : Math.round(input.aiConfidence * 100),
        farmerNote: input.farmerNote,
        status: "requested",
      });
      if (!result) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Review requests are temporarily unavailable. Please try again." });
      return { success: true as const, message: "Your crop photo has been sent to an agronomist for manual review." };
    }),
  }),
});

type DiagnosisSchema = typeof diagnosisSchema.schema;
// The schema is intentionally kept in one place so the runtime response and client contract stay aligned.
type DiagnosisResult = {
  likelyCondition: string;
  category: "disease" | "pest" | "nutrient_deficiency" | "healthy" | "unknown";
  confidence: number;
  severity: "low" | "moderate" | "high" | "unknown";
  explanation: string;
  immediateActions: string[];
  preventionSteps: string[];
  needsAgronomist: boolean;
  safetyNote: string;
};
const diagnosisSchemaInput = z.object({
  likelyCondition: z.string(), category: z.enum(["disease", "pest", "nutrient_deficiency", "healthy", "unknown"]), confidence: z.number(), severity: z.enum(["low", "moderate", "high", "unknown"]), explanation: z.string(), immediateActions: z.array(z.string()), preventionSteps: z.array(z.string()), needsAgronomist: z.boolean(), safetyNote: z.string(),
});
export type AppRouter = typeof appRouter;
