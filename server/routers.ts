import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import { addCommunityComment, addSensorReading, createAgronomistReviewRequest, createAnnouncement, createCommunityPost, createCropDiagnosisHistory, createNotificationDeliveryLog, createSignInHistory, createUserExpense, createUserPlot, createUserSale, createUserTask, deleteAnnouncement, getAdminSummary, getAgronomistReviewRequests, getAllAnnouncements, getAnnouncementAnalytics, getCommunityComments, getCommunityFeed, getCommunityPost, getCropDiagnosisHistory, getFinanceSummary, getLatestSensorReadings, getPublishedAnnouncements, getUserByOpenId, getUserExpenses, getUserNotificationDeliveryLog, getUserNotificationDeliveryLogs, getUserPlots, getUserSales, getUserSignInHistory, getUserTasks, markAgronomistReviewRead, recordAnnouncementEvent, setTaskStatus, toggleCommunityLike, updateAnnouncement, updateAnnouncementStatus, updateUserAvatar, updateUserProfile, upsertNormalUser, upsertPhoneUser, createCropCycle, getUserCropCycles, setCropCycleSchedule, updateUserNotificationPreferences } from "./db";
import { checkPhoneOtp, normalizePhone, sendPhoneOtp } from "./phoneOtp";
import { sdk } from "./_core/sdk";
import { getOtpLimiter } from "./redis";
import { parse as parseCookieHeader } from "cookie";
import { createHeartbeatJob } from "./_core/heartbeat";
import { sendFarmerAlert } from "./notifications";
import { getMarketPrices } from "./market";
import { fetchOpenMeteoForecast } from "./engines/weatherService";
import { generateAssistantReply, hasConfiguredLLM, runCropDiagnosisAI } from "./engines/aiEngine";
import { analyzeCropFailure, buildSatellitePlotInsights, compareCropsAndRecommendSwitch, computeDiseaseRiskForecast, computeWaterBudgetPlan, evaluateMandiOffer, runDigitalTwinSimulation } from "./engines/farmCalculators";
import { resolveCropProfile } from "./engines/agronomyData";
import { corroborateRegionalIntel, createRegionalIntelReport, createWasteInquiry, createWasteListing, listCropFailureAnalyses, listDigitalTwinScenarios, listRegionalIntelReports, listWasteExchange, listWaterUsageLogs, logWaterUsage, saveCropFailureAnalysis, saveDigitalTwinScenario, updateWasteListingStatus, verifyRegionalIntelByAdmin } from "./pgStore";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access is required." });
  return next();
});

const cropDiagnosisInput = z.object({
  imageDataUrl: z.string().regex(/^data:image\/(jpeg|jpg|png|webp);base64,/, "Only JPEG, PNG, or WebP images are supported"),
  crop: z.string().min(1).max(80),
  plotName: z.string().min(1).max(120).default("Plot A · Tomato"),
  symptoms: z.string().max(800).optional(),
  language: z.enum(["English", "Kannada", "Hindi", "Telugu", "Tamil"]).default("English"),
  visualHints: z.object({ greenPct: z.number(), yellowPct: z.number(), brownSpotPct: z.number() }).optional(),
});

