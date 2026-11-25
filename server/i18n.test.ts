import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const LOCALES_DIR = path.resolve(process.cwd(), "client/src/i18n/locales");
const LANGUAGES = ["en", "kn", "hi", "te", "ta"] as const;

function flattenKeys(obj: unknown, prefix = ""): Array<{ key: string; value: string }> {
  const keys: Array<{ key: string; value: string }> = [];
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      if (typeof item === "string") keys.push({ key: `${prefix}[${idx}]`, value: item });
      else if (item && typeof item === "object") keys.push(...flattenKeys(item, `${prefix}[${idx}]`));
    });
    return keys;
  }
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      if (typeof v === "string") keys.push({ key: fullKey, value: v });
      else if (v && typeof v === "object") keys.push(...flattenKeys(v, fullKey));
    }
  }
  return keys;
}

function createFarmerContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "usr_i18n_test",
      email: "i18n@nammarytha.test",
      name: "Test Farmer",
      loginMethod: "direct",
      role: "user",
      farmLocation: "Kolar district, Karnataka",
      preferredLanguage: "Kannada",
      avatarUrl: null,
      phoneNumber: null,
      notificationChannel: "in_app",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Namma Rytha 5-Language i18n Regression Suite", () => {
  const refDir = path.join(LOCALES_DIR, "en");
  const namespaces = fs.readdirSync(refDir).filter((f) => f.endsWith(".json")).sort();

  it("has 13 namespaces and 100% key parity across en, kn, hi, te, ta with zero empty translations", () => {
    expect(namespaces.length).toBe(13);

    for (const ns of namespaces) {
      const refEntries = flattenKeys(JSON.parse(fs.readFileSync(path.join(refDir, ns), "utf8")));
      expect(refEntries.length).toBeGreaterThan(0);

      for (const lang of LANGUAGES) {
        const targetPath = path.join(LOCALES_DIR, lang, ns);
        expect(fs.existsSync(targetPath), `Missing ${lang}/${ns}`).toBe(true);
        const targetEntries = flattenKeys(JSON.parse(fs.readFileSync(targetPath, "utf8")));
        const targetMap = new Map(targetEntries.map((e) => [e.key, e.value]));

        for (const ref of refEntries) {
          const val = targetMap.get(ref.key);
          expect(val, `Missing key ${lang}/${ns}:${ref.key}`).toBeDefined();
          expect(val!.trim().length, `Empty key ${lang}/${ns}:${ref.key}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("AI Assistant responds in all 5 supported languages (English, Kannada, Hindi, Telugu, Tamil)", async () => {
    const caller = appRouter.createCaller(createFarmerContext());
    const langs = ["English", "Kannada", "Hindi", "Telugu", "Tamil"] as const;

    for (const language of langs) {
      const res = await caller.assistant.ask({
        question: "When should I irrigate?",
        language,
        crop: "Tomato",
        stage: "Flowering",
        soilMoisture: 30,
        threshold: 35,
        recommendation: "Irrigate within 4 hours",
        temperature: 29,
        rainProbability: 15,
      });
      expect(res.answer.trim().length).toBeGreaterThan(20);
      if (language === "Kannada") expect(res.answer).toMatch(/[\u0C80-\u0CFF]/);
      if (language === "Hindi") expect(res.answer).toMatch(/[\u0900-\u097F]/);
      if (language === "Telugu") expect(res.answer).toMatch(/[\u0C00-\u0C7F]/);
      if (language === "Tamil") expect(res.answer).toMatch(/[\u0B80-\u0BFF]/);
    }
  });
});
