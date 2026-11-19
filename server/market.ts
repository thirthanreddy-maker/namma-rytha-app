import { ENV } from "./_core/env";

export type MarketPrice = { mandi: string; commodity: string; modalPrice: number; minPrice?: number; maxPrice?: number; arrivalDate?: string; source: "ceda-agmarknet" | "fallback" };

const fallback: MarketPrice[] = [
  { mandi: "Kolar APMC", commodity: "Tomato", modalPrice: 2840, minPrice: 2550, maxPrice: 3020, arrivalDate: "2026-09-15", source: "fallback" },
  { mandi: "Bengaluru APMC", commodity: "Tomato", modalPrice: 2610, minPrice: 2350, maxPrice: 2800, arrivalDate: "2026-09-15", source: "fallback" },
  { mandi: "Chikkaballapur", commodity: "Tomato", modalPrice: 2480, minPrice: 2200, maxPrice: 2700, arrivalDate: "2026-09-15", source: "fallback" },
];

export async function getMarketPrices(commodity: string, state?: string, district?: string) {
  if (!ENV.cedaApiUrl || !ENV.cedaApiKey) return { records: fallback.filter((row) => row.commodity.toLowerCase() === commodity.toLowerCase()), source: "fallback" as const, configured: false };
  try {
    const url = new URL(ENV.cedaApiUrl);
    url.search = new URLSearchParams({ commodity, ...(state ? { state } : {}), ...(district ? { district } : {}), limit: "50" }).toString();
    const response = await fetch(url, { headers: { accept: "application/json", authorization: `Bearer ${ENV.cedaApiKey}` } });
    if (!response.ok) throw new Error(`CEDA returned ${response.status}`);
    const payload = await response.json() as { data?: Array<Record<string, unknown>>; records?: Array<Record<string, unknown>> };
    const rows = payload.data ?? payload.records ?? [];
    const records = rows.map((row) => ({ mandi: String(row.market ?? row.mandi ?? row.market_name ?? "Unknown mandi"), commodity: String(row.commodity ?? commodity), modalPrice: Number(row.modal_price ?? row.modalPrice ?? row.price ?? 0), minPrice: Number(row.min_price ?? row.minPrice ?? 0) || undefined, maxPrice: Number(row.max_price ?? row.maxPrice ?? 0) || undefined, arrivalDate: String(row.arrival_date ?? row.date ?? "") || undefined, source: "ceda-agmarknet" as const })).filter((row) => row.modalPrice > 0);
    return { records: records.length ? records : fallback, source: records.length ? "ceda-agmarknet" as const : "fallback" as const, configured: true };
  } catch (error) {
    console.warn("[Market] CEDA feed unavailable", error);
    return { records: fallback, source: "fallback" as const, configured: true };
  }
}
