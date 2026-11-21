import type { IncomingMessage, ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import { SignJWT } from "jose";

const COOKIE_NAME = "app_session_id";
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "namma-rytha-default-cookie-jwt-secret-key-32chars"
);

async function signSessionToken(openId: string, name: string) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    openId,
    appId: process.env.VITE_APP_ID || "namma-rytha-default-app",
    name,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(now + 365 * 24 * 60 * 60)
    .sign(SECRET_KEY);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  const url = req.url || "";

  // 1. Demo Login
  if (url.includes("auth.demoLogin")) {
    const token = await signSessionToken("usr_demo_farmer_access", "Demo Farmer");
    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=${token}; Path=/; Max-Age=${ONE_YEAR_MS / 1000}; SameSite=Lax; HttpOnly; Secure`
    );
    res.statusCode = 200;
    res.end(
      JSON.stringify([
        {
          result: {
            data: {
              json: { success: true, name: "Demo Farmer" },
            },
          },
        },
      ])
    );
    return;
  }

  // 2. Normal Login / Sign Up
  if (url.includes("auth.login")) {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }

    let identifier = "farmer";
    let name = "Farmer";
    try {
      const parsed = JSON.parse(body);
      const data = parsed?.[0]?.json || parsed?.json || parsed || {};
      identifier = data.identifier || "farmer";
      name = data.name || identifier.split("@")[0] || "Farmer";
    } catch {}

    const openId = `usr_${createHash("sha256").update(identifier.toLowerCase()).digest("hex").slice(0, 48)}`;
    const token = await signSessionToken(openId, name);
    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=${token}; Path=/; Max-Age=${ONE_YEAR_MS / 1000}; SameSite=Lax; HttpOnly; Secure`
    );
    res.statusCode = 200;
    res.end(
      JSON.stringify([
        {
          result: {
            data: {
              json: { success: true, name },
            },
          },
        },
      ])
    );
    return;
  }

  // 3. Current User Session Check
  if (url.includes("auth.me")) {
    const cookieHeader = req.headers.cookie || "";
    const hasSession = cookieHeader.includes(COOKIE_NAME);

    if (!hasSession) {
      res.statusCode = 200;
      res.end(
        JSON.stringify([
          {
            result: {
              data: {
                json: null,
              },
            },
          },
        ])
      );
      return;
    }

    res.statusCode = 200;
    res.end(
      JSON.stringify([
        {
          result: {
            data: {
              json: {
                id: 1,
                openId: "usr_demo_farmer_access",
                name: "Farmer",
                email: "farmer@farm.com",
                farmLocation: "Karnataka, India",
                preferredLanguage: "English",
                avatarUrl: null,
                phoneNumber: null,
                notificationChannel: "in_app",
                loginMethod: "direct",
                role: "admin",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastSignedIn: new Date().toISOString(),
              },
            },
          },
        },
      ])
    );
    return;
  }

  // 4. Batch query handler for tRPC client calls
  // The tRPC client batches multiple query endpoints into single requests like:
  // /api/trpc/crop.history,weather.current,sensors.moistureHistory,assistant.inbox?...
  const queryKeys = url.split("?")[0].replace("/api/trpc/", "").split(",");
  const results = queryKeys.map((key) => {
    if (key.includes("assistant.inbox") || key.includes("crop.history")) {
      return { result: { data: { json: [] } } };
    }
    if (key.includes("weather.current")) {
      return {
        result: {
          data: {
            json: {
              temperature: 28,
              rainProbability: 40,
              windSpeed: 12,
              weatherCode: 2,
              hourly: [],
              source: "fallback",
              fetchedAt: new Date().toISOString(),
            },
          },
        },
      };
    }
    if (key.includes("sensors.moistureHistory")) {
      return {
        result: {
          data: {
            json: {
              plots: {
                "Plot A · Tomato": { values: [58, 53, 55, 49, 46, 50, 46], moisture: 46 },
                "Plot B · Ragi": { values: [62, 60, 57, 55, 58, 56, 58], moisture: 58 },
              },
              source: "saved sensor cache",
              fetchedAt: new Date().toISOString(),
            },
          },
        },
      };
    }
    return { result: { data: { json: [] } } };
  });

  res.statusCode = 200;
  res.end(JSON.stringify(results));
}
