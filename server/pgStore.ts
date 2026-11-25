import postgres, { type Sql } from "postgres";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type PgUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  farmLocation: string | null;
  preferredLanguage: string;
  avatarUrl: string | null;
  phoneNumber: string | null;
  notificationChannel: "in_app" | "sms" | "whatsapp";
  loginMethod: string | null;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

export type DigitalTwinScenarioRecord = {
  id: number;
  userId: number;
  plotName: string;
  baseCrop: string;
  scenarioName: string;
  params: Record<string, unknown>;
  results: Record<string, unknown>;
  createdAt: Date;
};

export type WaterUsageLogRecord = {
  id: number;
  userId: number;
  plotName: string;
  litersUsed: number;
  litersRecommended: number;
  method: "drip" | "sprinkler" | "flood";
  loggedAt: Date;
};

export type WasteExchangeListingRecord = {
  id: number;
  userId: number;
  sellerName: string;
  category: "organic_waste" | "crop_residue" | "compost" | "manure" | "by_product";
  title: string;
  description: string;
  quantityKg: number;
  pricePerKg: number;
  isFree: boolean;
  location: string;
  district: string;
  contactPhone: string;
  status: "active" | "claimed" | "closed";
  inquiriesCount: number;
  isDemo?: boolean;
  createdAt: Date;
};

export type RegionalIntelReportRecord = {
  id: number;
  userId: number;
  reporterName: string;
  category: "pest_attack" | "crop_disease" | "unusual_rainfall" | "water_shortage" | "crop_damage" | "market_change";
  title: string;
  crop: string;
  severity: "low" | "moderate" | "high";
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  verified: boolean;
  verifiedBy: string | null;
  corroborations: number;
  createdAt: Date;
};

export type CropFailureRecord = {
  id: number;
  userId: number;
  crop: string;
  soilType: string;
  soilPh: number;
  historicalYieldQ: number;
  actualYieldQ: number;
  yieldDropPct: number;
  analysis: Record<string, unknown>;
  createdAt: Date;
};

const STORE_FILE = path.join(process.env.TMPDIR || process.env.TEMP || "/tmp", "namma-rytha-fallback-store.json");

let _sql: Sql | null = null;
let _schemaReadyPromise: Promise<boolean> | null = null;

