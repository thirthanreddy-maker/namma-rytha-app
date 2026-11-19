import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "capstone-test-user",
      name: "Capstone Farmer",
      email: "farmer@example.com",
      loginMethod: "test",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("farm.irrigation.recommendation", () => {
  it("recommends irrigation when moisture is low and rain is unlikely", async () => {
    const result = await appRouter.createCaller(createContext()).farm.irrigation.recommendation({ soilMoisture: 24, threshold: 35, rainProbability: 20 });
    expect(result).toMatchObject({ tone: "amber", status: "IRRIGATE SOON" });
  });

  it("waits for rain when moisture is low but rain probability is high", async () => {
    const result = await appRouter.createCaller(createContext()).farm.irrigation.recommendation({ soilMoisture: 24, threshold: 35, rainProbability: 70 });
    expect(result).toMatchObject({ tone: "blue", status: "WAIT FOR RAIN" });
  });
});

describe("admin.summary", () => {
  it("rejects ordinary farmers", async () => {
    await expect(appRouter.createCaller(createContext()).admin.summary()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("auth.profile", () => {
  it("rejects incomplete profile details before touching persistence", async () => {
    await expect(appRouter.createCaller(createContext()).auth.profile({ name: "R", farmLocation: "", preferredLanguage: "English" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects unsupported profile languages", async () => {
    await expect(appRouter.createCaller(createContext()).auth.profile({ name: "Ravi Kumar", farmLocation: "Kolar", preferredLanguage: "Marathi" as unknown as "English" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("auth.avatar", () => {
  it("rejects non-image data URLs", async () => {
    await expect(appRouter.createCaller(createContext()).auth.avatar({ imageDataUrl: "data:text/plain;base64,ZmFrZQ==" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("auth.alertRetry", () => {
  it("rejects invalid alert identifiers", async () => {
    await expect(appRouter.createCaller(createContext()).auth.alertRetry({ id: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("community", () => {
  it("rejects a photo post with video media before storage access", async () => {
    await expect(appRouter.createCaller(createContext()).community.create({ kind: "post", mediaType: "video", mediaDataUrl: "data:image/png;base64,ZmFrZQ==" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects empty comments before database access", async () => {
    await expect(appRouter.createCaller(createContext()).community.comment({ postId: 1, body: "   " })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("announcements", () => {
  it("rejects ordinary farmers from creating global announcements", async () => {
    await expect(appRouter.createCaller(createContext()).announcements.create({ title: "New feature", message: "Try the new farmer tools.", publishAt: new Date().toISOString() })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an expiry date before the publish date", async () => {
    const adminContext = createContext();
    adminContext.user = { ...adminContext.user, role: "admin" };
    await expect(appRouter.createCaller(adminContext).announcements.create({ title: "Season update", message: "A useful update for farmers.", publishAt: "2026-10-10T10:00:00.000Z", expireAt: "2026-10-09T10:00:00.000Z" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("keeps editing administrator-only", async () => {
    await expect(appRouter.createCaller(createContext()).announcements.update({ id: 1, title: "Edited update", message: "Updated message", ctaLabel: "Open", targetView: "Community", tone: "green", status: "draft", publishAt: new Date().toISOString(), translations: [] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects invalid analytics event identifiers before persistence", async () => {
    await expect(appRouter.createCaller(createContext()).announcements.event({ id: 0, eventType: "view" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects unsupported announcement translation languages", async () => {
    const adminContext = createContext();
    adminContext.user = { ...adminContext.user, role: "admin" };
    await expect(appRouter.createCaller(adminContext).announcements.create({ title: "Kannada update", message: "A useful message", publishAt: new Date().toISOString(), translations: [{ language: "Tamil" as "Kannada", title: "ಅಪ್‌ಡೇಟ್", message: "ಸಂದೇಶ", ctaLabel: "ತೆರೆಯಿರಿ" }] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("keeps analytics administrator-only", async () => {
    await expect(appRouter.createCaller(createContext()).announcements.analytics({ crop: "Tomato" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects analytics ranges where the end precedes the start", async () => {
    const adminContext = createContext();
    adminContext.user = { ...adminContext.user, role: "admin" };
    await expect(appRouter.createCaller(adminContext).announcements.analytics({ startDate: "2026-09-20", endDate: "2026-09-19" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
