export type ReverseGeocodeResult = {
  ok: boolean;
  village: string | null;
  taluk: string | null;
  town: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  formattedAddress: string | null;
  provider: "nominatim" | "unavailable";
  error?: string;
};

type CacheEntry = {
  expiresAt: number;
  value: ReverseGeocodeResult;
};

const GEOCODE_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function formatFarmerAddress(parts: {
  village: string | null;
  taluk: string | null;
  town: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
}): string | null {
  const ordered: string[] = [];
  const pushUnique = (val: string | null | undefined) => {
    const clean = val?.trim();
    if (!clean) return;
    if (!ordered.some((existing) => existing.toLowerCase() === clean.toLowerCase())) {
      ordered.push(clean);
    }
  };

  pushUnique(parts.village);
  if (!parts.village) pushUnique(parts.town);
  if (parts.taluk && parts.taluk.toLowerCase() !== parts.district?.toLowerCase()) {
    pushUnique(parts.taluk);
  }
  pushUnique(parts.district);
  pushUnique(parts.state);

  if (ordered.length === 0) pushUnique(parts.country);
  return ordered.length > 0 ? ordered.join(", ") : null;
}

export async function reverseGeocodeCoordinates(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return {
      ok: false,
      village: null,
      taluk: null,
      town: null,
      district: null,
      state: null,
      country: null,
      formattedAddress: null,
      provider: "unavailable",
      error: "invalid_coordinates",
    };
  }

  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = GEOCODE_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=14&addressdetails=1`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "NammaRythaApp/2.0 (agricultural-location-service)",
        "Accept-Language": "en",
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        village: null,
        taluk: null,
        town: null,
        district: null,
        state: null,
        country: null,
        formattedAddress: null,
        provider: "unavailable",
        error: `http_${response.status}`,
      };
    }

    const payload = (await response.json()) as {
      address?: Record<string, string | undefined>;
      display_name?: string;
    };

    const addr = payload.address ?? {};
    const village = addr.village ?? addr.hamlet ?? addr.suburb ?? addr.neighbourhood ?? null;
    const town = addr.town ?? addr.city ?? null;
    const taluk = addr.county ?? addr.subdistrict ?? null;
    const district = addr.state_district ?? addr.city_district ?? addr.county ?? addr.city ?? null;
    const state = addr.state ?? null;
    const country = addr.country ?? null;
    const formattedAddress = formatFarmerAddress({ village, taluk, town, district, state, country });

    const result: ReverseGeocodeResult = {
      ok: Boolean(formattedAddress),
      village,
      taluk,
      town,
      district,
      state,
      country,
      formattedAddress,
      provider: formattedAddress ? "nominatim" : "unavailable",
      ...(formattedAddress ? {} : { error: "address_not_found" }),
    };

    if (result.ok) {
      GEOCODE_CACHE.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        value: result,
      });
    }

    return result;
  } catch (error) {
    return {
      ok: false,
      village: null,
      taluk: null,
      town: null,
      district: null,
      state: null,
      country: null,
      formattedAddress: null,
      provider: "unavailable",
      error: error instanceof Error && error.name === "AbortError" ? "timeout" : "network_error",
    };
  } finally {
    clearTimeout(timeout);
  }
}
