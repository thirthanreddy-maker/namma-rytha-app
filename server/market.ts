import { ENV } from "./_core/env";
import { KARNATAKA_MANDI_BENCHMARKS, type CropKey } from "./engines/agronomyData";

export type MarketPrice = {
  mandi: string;
  commodity: string;
  modalPrice: number;
  minPrice?: number;
  maxPrice?: number;
  arrivalDate?: string;
  source: "ceda-agmarknet" | "fallback";
};

function buildFallbackPrices(commodity: string): MarketPrice[] {
  const cropKey =
    ((Object.keys(KARNATAKA_MANDI_BENCHMARKS[0]!.pricesByCrop) as CropKey[]).find(
      (k) => k.toLowerCase() === commodity.trim().toLowerCase()
    ) as CropKey | undefined) ?? "Tomato";

  return KARNATAKA_MANDI_BENCHMARKS.map((m) => {
    const q = m.pricesByCrop[cropKey];
    return {
      mandi: m.mandi,
      commodity: cropKey,
      modalPrice: q.modal,
      minPrice: q.min,
      maxPrice: q.max,
      arrivalDate: new Date().toISOString().slice(0, 10),
      source: "fallback" as const,
    };
  });
}

export async function getMarketPrices(commodity: string, state?: string, district?: string) {
  const fallback = buildFallbackPrices(commodity);
  if (!ENV.cedaApiUrl || !ENV.cedaApiKey) {
    return { records: fallback, source: "fallback" as const, configured: false };
  }
  try {
    const url = new URL(ENV.cedaApiUrl);
    url.search = new URLSearchParams({
      commodity,
      ...(state ? { state } : {}),
      ...(district ? { district } : {}),
      limit: "50",
    }).toString();
    const response = await fetch(url, { headers: { accept: "application/json", authorization: `Bearer ${ENV.cedaApiKey}` } });
    if (!response.ok) throw new Error(`CEDA returned ${response.status}`);
    const payload = (await response.json()) as { data?: Array<Record<string, unknown>>; records?: Array<Record<string, unknown>> };
    const rows = payload.data ?? payload.records ?? [];
    const records = rows
      .map((row) => ({
        mandi: String(row.market ?? row.mandi ?? row.market_name ?? "Unknown mandi"),
        commodity: String(row.commodity ?? commodity),
        modalPrice: Number(row.modal_price ?? row.modalPrice ?? row.price ?? 0),
        minPrice: Number(row.min_price ?? row.minPrice ?? 0) || undefined,
        maxPrice: Number(row.max_price ?? row.maxPrice ?? 0) || undefined,
        arrivalDate: String(row.arrival_date ?? row.date ?? "") || undefined,
        source: "ceda-agmarknet" as const,
      }))
      .filter((row) => row.modalPrice > 0);
    return { records: records.length ? records : fallback, source: records.length ? ("ceda-agmarknet" as const) : ("fallback" as const), configured: true };
  } catch (error) {
    console.warn("[Market] CEDA feed unavailable", error);
    return { records: fallback, source: "fallback" as const, configured: true };
  }
}