export const appRouter = router({
  system: systemRouter,
  admin: router({
    summary: adminProcedure.query(() => getAdminSummary()),
  }),
  weather: router({
    current: protectedProcedure
      .input(z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }))
      .query(({ input }) => fetchOpenMeteoForecast(input.lat, input.lng)),
  }),
  market: router({
    current: protectedProcedure
      .input(z.object({ commodity: z.string().trim().min(1).max(80).default("Tomato"), state: z.string().trim().max(80).optional(), district: z.string().trim().max(80).optional() }))
      .query(({ input }) => getMarketPrices(input.commodity, input.state, input.district)),
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
      create: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(120), crop: z.string().trim().min(1).max(80), areaAcres: z.number().min(0.25).max(1000).default(1), soilType: z.string().trim().min(1).max(80).default("Loamy"), growthStage: z.string().trim().min(1).max(80).default("Seedling"), latitude: z.string().max(32).optional(), longitude: z.string().max(32).optional() })).mutation(async ({ ctx, input }) => { const plot = await createUserPlot(ctx.user.id, { ...input, areaAcres: Math.round(input.areaAcres) }); if (!plot) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Plot could not be created." }); return plot; }),
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
    ask: protectedProcedure.input(z.object({ question: z.string().min(1).max(800), language: z.enum(["English", "Kannada", "Hindi", "Telugu", "Tamil"]).default("English"), crop: z.string().max(80), stage: z.string().max(80), soilMoisture: z.number().min(0).max(100), threshold: z.number().min(0).max(100), recommendation: z.string().max(240), temperature: z.number(), rainProbability: z.number().min(0).max(100) })).mutation(async ({ ctx, input }) => {
      return generateAssistantReply({ ...input, farmLocation: ctx.user.farmLocation ?? "Karnataka, India" });
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
    me: publicProcedure.query((opts) => opts.ctx.user),
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
      const diagnosis = await runCropDiagnosisAI(input);
      await createCropDiagnosisHistory({
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
      return {
        ...diagnosis,
        imageUrl: stored.url,
        imageKey: stored.key,
        plotName: input.plotName,
        crop: input.crop,
        reviewedBy: diagnosis.needsAgronomist || diagnosis.confidence < 0.7 ? "Agronomist review recommended" : "AI first check",
        disclaimer: diagnosis.providerMode === "live-llm"
          ? "AI screening is decision support, not a confirmed lab diagnosis. Confirm severe cases with a qualified agronomist."
          : "Local visual & symptom screening (demo mode — connect GEMINI_API_KEY for cloud vision AI). Not a confirmed diagnosis.",
      };
    }),
    requestReview: protectedProcedure.input(z.object({
      imageKey: z.string().min(1).max(512),
      crop: z.string().min(1).max(80),
      aiCondition: z.string().max(255).optional(),
      aiConfidence: z.number().min(0).max(1).optional(),
      farmerNote: z.string().max(800).optional(),
    })).mutation(async ({ ctx, input }) => {
      const ownedImagePrefixes = [`crop-diagnosis/${ctx.user.id}/`, `agronomist-requests/${ctx.user.id}/`];
      if (!ownedImagePrefixes.some((prefix) => input.imageKey.startsWith(prefix))) {
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
      if (!result) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Review requests are temporarily unavailable." });
      return { success: true as const, message: "Your crop photo has been sent to an agronomist for manual review." };
    }),
  }),

  // FEATURE 1: AI FARM DIGITAL TWIN
  digitalTwin: router({
    overview: protectedProcedure.input(z.object({ lat: z.number().default(13.135), lng: z.number().default(78.132) }).optional()).query(async ({ ctx, input }) => {
      const [plots, weather, readings, scenarios] = await Promise.all([
        getUserPlots(ctx.user.id),
        fetchOpenMeteoForecast(input?.lat ?? 13.135, input?.lng ?? 78.132),
        getLatestSensorReadings(ctx.user.id),
        listDigitalTwinScenarios(ctx.user.id),
      ]);
      const enrichedPlots = plots.map((plot, idx) => {
        const profile = resolveCropProfile(plot.crop);
        const reading = readings.find((r) => r.plotId === plot.id);
        const moisture = reading?.moisture ?? (idx === 0 ? 46 : 58);
        const stageKey = (Object.keys(profile.kcByStage).find((k) => k.toLowerCase() === plot.growthStage.toLowerCase()) ?? "Flowering") as keyof typeof profile.kcByStage;
        const kc = profile.kcByStage[stageKey] ?? 0.95;
        const acres = Math.max(0.5, Number(plot.areaAcres || 1));
        const dailyWaterLiters = Math.round((weather.et0DailyMm * kc * 4046.86 * acres) / 0.88);
        const estimatedProductionQ = Number((profile.baseYieldQuintalsPerAcre * acres).toFixed(1));
        const healthScore = Math.min(96, Math.max(52, Math.round(68 + (moisture > 40 && moisture < 75 ? 16 : -8))));
        return {
          ...plot,
          areaAcres: acres,
          moisturePct: moisture,
          temperatureC: reading?.temperature ?? weather.temperature,
          dailyWaterReqLiters: dailyWaterLiters,
          estimatedProductionQ,
          estimatedRevenueInr: Math.round(estimatedProductionQ * profile.benchmarkPricePerQuintal),
          healthScore,
          soilPh: plot.soilType.toLowerCase().includes("clay") ? 6.6 : 6.8,
          npkStatus: plot.crop === "Tomato" ? "N: Moderate · P: Good · K: High" : "N: Adequate · P: Good · K: Good",
          sensorSource: reading ? "sensor" : "modelled",
        };
      });
      return { plots: enrichedPlots, weather, scenarios };
    }),
    simulate: protectedProcedure.input(z.object({
      plotName: z.string().min(1).max(120),
      baseCrop: z.string().min(1).max(80),
      areaAcres: z.number().min(0.25).max(500),
      soilType: z.string().default("Loamy"),
      growthStage: z.string().default("Flowering"),
      soilMoisturePct: z.number().min(0).max(100).default(46),
      rainfallDeltaPct: z.number().min(-80).max(80),
      fertilizerCostDeltaPct: z.number().min(-30).max(150),
      switchToCrop: z.string().optional(),
      irrigationReductionPct: z.number().min(0).max(75),
      harvestDelayDays: z.number().int().min(0).max(21),
    })).mutation(({ input }) => runDigitalTwinSimulation(input)),
    saveScenario: protectedProcedure.input(z.object({
      plotName: z.string().min(1).max(120),
      baseCrop: z.string().min(1).max(80),
      scenarioName: z.string().trim().min(2).max(120),
      params: z.record(z.string(), z.unknown()),
      results: z.record(z.string(), z.unknown()),
    })).mutation(({ ctx, input }) => saveDigitalTwinScenario(ctx.user.id, input.plotName, input.baseCrop, input.scenarioName, input.params, input.results)),
  }),

  // FEATURE 2: PREDICTIVE DISEASE RISK RADAR
  disease: router({
    forecastRisk: protectedProcedure.input(z.object({ crop: z.string().min(1).max(80), plotName: z.string().optional(), lat: z.number().default(13.135), lng: z.number().default(78.132) })).query(async ({ ctx, input }) => {
      const [weather, history] = await Promise.all([
        fetchOpenMeteoForecast(input.lat, input.lng),
        getCropDiagnosisHistory(ctx.user.id, input.plotName),
      ]);
      return computeDiseaseRiskForecast(input.crop, weather, history);
    }),
    aiStatus: protectedProcedure.query(() => ({ liveLlmConfigured: hasConfiguredLLM() })),
  }),

  // FEATURE 3: SMART IRRIGATION & WATER BUDGET PLANNER
  irrigationIntel: router({
    budgetPlan: protectedProcedure.input(z.object({
      availableDailyLiters: z.number().min(1000).max(5_000_000).default(42000),
      lat: z.number().default(13.135),
      lng: z.number().default(78.132),
    })).query(async ({ ctx, input }) => {
      const [plots, weather, readings, logs] = await Promise.all([
        getUserPlots(ctx.user.id),
        fetchOpenMeteoForecast(input.lat, input.lng),
        getLatestSensorReadings(ctx.user.id),
        listWaterUsageLogs(ctx.user.id),
      ]);
      const budgetPlots = plots.map((p, i) => ({
        plotName: p.name,
        crop: p.crop,
        areaAcres: Math.max(0.5, Number(p.areaAcres || 1)),
        growthStage: p.growthStage || "Flowering",
        soilMoisturePct: readings.find((r) => r.plotId === p.id)?.moisture ?? (i === 0 ? 46 : 58),
      }));
      const weekMs = 7 * 86400_000;
      const weeklyUsed = logs.filter((l) => Date.now() - new Date(l.loggedAt).getTime() <= weekMs).reduce((s, l) => s + l.litersUsed, 0);
      const plan = computeWaterBudgetPlan(input.availableDailyLiters, budgetPlots, weather, weeklyUsed);
      return { plan, weather, logs };
    }),
    logUsage: protectedProcedure.input(z.object({
      plotName: z.string().min(1).max(120),
      litersUsed: z.number().int().min(100).max(5_000_000),
      litersRecommended: z.number().int().min(0).max(5_000_000),
      method: z.enum(["drip", "sprinkler", "flood"]).default("drip"),
    })).mutation(({ ctx, input }) => logWaterUsage(ctx.user.id, input.plotName, input.litersUsed, input.litersRecommended, input.method)),
  }),

  // FEATURE 4: AI MANDI NEGOTIATION ASSISTANT
  mandi: router({
    evaluateOffer: protectedProcedure.input(z.object({
      crop: z.string().min(1).max(80),
      quantityQuintals: z.number().min(0.5).max(5000),
      buyerOfferPerQuintal: z.number().min(100).max(100000),
      productionCostTotal: z.number().min(0).max(100_000_000),
      transportRatePerKmPerQuintal: z.number().min(0.5).max(50).default(3.5),
    })).query(({ input }) => evaluateMandiOffer(input)),
  }),

  // FEATURE 5: MULTI-CROP PROFIT SIMULATOR
  profit: router({
    compareCrops: protectedProcedure.input(z.object({
      crops: z.array(z.object({
        crop: z.string().min(1).max(80),
        areaAcres: z.number().min(0.25).max(500),
        seedCost: z.number().min(0).optional(),
        fertilizerCost: z.number().min(0).optional(),
        labourCost: z.number().min(0).optional(),
        waterCost: z.number().min(0).optional(),
        machineryCost: z.number().min(0).optional(),
        expectedYieldQ: z.number().min(0.1).optional(),
        expectedPricePerQ: z.number().min(100).optional(),
      })).min(3).max(8),
      constraints: z.object({
        currentCrop: z.string().min(1).max(80),
        availableWaterLevel: z.enum(["Scarce", "Moderate", "Abundant"]),
        maxBudgetTotal: z.number().min(1000).max(50_000_000),
        riskAppetite: z.enum(["Conservative", "Balanced", "High-Return"]),
      }),
    })).mutation(({ input }) => compareCropsAndRecommendSwitch(input.crops, input.constraints)),
  }),

  // FEATURE 7: SATELLITE CROP HEALTH MONITORING
  satellite: router({
    insights: protectedProcedure.input(z.object({ lat: z.number().default(13.135), lng: z.number().default(78.132) }).optional()).query(async ({ ctx, input }) => {
      const [plots, weather] = await Promise.all([
        getUserPlots(ctx.user.id),
        fetchOpenMeteoForecast(input?.lat ?? 13.135, input?.lng ?? 78.132),
      ]);
      return buildSatellitePlotInsights(plots, weather, input?.lat ?? 13.135, input?.lng ?? 78.132);
    }),
  }),

  // FEATURE 8: FARM WASTE EXCHANGE
  wasteExchange: router({
    list: protectedProcedure.input(z.object({ category: z.string().optional(), district: z.string().optional(), search: z.string().optional() }).optional()).query(({ input }) => listWasteExchange(input)),
    create: protectedProcedure.input(z.object({
      category: z.enum(["organic_waste", "crop_residue", "compost", "manure", "by_product"]),
      title: z.string().trim().min(4).max(160),
      description: z.string().trim().min(5).max(1000),
      quantityKg: z.number().int().min(10).max(500000),
      pricePerKg: z.number().int().min(0).max(1000),
      isFree: z.boolean().default(false),
      location: z.string().trim().min(2).max(160),
      district: z.string().trim().min(2).max(80),
      contactPhone: z.string().trim().min(8).max(32),
    })).mutation(({ ctx, input }) => createWasteListing({
      ...input,
      pricePerKg: input.isFree ? 0 : input.pricePerKg,
      userId: ctx.user.id,
      sellerName: ctx.user.name || "Farmer",
    })),
    inquire: protectedProcedure.input(z.object({
      listingId: z.number().int().positive(),
      buyerPhone: z.string().trim().min(8).max(32),
      message: z.string().trim().min(4).max(500),
    })).mutation(({ ctx, input }) => createWasteInquiry(input.listingId, ctx.user.id, ctx.user.name || "Buyer Farmer", input.buyerPhone, input.message)),
    setStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["active", "claimed", "closed"]) })).mutation(async ({ ctx, input }) => {
      const ok = await updateWasteListingStatus(ctx.user.id, input.id, input.status);
      if (!ok) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found or not owned by your account." });
      return { success: true as const };
    }),
  }),

  // FEATURE 9: LOCAL FARMER INTELLIGENCE
  regionalIntel: router({
    list: protectedProcedure.input(z.object({ category: z.string().optional(), verification: z.enum(["all", "verified", "unverified"]).optional() }).optional()).query(({ input }) => listRegionalIntelReports(input)),
    submit: protectedProcedure.input(z.object({
      category: z.enum(["pest_attack", "crop_disease", "unusual_rainfall", "water_shortage", "crop_damage", "market_change"]),
      title: z.string().trim().min(4).max(160),
      crop: z.string().trim().min(2).max(80),
      severity: z.enum(["low", "moderate", "high"]).default("moderate"),
      description: z.string().trim().min(6).max(1000),
      location: z.string().trim().min(2).max(160),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })).mutation(({ ctx, input }) => createRegionalIntelReport({
      ...input,
      userId: ctx.user.id,
      reporterName: ctx.user.name || "Local Farmer",
    })),
    corroborate: protectedProcedure.input(z.object({ reportId: z.number().int().positive() })).mutation(({ ctx, input }) => corroborateRegionalIntel(input.reportId, ctx.user.id)),
    verify: adminProcedure.input(z.object({ reportId: z.number().int().positive(), verified: z.boolean() })).mutation(({ ctx, input }) => verifyRegionalIntelByAdmin(input.reportId, input.verified, ctx.user.name || "KVK Admin")),
  }),

  // FEATURE 10: CROP FAILURE ANALYSIS
  failureAnalysis: router({
    history: protectedProcedure.query(({ ctx }) => listCropFailureAnalyses(ctx.user.id)),
    analyze: protectedProcedure.input(z.object({
      crop: z.string().trim().min(1).max(80),
      soilType: z.string().trim().min(2).max(80),
      soilPh: z.number().min(3.5).max(10),
      irrigationMethod: z.string().trim().min(2).max(80),
      irrigationFrequency: z.string().trim().min(2).max(120),
      fertilizerUsage: z.string().trim().min(2).max(200),
      weatherConditions: z.string().trim().min(2).max(200),
      symptoms: z.array(z.string()).min(1).max(12),
      notes: z.string().max(800).optional(),
      historicalYieldQ: z.number().min(0.1).max(10000),
      actualYieldQ: z.number().min(0).max(10000),
      saveToHistory: z.boolean().default(true),
    })).mutation(async ({ ctx, input }) => {
      const analysis = analyzeCropFailure(input);
      if (input.saveToHistory) {
        await saveCropFailureAnalysis({
          userId: ctx.user.id,
          crop: input.crop,
          soilType: input.soilType,
          soilPh: input.soilPh,
          historicalYieldQ: input.historicalYieldQ,
          actualYieldQ: input.actualYieldQ,
          yieldDropPct: analysis.yieldDropPct,
          analysis,
        });
      }
      return analysis;
    }),
  }),
});

export type AppRouter = typeof appRouter;
