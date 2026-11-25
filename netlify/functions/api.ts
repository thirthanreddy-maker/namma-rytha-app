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

function getMockResponseForKey(key: string) {
  if (key.includes("weather.current")) {
    return {
      temperature: 28,
      rainProbability: 40,
      windSpeed: 12,
      weatherCode: 2,
      hourly: [],
      source: "fallback",
      fetchedAt: new Date().toISOString(),
    };
  }
  if (key.includes("sensors.moistureHistory")) {
    return {
      plots: {
        "Plot A · Tomato": { values: [58, 53, 55, 49, 46, 50, 46], moisture: 46 },
        "Plot B · Ragi": { values: [62, 60, 57, 55, 58, 56, 58], moisture: 58 },
      },
      source: "saved sensor cache",
      fetchedAt: new Date().toISOString(),
    };
  }
  if (key.includes("farm.finance.summary")) {
    return { expenses: 12500, sales: 28000, profit: 15500 };
  }
  if (key.includes("market.current")) {
    return {
      commodity: "Tomato",
      variety: "Local",
      market: "Kolar",
      minPrice: 18,
      maxPrice: 26,
      modalPrice: 22,
      updatedAt: new Date().toISOString(),
      source: "demo",
    };
  }
  if (key.includes("farm.plots.list")) {
    return [
      { id: 1, name: "Plot A · Tomato", crop: "Tomato", area: 1.5, soilType: "Red loam", ingestToken: "token_plot_a" },
      { id: 2, name: "Plot B · Ragi", crop: "Ragi", area: 2.0, soilType: "Clay loam", ingestToken: "token_plot_b" },
    ];
  }
  if (key.includes("sensors.readings")) {
    return [
      { id: 1, plotId: 1, moisture: 46, temperature: 28, humidity: 65, battery: 90, recordedAt: new Date().toISOString() },
    ];
  }
  if (key.includes("farm.planning.tasks")) {
    return [
      { id: 1, title: "Weeding in Tomato row 2", done: false, dueDate: new Date().toISOString() },
      { id: 2, title: "Check drip irrigation filters", done: true, dueDate: new Date().toISOString() },
    ];
  }
  if (key.includes("farm.cycles.list")) {
    return [
      { id: 1, plotId: 1, crop: "Tomato", sowingDate: "2026-09-01", expectedHarvestDate: "2026-12-15" },
    ];
  }
  if (key.includes("announcements.analytics")) {
    return {
      rows: [],
      totals: { views: 0, ctaClicks: 0, announcements: 0 },
    };
  }
  if (key.includes("announcements.feed") || key.includes("announcements.adminList")) {
    return [
      {
        id: 1,
        title: "Welcome to Namma Rytha!",
        message: "Your smart farming assistant is ready. Check the weather, soil sensors, and market rates from one place.",
        ctaLabel: "Explore features",
        targetView: "Community",
        tone: "green",
        status: "published",
        targetCrop: null,
        targetLocation: null,
        publishAt: new Date().toISOString(),
        expireAt: null,
        viewCount: 0,
        ctaClickCount: 0,
        translations: [],
      },
    ];
  }
  return [];
}

const defaultHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,Cookie",
  "Access-Control-Allow-Credentials": "true",
};

export const handler = async (event: any) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: defaultHeaders,
      body: "",
    };
  }

  const path = event.path || "";

  // 1. Demo Login
  if (path.includes("auth.demoLogin")) {
    const token = await signSessionToken("usr_demo_farmer_access", "Demo Farmer");
    const cookieHeader = `${COOKIE_NAME}=${token}; Path=/; Max-Age=${ONE_YEAR_MS / 1000}; SameSite=Lax; HttpOnly; Secure`;

    return {
      statusCode: 200,
      headers: {
        ...defaultHeaders,
        "Set-Cookie": cookieHeader,
      },
      multiValueHeaders: {
        "Set-Cookie": [cookieHeader],
      },
      body: JSON.stringify([
        {
          result: {
            data: {
              json: { success: true, name: "Demo Farmer" },
            },
          },
        },
      ]),
    };
  }

  // 2. Normal Login / Sign Up
  if (path.includes("auth.login")) {
    let identifier = "farmer";
    let name = "Farmer";
    try {
      const parsed = JSON.parse(event.body || "{}");
      const data = parsed?.[0]?.json || parsed?.json || parsed || {};
      identifier = data.identifier || "farmer";
      name = data.name || identifier.split("@")[0] || "Farmer";
    } catch {}

    const openId = `usr_${createHash("sha256").update(identifier.toLowerCase()).digest("hex").slice(0, 48)}`;
    const token = await signSessionToken(openId, name);
    const cookieHeader = `${COOKIE_NAME}=${token}; Path=/; Max-Age=${ONE_YEAR_MS / 1000}; SameSite=Lax; HttpOnly; Secure`;

    return {
      statusCode: 200,
      headers: {
        ...defaultHeaders,
        "Set-Cookie": cookieHeader,
      },
      multiValueHeaders: {
        "Set-Cookie": [cookieHeader],
      },
      body: JSON.stringify([
        {
          result: {
            data: {
              json: { success: true, name },
            },
          },
        },
      ]),
    };
  }

  // 3. Current User Session Check
  if (path.includes("auth.me")) {
    const cookieHeader = event.headers?.cookie || event.headers?.Cookie || "";
    const hasSession = cookieHeader.includes(COOKIE_NAME);

    if (!hasSession) {
      return {
        statusCode: 200,
        headers: defaultHeaders,
        body: JSON.stringify([
          {
            result: {
              data: {
                json: null,
              },
            },
          },
        ]),
      };
    }

    return {
      statusCode: 200,
      headers: defaultHeaders,
      body: JSON.stringify([
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
      ]),
    };
  }

  // 4. POST Mutations (Announcements, tasks, events, etc.)
  if (event.httpMethod === "POST") {
    const actionKey = path.split("?")[0].replace(/^.*\/api\/trpc\//, "").replace(/^.*\/\.netlify\/functions\/api\//, "");

    if (actionKey === "announcements.create") {
      const newId = Date.now();
      return {
        statusCode: 200,
        headers: defaultHeaders,
        body: JSON.stringify([{ result: { data: { json: { id: newId, success: true } } } }]),
      };
    }

    return {
      statusCode: 200,
      headers: defaultHeaders,
      body: JSON.stringify([{ result: { data: { json: { success: true } } } }]),
    };
  }

  // 5. Query handler for tRPC client (batch or single)
  const isBatch = event.queryStringParameters?.batch === "1" || path.includes(",");
  const queryStr = path.split("?")[0].replace(/^.*\/api\/trpc\//, "").replace(/^.*\/\.netlify\/functions\/api\//, "");
  const queryKeys = queryStr.split(",").filter(Boolean);
  const results = (queryKeys.length > 0 ? queryKeys : ["default"]).map((key) => ({
    result: {
      data: {
        json: getMockResponseForKey(key),
      },
    },
  }));

  return {
    statusCode: 200,
    headers: defaultHeaders,
    body: JSON.stringify(isBatch ? results : results[0]),
  };
};