export function isPostgresConfigured(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

export async function getPgSql(): Promise<Sql | null> {
  if (!isPostgresConfigured()) return null;
  if (!_sql) {
    const url = process.env.DATABASE_URL!;
    const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
    _sql = postgres(url, {
      ssl: isLocal ? false : "require",
      max: 3,
      idle_timeout: 20,
      connect_timeout: 8,
    });
  }
  if (!_schemaReadyPromise) {
    _schemaReadyPromise = initPgSchema(_sql).catch((err) => {
      console.warn("[Postgres] Schema init failed, falling back to memory store:", err);
      _schemaReadyPromise = null;
      return false;
    });
  }
  const ok = await _schemaReadyPromise;
  return ok ? _sql : null;
}

async function initPgSchema(sql: Sql): Promise<boolean> {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS rytha_users (
      id SERIAL PRIMARY KEY,
      open_id VARCHAR(128) UNIQUE NOT NULL,
      name TEXT,
      email VARCHAR(320),
      farm_location VARCHAR(160) DEFAULT 'Kolar district, Karnataka',
      preferred_language VARCHAR(24) NOT NULL DEFAULT 'English',
      avatar_url TEXT,
      phone_number VARCHAR(32),
      notification_channel VARCHAR(24) NOT NULL DEFAULT 'in_app',
      login_method VARCHAR(64),
      role VARCHAR(24) NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_signed_in TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rytha_plots (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name VARCHAR(120) NOT NULL,
      crop VARCHAR(80) NOT NULL,
      area_acres NUMERIC(8,2) NOT NULL DEFAULT 1,
      soil_type VARCHAR(80) NOT NULL DEFAULT 'Loamy',
      growth_stage VARCHAR(80) NOT NULL DEFAULT 'Seedling',
      latitude VARCHAR(32),
      longitude VARCHAR(32),
      ingest_token VARCHAR(96) UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rytha_sensor_readings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      plot_id INTEGER NOT NULL,
      moisture INTEGER NOT NULL,
      temperature INTEGER NOT NULL,
      humidity INTEGER NOT NULL,
      battery INTEGER NOT NULL DEFAULT 100,
      source VARCHAR(24) NOT NULL DEFAULT 'simulated',
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rytha_farm_tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      plot_id INTEGER,
      cycle_id INTEGER,
      title VARCHAR(160) NOT NULL,
      detail TEXT,
      due_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      status VARCHAR(24) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rytha_farm_expenses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      plot_id INTEGER,
      category VARCHAR(80) NOT NULL,
      label VARCHAR(160) NOT NULL,
      amount INTEGER NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rytha_farm_sales (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      plot_id INTEGER,
      crop VARCHAR(80) NOT NULL,
      quantity_kg INTEGER NOT NULL,
      price_per_quintal INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      sold_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rytha_crop_cycles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      plot_id INTEGER NOT NULL,
      crop VARCHAR(80) NOT NULL,
      sowing_date TIMESTAMPTZ NOT NULL,
      expected_harvest_date TIMESTAMPTZ NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      schedule_cron_task_uid VARCHAR(65),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rytha_crop_diagnosis_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      plot_name VARCHAR(120) NOT NULL,
      crop VARCHAR(80) NOT NULL,
      image_key VARCHAR(512) NOT NULL,
      likely_condition VARCHAR(255) NOT NULL,
      category VARCHAR(64) NOT NULL,
      confidence INTEGER NOT NULL,
      severity VARCHAR(32) NOT NULL,
      explanation TEXT NOT NULL,
      needs_agronomist INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rytha_agronomist_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      image_key VARCHAR(512) NOT NULL,
      crop VARCHAR(80) NOT NULL,
      ai_condition VARCHAR(255),
      ai_confidence INTEGER,
      farmer_note TEXT,
      agronomist_reply TEXT,
      replied_at TIMESTAMPTZ,
      read_at TIMESTAMPTZ,
      status VARCHAR(32) NOT NULL DEFAULT 'requested',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rytha_announcements (
      id SERIAL PRIMARY KEY,
      created_by INTEGER NOT NULL,
      title VARCHAR(120) NOT NULL,
      message TEXT NOT NULL,
      cta_label VARCHAR(40) NOT NULL DEFAULT 'Learn more',
      target_view VARCHAR(80) NOT NULL DEFAULT 'Community',
      tone VARCHAR(24) NOT NULL DEFAULT 'green',
      status VARCHAR(24) NOT NULL DEFAULT 'published',
      target_crop VARCHAR(80),
      target_location VARCHAR(160),
      publish_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expire_at TIMESTAMPTZ,
      translations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      views_count INTEGER NOT NULL DEFAULT 0,
      cta_clicks_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rytha_community_posts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      kind VARCHAR(16) NOT NULL DEFAULT 'post',
      media_type VARCHAR(16) NOT NULL,
      media_url TEXT NOT NULL,
      media_key VARCHAR(512) NOT NULL,
      caption TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rytha_community_likes (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      UNIQUE (post_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS rytha_community_comments (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      body VARCHAR(500) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rytha_digital_twin_scenarios (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      plot_name VARCHAR(120) NOT NULL,
      base_crop VARCHAR(80) NOT NULL,
      scenario_name VARCHAR(120) NOT NULL,
      params_json JSONB NOT NULL,
      results_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rytha_water_usage_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      plot_name VARCHAR(120) NOT NULL,
      liters_used INTEGER NOT NULL,
      liters_recommended INTEGER NOT NULL,
      method VARCHAR(24) NOT NULL DEFAULT 'drip',
      logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rytha_waste_exchange_listings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      seller_name VARCHAR(120) NOT NULL,
      category VARCHAR(48) NOT NULL,
      title VARCHAR(160) NOT NULL,
      description TEXT NOT NULL,
      quantity_kg INTEGER NOT NULL,
      price_per_kg INTEGER NOT NULL DEFAULT 0,
      is_free BOOLEAN NOT NULL DEFAULT false,
      location VARCHAR(160) NOT NULL,
      district VARCHAR(80) NOT NULL,
      contact_phone VARCHAR(32) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      inquiries_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rytha_waste_exchange_inquiries (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER NOT NULL,
      buyer_user_id INTEGER NOT NULL,
      buyer_name VARCHAR(120) NOT NULL,
      buyer_phone VARCHAR(32) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rytha_regional_intel_reports (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      reporter_name VARCHAR(120) NOT NULL,
      category VARCHAR(48) NOT NULL,
      title VARCHAR(160) NOT NULL,
      crop VARCHAR(80) NOT NULL,
      severity VARCHAR(24) NOT NULL DEFAULT 'moderate',
      description TEXT NOT NULL,
      location VARCHAR(160) NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      verified BOOLEAN NOT NULL DEFAULT false,
      verified_by VARCHAR(120),
      corroborations INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rytha_crop_failure_analyses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      crop VARCHAR(80) NOT NULL,
      soil_type VARCHAR(80) NOT NULL,
      soil_ph NUMERIC(4,2) NOT NULL,
      historical_yield_q NUMERIC(8,2) NOT NULL,
      actual_yield_q NUMERIC(8,2) NOT NULL,
      yield_drop_pct INTEGER NOT NULL,
      analysis_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  return true;
}

// Durable in-memory + optional /tmp JSON persistence store for zero-DB / offline demo runs
type FallbackStoreState = {
  nextId: number;
  users: PgUser[];
  plots: Array<{ id: number; userId: number; name: string; crop: string; areaAcres: number; soilType: string; growthStage: string; latitude: string | null; longitude: string | null; ingestToken: string | null; createdAt: string; updatedAt: string }>;
  readings: Array<{ id: number; userId: number; plotId: number; moisture: number; temperature: number; humidity: number; battery: number; source: "sensor" | "simulated"; recordedAt: string }>;
  tasks: Array<{ id: number; userId: number; plotId: number | null; cycleId: number | null; title: string; detail: string | null; dueDate: string; completedAt: string | null; status: "pending" | "completed"; createdAt: string }>;
  expenses: Array<{ id: number; userId: number; plotId: number | null; category: string; label: string; amount: number; occurredAt: string }>;
  sales: Array<{ id: number; userId: number; plotId: number | null; crop: string; quantityKg: number; pricePerQuintal: number; totalAmount: number; soldAt: string }>;
  cycles: Array<{ id: number; userId: number; plotId: number; crop: string; sowingDate: string; expectedHarvestDate: string; status: "planned" | "active" | "harvested"; scheduleCronTaskUid: string | null; createdAt: string }>;
  diagnoses: Array<{ id: number; userId: number; plotName: string; crop: string; imageKey: string; likelyCondition: string; category: string; confidence: number; severity: string; explanation: string; needsAgronomist: number; createdAt: string }>;
  reviews: Array<{ id: number; userId: number; imageKey: string; crop: string; aiCondition: string | null; aiConfidence: number | null; farmerNote: string | null; agronomistReply: string | null; repliedAt: string | null; readAt: string | null; status: "requested" | "assigned" | "resolved"; createdAt: string; updatedAt: string }>;
  announcements: Array<{ id: number; createdBy: number; title: string; message: string; ctaLabel: string; targetView: string; tone: "green" | "amber" | "blue"; status: "draft" | "published" | "archived"; targetCrop: string | null; targetLocation: string | null; publishAt: string; expireAt: string | null; translations: Array<{ language: "Kannada" | "Hindi"; title: string; message: string; ctaLabel: string }>; viewCount: number; ctaClickCount: number; updatedAt: string }>;
  communityPosts: Array<{ id: number; userId: number; authorName: string; authorAvatarUrl: string | null; kind: "post" | "reel"; mediaType: "image" | "video"; mediaUrl: string; mediaKey: string; caption: string | null; createdAt: string; likedUserIds: number[] }>;
  communityComments: Array<{ id: number; postId: number; userId: number; authorName: string; body: string; createdAt: string }>;
  twinScenarios: Array<{ id: number; userId: number; plotName: string; baseCrop: string; scenarioName: string; params: Record<string, unknown>; results: Record<string, unknown>; createdAt: string }>;
  waterLogs: Array<{ id: number; userId: number; plotName: string; litersUsed: number; litersRecommended: number; method: "drip" | "sprinkler" | "flood"; loggedAt: string }>;
  wasteListings: Array<Omit<WasteExchangeListingRecord, "createdAt"> & { createdAt: string }>;
  wasteInquiries: Array<{ id: number; listingId: number; buyerUserId: number; buyerName: string; buyerPhone: string; message: string; createdAt: string }>;
  intelReports: Array<Omit<RegionalIntelReportRecord, "createdAt"> & { createdAt: string; corroboratedBy: number[] }>;
  failureAnalyses: Array<Omit<CropFailureRecord, "createdAt"> & { createdAt: string }>;
};

function createSeededState(): FallbackStoreState {
  const now = new Date().toISOString();
  return {
    nextId: 100,
    users: [],
    plots: [
      { id: 1, userId: 1, name: "Plot A · Tomato", crop: "Tomato", areaAcres: 2, soilType: "Red loam", growthStage: "Flowering", latitude: "13.1362", longitude: "78.1302", ingestToken: "rytha_plot_a_token", createdAt: now, updatedAt: now },
      { id: 2, userId: 1, name: "Plot B · Ragi", crop: "Ragi", areaAcres: 1, soilType: "Clay loam", growthStage: "Tillering", latitude: "13.1335", longitude: "78.1338", ingestToken: "rytha_plot_b_token", createdAt: now, updatedAt: now },
    ],
    readings: [
      { id: 1, userId: 1, plotId: 1, moisture: 46, temperature: 28, humidity: 65, battery: 90, source: "simulated", recordedAt: now },
      { id: 2, userId: 1, plotId: 2, moisture: 58, temperature: 27, humidity: 64, battery: 84, source: "simulated", recordedAt: now },
    ],
    tasks: [
      { id: 1, userId: 1, plotId: 1, cycleId: 1, title: "Inspect lower tomato leaves for early blight", detail: "Before 6:00 PM · Plot A", dueDate: now, completedAt: null, status: "pending", createdAt: now },
      { id: 2, userId: 1, plotId: 1, cycleId: 1, title: "Clean drip lateral filter", detail: "Maintenance · 20 min", dueDate: now, completedAt: now, status: "completed", createdAt: now },
    ],
    expenses: [
      { id: 1, userId: 1, plotId: 1, category: "Seed", label: "Hybrid tomato nursery", amount: 8400, occurredAt: now },
      { id: 2, userId: 1, plotId: 1, category: "Fertilizer", label: "Organic compost & NPK", amount: 14200, occurredAt: now },
      { id: 3, userId: 1, plotId: 1, category: "Labour", label: "Staking & weeding labour", amount: 22000, occurredAt: now },
    ],
    sales: [
      { id: 1, userId: 1, plotId: 1, crop: "Tomato", quantityKg: 1200, pricePerQuintal: 2650, totalAmount: 31800, soldAt: now },
    ],
    cycles: [
      { id: 1, userId: 1, plotId: 1, crop: "Tomato", sowingDate: "2026-09-01T00:00:00.000Z", expectedHarvestDate: "2026-12-10T00:00:00.000Z", status: "active", scheduleCronTaskUid: null, createdAt: now },
    ],
    diagnoses: [],
    reviews: [],
    announcements: [
      {
        id: 1,
        createdBy: 1,
        title: "Welcome to Namma Rytha!",
        message: "Explore Digital Twin simulations, Water Budget Planner, Mandi Offer Assistant, and Satellite Crop Health from your sidebar.",
        ctaLabel: "Explore Field Lab",
        targetView: "Field lab",
        tone: "green",
        status: "published",
        targetCrop: null,
        targetLocation: null,
        publishAt: now,
        expireAt: null,
        translations: [],
        viewCount: 12,
        ctaClickCount: 4,
        updatedAt: now,
      },
    ],
    communityPosts: [],
    communityComments: [],
    twinScenarios: [],
    waterLogs: [
      { id: 1, userId: 1, plotName: "Plot A · Tomato", litersUsed: 11200, litersRecommended: 12400, method: "drip", loggedAt: now },
    ],
    wasteListings: [
      {
        id: 1, userId: 901, sellerName: "Manjunath Gowda (Demo)", category: "manure",
        title: "Well-rotted Dairy Farmyard Manure (FYM)",
        description: "6-month decomposed cow manure, low moisture, ready for basal bed application in vegetable plots.",
        quantityKg: 2500, pricePerKg: 3, isFree: false, location: "Hegganahalli Road", district: "Kolar",
        contactPhone: "+919845001122", status: "active", inquiriesCount: 3, isDemo: true, createdAt: now,
      },
      {
        id: 2, userId: 902, sellerName: "Lakshmi Narasimha FPO (Demo)", category: "compost",
        title: "Enriched Vermicompost (Neem Cake Fortified)",
        description: "Sieved black vermicompost packed in 50kg HDPE bags. Lab-tested C:N ratio 16:1.",
        quantityKg: 1200, pricePerKg: 7, isFree: false, location: "Malur Taluk", district: "Kolar",
        contactPhone: "+919900112233", status: "active", inquiriesCount: 5, isDemo: true, createdAt: now,
      },
      {
        id: 3, userId: 903, sellerName: "Basavaraj (Demo)", category: "crop_residue",
        title: "Dry Ragi Straw & Maize Stover Bales",
        description: "Clean sun-dried crop residue ideal for soil mulching or cattle fodder.",
        quantityKg: 3000, pricePerKg: 2, isFree: false, location: "Gauribidanur", district: "Chikkaballapur",
        contactPhone: "+919448009988", status: "active", inquiriesCount: 2, isDemo: true, createdAt: now,
      },
      {
        id: 4, userId: 904, sellerName: "Srinivas Orchard (Demo)", category: "organic_waste",
        title: "Pruned Biomass & Dry Leaf Litter for Mulching",
        description: "Free shredded orchard prunings available for pickup at farm gate with tractor trailer.",
        quantityKg: 1800, pricePerKg: 0, isFree: true, location: "Mulbagal", district: "Kolar",
        contactPhone: "+919741005566", status: "active", inquiriesCount: 1, isDemo: true, createdAt: now,
      },
    ],
    wasteInquiries: [],
    intelReports: [
      {
        id: 1, userId: 901, reporterName: "Dr. Suresh (KVK Agronomist)", category: "crop_disease",
        title: "Verified Early Blight Cluster in Tomato", crop: "Tomato", severity: "high",
        description: "Confirmed Alternaria spots across 4 irrigated plots following evening humidity spikes. Scout lower leaves before spraying.",
        location: "Hegganahalli, Kolar", latitude: 13.139, longitude: 78.128,
        verified: true, verifiedBy: "KVK Kolar Field Team", corroborations: 6, corroboratedBy: [], createdAt: now,
      },
      {
        id: 2, userId: 902, reporterName: "Ramesh Naidu", category: "pest_attack",
        title: "Fall Armyworm Spotted in Young Maize", crop: "Maize", severity: "moderate",
        description: "Window-pane feeding visible in 3-week whorl leaves along eastern canal belt.",
        location: "Chikkaballapur East", latitude: 13.152, longitude: 78.155,
        verified: true, verifiedBy: "State Agri Dept Officer", corroborations: 4, corroboratedBy: [], createdAt: now,
      },
      {
        id: 3, userId: 903, reporterName: "Kiran Kumar", category: "water_shortage",
        title: "Unscheduled Borewell Voltage Drop & Low Discharge", crop: "All crops", severity: "moderate",
        description: "Morning 3-phase feeder tripped twice this week; drip cycles taking 30% longer.",
        location: "Malur Industrial Fringe", latitude: 13.112, longitude: 78.118,
        verified: false, verifiedBy: null, corroborations: 2, corroboratedBy: [], createdAt: now,
      },
      {
        id: 4, userId: 904, reporterName: "Venkatesh", category: "market_change",
        title: "Sudden Rise in Grade-A Tomato Arrivals at Kolar APMC", crop: "Tomato", severity: "low",
        description: "Heavy morning arrivals today lowered evening auction bids by ₹120/crate; mornings fetching higher rates.",
        location: "Kolar APMC Gate 2", latitude: 13.129, longitude: 78.144,
        verified: false, verifiedBy: null, corroborations: 3, corroboratedBy: [], createdAt: now,
      },
    ],
    failureAnalyses: [],
  };
}

let _memoryStore: FallbackStoreState | null = null;

export function getMemoryStore(): FallbackStoreState {
  if (_memoryStore) return _memoryStore;
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf8");
      const parsed = JSON.parse(raw) as FallbackStoreState;
      if (parsed && Array.isArray(parsed.plots)) {
        _memoryStore = parsed;
        return _memoryStore;
      }
    }
  } catch {
    // Ignore read failure in read-only sandbox
  }
  _memoryStore = createSeededState();
  return _memoryStore;
}

export function saveMemoryStore() {
  if (!_memoryStore) return;
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(_memoryStore), "utf8");
  } catch {
    // Ignore write failure when filesystem isn't writable
  }
}

export function ensureUserDefaultPlotsInMemory(userId: number) {
  const store = getMemoryStore();
  if (!store.plots.some((p) => p.userId === userId)) {
    const now = new Date().toISOString();
    store.plots.push(
      { id: ++store.nextId, userId, name: "Plot A · Tomato", crop: "Tomato", areaAcres: 2, soilType: "Red loam", growthStage: "Flowering", latitude: "13.1362", longitude: "78.1302", ingestToken: `rytha_${randomBytes(12).toString("hex")}`, createdAt: now, updatedAt: now },
      { id: ++store.nextId, userId, name: "Plot B · Ragi", crop: "Ragi", areaAcres: 1, soilType: "Clay loam", growthStage: "Tillering", latitude: "13.1335", longitude: "78.1338", ingestToken: `rytha_${randomBytes(12).toString("hex")}`, createdAt: now, updatedAt: now },
    );
    saveMemoryStore();
  }
}

export async function pgGetOrUpsertUser(openId: string, name?: string | null, email?: string | null, loginMethod?: string | null): Promise<PgUser> {
  const sql = await getPgSql();
  const cleanName = name?.trim() || "Farmer";
  if (sql) {
    const existing = await sql<PgUser[]>`
      SELECT id, open_id AS "openId", name, email, farm_location AS "farmLocation",
             preferred_language AS "preferredLanguage", avatar_url AS "avatarUrl",
             phone_number AS "phoneNumber", notification_channel AS "notificationChannel",
             login_method AS "loginMethod", role, created_at AS "createdAt",
             updated_at AS "updatedAt", last_signed_in AS "lastSignedIn"
      FROM rytha_users WHERE open_id = ${openId} LIMIT 1
    `;
    if (existing[0]) {
      await sql`UPDATE rytha_users SET last_signed_in = NOW(), name = COALESCE(${name ?? null}, name) WHERE id = ${existing[0].id}`;
      return existing[0];
    }
    const inserted = await sql<PgUser[]>`
      INSERT INTO rytha_users (open_id, name, email, login_method, role)
      VALUES (${openId}, ${cleanName}, ${email ?? null}, ${loginMethod ?? "direct"}, 'admin')
      RETURNING id, open_id AS "openId", name, email, farm_location AS "farmLocation",
                preferred_language AS "preferredLanguage", avatar_url AS "avatarUrl",
                phone_number AS "phoneNumber", notification_channel AS "notificationChannel",
                login_method AS "loginMethod", role, created_at AS "createdAt",
                updated_at AS "updatedAt", last_signed_in AS "lastSignedIn"
    `;
    const created = inserted[0]!;
    // Seed initial farm plots in Postgres for new users
    await sql`
      INSERT INTO rytha_plots (user_id, name, crop, area_acres, soil_type, growth_stage, latitude, longitude, ingest_token)
      VALUES
        (${created.id}, 'Plot A · Tomato', 'Tomato', 1.6, 'Red loam', 'Flowering', '13.1362', '78.1302', ${`rytha_${randomBytes(12).toString("hex")}`}),
        (${created.id}, 'Plot B · Ragi', 'Ragi', 0.8, 'Clay loam', 'Tillering', '13.1335', '78.1338', ${`rytha_${randomBytes(12).toString("hex")}`})
    `;
    return created;
  }

  const store = getMemoryStore();
  let user = store.users.find((u) => u.openId === openId);
  const now = new Date();
  if (!user) {
    const id = openId === "usr_demo_farmer_access" ? 1 : ++store.nextId;
    user = {
      id,
      openId,
      name: cleanName,
      email: email ?? null,
      farmLocation: "Kolar district, Karnataka",
      preferredLanguage: "English",
      avatarUrl: null,
      phoneNumber: null,
      notificationChannel: "in_app",
      loginMethod: loginMethod ?? "direct",
      role: "admin",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    };
    store.users.push(user);
    ensureUserDefaultPlotsInMemory(id);
    saveMemoryStore();
  } else {
    user.lastSignedIn = now;
    if (name?.trim()) user.name = name.trim();
    saveMemoryStore();
  }
  return user;
}

export async function pgGetUserByOpenId(openId: string): Promise<PgUser | undefined> {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql<PgUser[]>`
      SELECT id, open_id AS "openId", name, email, farm_location AS "farmLocation",
             preferred_language AS "preferredLanguage", avatar_url AS "avatarUrl",
             phone_number AS "phoneNumber", notification_channel AS "notificationChannel",
             login_method AS "loginMethod", role, created_at AS "createdAt",
             updated_at AS "updatedAt", last_signed_in AS "lastSignedIn"
      FROM rytha_users WHERE open_id = ${openId} LIMIT 1
    `;
    return rows[0];
  }
  const store = getMemoryStore();
  return store.users.find((u) => u.openId === openId);
}

// Digital Twin Scenarios
export async function saveDigitalTwinScenario(userId: number, plotName: string, baseCrop: string, scenarioName: string, params: Record<string, unknown>, results: Record<string, unknown>): Promise<DigitalTwinScenarioRecord> {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql<DigitalTwinScenarioRecord[]>`
      INSERT INTO rytha_digital_twin_scenarios (user_id, plot_name, base_crop, scenario_name, params_json, results_json)
      VALUES (${userId}, ${plotName}, ${baseCrop}, ${scenarioName}, ${JSON.stringify(params)}::jsonb, ${JSON.stringify(results)}::jsonb)
      RETURNING id, user_id AS "userId", plot_name AS "plotName", base_crop AS "baseCrop",
                scenario_name AS "scenarioName", params_json AS params, results_json AS results, created_at AS "createdAt"
    `;
    return rows[0]!;
  }
  const store = getMemoryStore();
  const record = { id: ++store.nextId, userId, plotName, baseCrop, scenarioName, params, results, createdAt: new Date().toISOString() };
  store.twinScenarios.unshift(record);
  saveMemoryStore();
  return { ...record, createdAt: new Date(record.createdAt) };
}

export async function listDigitalTwinScenarios(userId: number): Promise<DigitalTwinScenarioRecord[]> {
  const sql = await getPgSql();
  if (sql) {
    return sql<DigitalTwinScenarioRecord[]>`
      SELECT id, user_id AS "userId", plot_name AS "plotName", base_crop AS "baseCrop",
             scenario_name AS "scenarioName", params_json AS params, results_json AS results, created_at AS "createdAt"
      FROM rytha_digital_twin_scenarios WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 20
    `;
  }
  const store = getMemoryStore();
  return store.twinScenarios.filter((s) => s.userId === userId).map((s) => ({ ...s, createdAt: new Date(s.createdAt) }));
}

// Smart Irrigation Water Usage Logs
export async function logWaterUsage(userId: number, plotName: string, litersUsed: number, litersRecommended: number, method: "drip" | "sprinkler" | "flood"): Promise<WaterUsageLogRecord> {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql<WaterUsageLogRecord[]>`
      INSERT INTO rytha_water_usage_logs (user_id, plot_name, liters_used, liters_recommended, method)
      VALUES (${userId}, ${plotName}, ${litersUsed}, ${litersRecommended}, ${method})
      RETURNING id, user_id AS "userId", plot_name AS "plotName", liters_used AS "litersUsed",
                liters_recommended AS "litersRecommended", method, logged_at AS "loggedAt"
    `;
    return rows[0]!;
  }
  const store = getMemoryStore();
  const row = { id: ++store.nextId, userId, plotName, litersUsed, litersRecommended, method, loggedAt: new Date().toISOString() };
  store.waterLogs.unshift(row);
  saveMemoryStore();
  return { ...row, loggedAt: new Date(row.loggedAt) };
}

export async function listWaterUsageLogs(userId: number): Promise<WaterUsageLogRecord[]> {
  const sql = await getPgSql();
  if (sql) {
    return sql<WaterUsageLogRecord[]>`
      SELECT id, user_id AS "userId", plot_name AS "plotName", liters_used AS "litersUsed",
             liters_recommended AS "litersRecommended", method, logged_at AS "loggedAt"
      FROM rytha_water_usage_logs WHERE user_id = ${userId} ORDER BY logged_at DESC LIMIT 30
    `;
  }
  const store = getMemoryStore();
  return store.waterLogs.filter((l) => l.userId === userId || l.userId === 1).slice(0, 30).map((l) => ({ ...l, loggedAt: new Date(l.loggedAt) }));
}

// Waste Exchange Listings & Inquiries
export async function listWasteExchange(filters?: { category?: string; district?: string; search?: string }): Promise<WasteExchangeListingRecord[]> {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql<WasteExchangeListingRecord[]>`
      SELECT id, user_id AS "userId", seller_name AS "sellerName", category, title, description,
             quantity_kg AS "quantityKg", price_per_kg AS "pricePerKg", is_free AS "isFree",
             location, district, contact_phone AS "contactPhone", status, inquiries_count AS "inquiriesCount",
             created_at AS "createdAt"
      FROM rytha_waste_exchange_listings
      ORDER BY created_at DESC LIMIT 80
    `;
    const seedIfEmpty = rows.length > 0 ? rows : getMemoryStore().wasteListings.map((r) => ({ ...r, createdAt: new Date(r.createdAt) }));
    return filterWasteRows(seedIfEmpty, filters);
  }
  const rows = getMemoryStore().wasteListings.map((r) => ({ ...r, createdAt: new Date(r.createdAt) }));
  return filterWasteRows(rows, filters);
}

function filterWasteRows(rows: WasteExchangeListingRecord[], filters?: { category?: string; district?: string; search?: string }) {
  return rows.filter((r) => {
    if (filters?.category && filters.category !== "all" && r.category !== filters.category) return false;
    if (filters?.district && !r.district.toLowerCase().includes(filters.district.toLowerCase())) return false;
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      if (!r.title.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q) && !r.location.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export async function createWasteListing(input: Omit<WasteExchangeListingRecord, "id" | "status" | "inquiriesCount" | "createdAt">): Promise<WasteExchangeListingRecord> {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql<WasteExchangeListingRecord[]>`
      INSERT INTO rytha_waste_exchange_listings (user_id, seller_name, category, title, description, quantity_kg, price_per_kg, is_free, location, district, contact_phone)
      VALUES (${input.userId}, ${input.sellerName}, ${input.category}, ${input.title}, ${input.description}, ${input.quantityKg}, ${input.pricePerKg}, ${input.isFree}, ${input.location}, ${input.district}, ${input.contactPhone})
      RETURNING id, user_id AS "userId", seller_name AS "sellerName", category, title, description,
                quantity_kg AS "quantityKg", price_per_kg AS "pricePerKg", is_free AS "isFree",
                location, district, contact_phone AS "contactPhone", status, inquiries_count AS "inquiriesCount",
                created_at AS "createdAt"
    `;
    return rows[0]!;
  }
  const store = getMemoryStore();
  const row = { ...input, id: ++store.nextId, status: "active" as const, inquiriesCount: 0, isDemo: false, createdAt: new Date().toISOString() };
  store.wasteListings.unshift(row);
  saveMemoryStore();
  return { ...row, createdAt: new Date(row.createdAt) };
}

export async function createWasteInquiry(listingId: number, buyerUserId: number, buyerName: string, buyerPhone: string, message: string) {
  const sql = await getPgSql();
  if (sql) {
    await sql`
      INSERT INTO rytha_waste_exchange_inquiries (listing_id, buyer_user_id, buyer_name, buyer_phone, message)
      VALUES (${listingId}, ${buyerUserId}, ${buyerName}, ${buyerPhone}, ${message})
    `;
    await sql`UPDATE rytha_waste_exchange_listings SET inquiries_count = inquiries_count + 1 WHERE id = ${listingId}`;
    return { success: true as const };
  }
  const store = getMemoryStore();
  const target = store.wasteListings.find((l) => l.id === listingId);
  if (target) target.inquiriesCount += 1;
  store.wasteInquiries.push({ id: ++store.nextId, listingId, buyerUserId, buyerName, buyerPhone, message, createdAt: new Date().toISOString() });
  saveMemoryStore();
  return { success: true as const };
}

export async function updateWasteListingStatus(userId: number, id: number, status: "active" | "claimed" | "closed") {
  const sql = await getPgSql();
  if (sql) {
    const updated = await sql`
      UPDATE rytha_waste_exchange_listings SET status = ${status} WHERE id = ${id} AND user_id = ${userId} RETURNING id
    `;
    return updated.length > 0;
  }
  const store = getMemoryStore();
  const target = store.wasteListings.find((l) => l.id === id && l.userId === userId);
  if (!target) return false;
  target.status = status;
  saveMemoryStore();
  return true;
}

// Regional Farmer Intelligence Reports
export async function listRegionalIntelReports(filters?: { category?: string; verification?: "all" | "verified" | "unverified" }): Promise<RegionalIntelReportRecord[]> {
  const sql = await getPgSql();
  let rows: RegionalIntelReportRecord[];
  if (sql) {
    const dbRows = await sql<RegionalIntelReportRecord[]>`
      SELECT id, user_id AS "userId", reporter_name AS "reporterName", category, title, crop,
             severity, description, location, latitude, longitude, verified, verified_by AS "verifiedBy",
             corroborations, created_at AS "createdAt"
      FROM rytha_regional_intel_reports ORDER BY created_at DESC LIMIT 100
    `;
    rows = dbRows.length > 0 ? dbRows : getMemoryStore().intelReports.map((r) => ({ ...r, createdAt: new Date(r.createdAt) }));
  } else {
    rows = getMemoryStore().intelReports.map((r) => ({ ...r, createdAt: new Date(r.createdAt) }));
  }
  return rows.filter((r) => {
    if (filters?.category && filters.category !== "all" && r.category !== filters.category) return false;
    if (filters?.verification === "verified" && !r.verified) return false;
    if (filters?.verification === "unverified" && r.verified) return false;
    return true;
  });
}

export async function createRegionalIntelReport(input: Omit<RegionalIntelReportRecord, "id" | "verified" | "verifiedBy" | "corroborations" | "createdAt">): Promise<RegionalIntelReportRecord> {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql<RegionalIntelReportRecord[]>`
      INSERT INTO rytha_regional_intel_reports (user_id, reporter_name, category, title, crop, severity, description, location, latitude, longitude)
      VALUES (${input.userId}, ${input.reporterName}, ${input.category}, ${input.title}, ${input.crop}, ${input.severity}, ${input.description}, ${input.location}, ${input.latitude}, ${input.longitude})
      RETURNING id, user_id AS "userId", reporter_name AS "reporterName", category, title, crop,
                severity, description, location, latitude, longitude, verified, verified_by AS "verifiedBy",
                corroborations, created_at AS "createdAt"
    `;
    return rows[0]!;
  }
  const store = getMemoryStore();
  const row = { ...input, id: ++store.nextId, verified: false, verifiedBy: null, corroborations: 1, corroboratedBy: [input.userId], createdAt: new Date().toISOString() };
  store.intelReports.unshift(row);
  saveMemoryStore();
  return { ...row, createdAt: new Date(row.createdAt) };
}

export async function corroborateRegionalIntel(reportId: number, userId: number): Promise<{ corroborations: number; verified: boolean }> {
  const sql = await getPgSql();
  if (sql) {
    const updated = await sql<{ corroborations: number; verified: boolean }[]>`
      UPDATE rytha_regional_intel_reports
      SET corroborations = corroborations + 1,
          verified = CASE WHEN corroborations + 1 >= 3 THEN true ELSE verified END,
          verified_by = CASE WHEN corroborations + 1 >= 3 AND verified_by IS NULL THEN '3+ Local Farmer Corroborations' ELSE verified_by END
      WHERE id = ${reportId}
      RETURNING corroborations, verified
    `;
    if (updated[0]) return updated[0];
  }
  const store = getMemoryStore();
  const report = store.intelReports.find((r) => r.id === reportId);
  if (!report) return { corroborations: 0, verified: false };
  if (!report.corroboratedBy.includes(userId)) {
    report.corroboratedBy.push(userId);
    report.corroborations += 1;
    if (report.corroborations >= 3 && !report.verified) {
      report.verified = true;
      report.verifiedBy = "3+ Local Farmer Corroborations";
    }
    saveMemoryStore();
  }
  return { corroborations: report.corroborations, verified: report.verified };
}

export async function verifyRegionalIntelByAdmin(reportId: number, verified: boolean, verifierName: string) {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql`
      UPDATE rytha_regional_intel_reports
      SET verified = ${verified}, verified_by = ${verified ? verifierName : null}
      WHERE id = ${reportId} RETURNING id
    `;
    return rows.length > 0;
  }
  const store = getMemoryStore();
  const report = store.intelReports.find((r) => r.id === reportId);
  if (!report) return false;
  report.verified = verified;
  report.verifiedBy = verified ? verifierName : null;
  saveMemoryStore();
  return true;
}

// Crop Failure Analysis History
export async function saveCropFailureAnalysis(input: Omit<CropFailureRecord, "id" | "createdAt">): Promise<CropFailureRecord> {
  const sql = await getPgSql();
  if (sql) {
    const rows = await sql<CropFailureRecord[]>`
      INSERT INTO rytha_crop_failure_analyses (user_id, crop, soil_type, soil_ph, historical_yield_q, actual_yield_q, yield_drop_pct, analysis_json)
      VALUES (${input.userId}, ${input.crop}, ${input.soilType}, ${input.soilPh}, ${input.historicalYieldQ}, ${input.actualYieldQ}, ${input.yieldDropPct}, ${JSON.stringify(input.analysis)}::jsonb)
      RETURNING id, user_id AS "userId", crop, soil_type AS "soilType", soil_ph AS "soilPh",
                historical_yield_q AS "historicalYieldQ", actual_yield_q AS "actualYieldQ",
                yield_drop_pct AS "yieldDropPct", analysis_json AS analysis, created_at AS "createdAt"
    `;
    return rows[0]!;
  }
  const store = getMemoryStore();
  const row = { ...input, id: ++store.nextId, createdAt: new Date().toISOString() };
  store.failureAnalyses.unshift(row);
  saveMemoryStore();
  return { ...row, createdAt: new Date(row.createdAt) };
}

export async function listCropFailureAnalyses(userId: number): Promise<CropFailureRecord[]> {
  const sql = await getPgSql();
  if (sql) {
    return sql<CropFailureRecord[]>`
      SELECT id, user_id AS "userId", crop, soil_type AS "soilType", soil_ph AS "soilPh",
             historical_yield_q AS "historicalYieldQ", actual_yield_q AS "actualYieldQ",
             yield_drop_pct AS "yieldDropPct", analysis_json AS analysis, created_at AS "createdAt"
      FROM rytha_crop_failure_analyses WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 20
    `;
  }
  return getMemoryStore().failureAnalyses.filter((f) => f.userId === userId).map((f) => ({ ...f, createdAt: new Date(f.createdAt) }));
}
