import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

export type LocationStatus =
  | "idle"
  | "detecting"
  | "ready"
  | "denied"
  | "unavailable"
  | "timeout"
  | "insecure"
  | "unsupported"
  | "error";

export type LocationPermissionState = "prompt" | "granted" | "denied" | "unsupported";

export type DetectedAddress = {
  village: string | null;
  taluk: string | null;
  town: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  formatted: string;
};

type CachedLocation = {
  lat: number | null;
  lng: number | null;
  address: DetectedAddress | null;
  manualLabel: string | null;
  updatedAt: number;
  source: "gps" | "manual";
};

const STORAGE_KEY = "namma-rytha-detected-location";
const STALE_MS = 30 * 60 * 1000;
// Neutral internal fallback coordinates used ONLY for non-UI weather/map API defaults
// when GPS & cache are unavailable; never shown as a detected place name.
const INTERNAL_FALLBACK_COORDS = { lat: 13.135, lng: 78.132 };
const DEFAULT_PLACEHOLDER_LOCATIONS = new Set([
  "kolar district, karnataka",
  "karnataka, india",
]);

function readCache(): CachedLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedLocation;
    if (!parsed || typeof parsed.updatedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(entry: CachedLocation) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore storage quota / private mode failures
  }
}

function getCurrentPositionOnce(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export function useFarmLocation(options?: {
  savedProfileLocation?: string | null;
  onPersistLocation?: (formattedLocation: string) => void;
}) {
  const trpcUtils = trpc.useUtils();
  const initialCache = useMemo(() => readCache(), []);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialCache?.lat !== null && initialCache?.lng !== null && initialCache
      ? { lat: initialCache.lat, lng: initialCache.lng }
      : null,
  );
  const [address, setAddress] = useState<DetectedAddress | null>(initialCache?.address ?? null);
  const [manualLabel, setManualLabel] = useState<string | null>(initialCache?.manualLabel ?? null);
  const [status, setStatus] = useState<LocationStatus>(
    initialCache?.address || initialCache?.manualLabel ? "ready" : "idle",
  );
  const [permissionState, setPermissionState] = useState<LocationPermissionState>("prompt");
  const [error, setError] = useState<string | null>(null);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(initialCache?.updatedAt ?? null);
  const [source, setSource] = useState<"gps" | "cache" | "manual" | "none">(
    initialCache?.source === "manual"
      ? "manual"
      : initialCache?.lat !== null && initialCache?.lat !== undefined
        ? "cache"
        : "none",
  );

  const inFlightRef = useRef(false);
  const hasAutoRequestedRef = useRef(false);
  const savedProfileRef = useRef(options?.savedProfileLocation ?? null);
  const onPersistRef = useRef(options?.onPersistLocation);

  useEffect(() => {
    savedProfileRef.current = options?.savedProfileLocation ?? null;
  }, [options?.savedProfileLocation]);

  useEffect(() => {
    onPersistRef.current = options?.onPersistLocation;
  }, [options?.onPersistLocation]);

  const reverseGeocodeAndStore = useCallback(
    async (lat: number, lng: number, persistToProfile: boolean) => {
      setGeocodeError(null);
      try {
        const geo = await trpcUtils.location.reverseGeocode.fetch({ lat, lng });
        if (geo.ok && geo.formattedAddress) {
          const nextAddress: DetectedAddress = {
            village: geo.village,
            taluk: geo.taluk,
            town: geo.town,
            district: geo.district,
            state: geo.state,
            country: geo.country,
            formatted: geo.formattedAddress,
          };
          const now = Date.now();
          setAddress(nextAddress);
          setManualLabel(null);
          setLastUpdated(now);
          setSource("gps");
          setStatus("ready");
          writeCache({
            lat,
            lng,
            address: nextAddress,
            manualLabel: null,
            updatedAt: now,
            source: "gps",
          });

          const existing = savedProfileRef.current?.trim().toLowerCase() ?? "";
          const shouldPersist =
            persistToProfile ||
            !existing ||
            DEFAULT_PLACEHOLDER_LOCATIONS.has(existing);
          if (shouldPersist && onPersistRef.current) {
            onPersistRef.current(nextAddress.formatted);
          }
          return;
        }

        // Reverse geocoding returned no address — do NOT invent village/district names.
        const now = Date.now();
        setGeocodeError(geo.error ?? "reverse_geocode_unavailable");
        setLastUpdated(now);
        setSource("gps");
        setStatus("ready");
        writeCache({
          lat,
          lng,
          address: null,
          manualLabel: null,
          updatedAt: now,
          source: "gps",
        });
      } catch {
        setGeocodeError("reverse_geocode_failed");
        setLastUpdated(Date.now());
        setSource("gps");
        setStatus("ready");
      }
    },
    [trpcUtils],
  );

  const refreshLocation = useCallback(
    async (opts?: { force?: boolean; silent?: boolean }) => {
      if (inFlightRef.current) return;

      if (typeof window !== "undefined" && !window.isSecureContext) {
        setStatus("insecure");
        setError("Location access requires HTTPS or localhost.");
        return;
      }

      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        setStatus("unsupported");
        setPermissionState("unsupported");
        setError("Geolocation is not supported by this browser.");
        return;
      }

      inFlightRef.current = true;
      setStatus("detecting");
      setError(null);

      try {
        let position: GeolocationPosition;
        try {
          position = await getCurrentPositionOnce({
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: opts?.force ? 0 : 60_000,
          });
        } catch (firstErr) {
          const geoErr = firstErr as GeolocationPositionError;
          // Single fallback retry with standard accuracy if high-accuracy GPS timed out
          if (geoErr?.code === 3) {
            position = await getCurrentPositionOnce({
              enableHighAccuracy: false,
              timeout: 15000,
              maximumAge: 300_000,
            });
          } else {
            throw firstErr;
          }
        }

        const nextLat = Number(position.coords.latitude.toFixed(6));
        const nextLng = Number(position.coords.longitude.toFixed(6));
        setCoords({ lat: nextLat, lng: nextLng });
        setPermissionState("granted");
        await reverseGeocodeAndStore(nextLat, nextLng, Boolean(opts?.force));
      } catch (err) {
        const geoErr = err as GeolocationPositionError | undefined;
        if (geoErr?.code === 1) {
          setPermissionState("denied");
          setStatus("denied");
          setError("Location permission denied. Enable location access in your browser site settings, or enter your location manually.");
        } else if (geoErr?.code === 2) {
          setStatus("unavailable");
          setError("GPS or network location is currently unavailable. Check device location services or enter manually.");
        } else if (geoErr?.code === 3) {
          setStatus("timeout");
          setError("Location request timed out. Move to an open area, retry, or set your location manually.");
        } else {
          setStatus("error");
          setError("Could not detect your current location.");
        }
      } finally {
        inFlightRef.current = false;
      }
    },
    [reverseGeocodeAndStore],
  );

  // Sync permission state & auto-detect once on mount if cache is missing or stale
  useEffect(() => {
    let active = true;
    const init = async () => {
      if (typeof navigator !== "undefined" && navigator.permissions?.query) {
        try {
          const perm = await navigator.permissions.query({ name: "geolocation" as PermissionName });
          if (!active) return;
          setPermissionState(perm.state as LocationPermissionState);
          perm.onchange = () => {
            if (!active) return;
            setPermissionState(perm.state as LocationPermissionState);
            if (perm.state === "granted") {
              void refreshLocation({ force: false });
            } else if (perm.state === "denied") {
              setStatus("denied");
              setError("Location permission denied. Enable location access in browser settings or enter manually.");
            }
          };
          if (perm.state === "denied") {
            setStatus(manualLabel ? "ready" : "denied");
            setError("Location permission denied. Enable location access in browser settings or enter manually.");
            return;
          }
        } catch {
          // Permissions API not supported (e.g., some mobile Safari builds); proceed to getCurrentPosition
        }
      }

      if (hasAutoRequestedRef.current) return;
      hasAutoRequestedRef.current = true;

      const cache = readCache();
      const isFresh = Boolean(cache && Date.now() - cache.updatedAt < STALE_MS && cache.lat !== null && (cache.address || cache.manualLabel));
      if (isFresh) {
        return;
      }
      await refreshLocation({ force: false, silent: true });
    };

    void init();
    return () => {
      active = false;
    };
  }, [manualLabel, refreshLocation]);

  const setManualLocation = useCallback((label: string) => {
    const clean = label.trim();
    if (!clean) return;
    const now = Date.now();
    setManualLabel(clean);
    setAddress(null);
    setError(null);
    setGeocodeError(null);
    setSource("manual");
    setStatus("ready");
    setLastUpdated(now);
    writeCache({
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      address: null,
      manualLabel: clean,
      updatedAt: now,
      source: "manual",
    });
    if (onPersistRef.current) {
      onPersistRef.current(clean);
    }
  }, [coords]);

  const savedNonDefaultProfile = useMemo(() => {
    const raw = options?.savedProfileLocation?.trim();
    if (!raw) return null;
    if (DEFAULT_PLACEHOLDER_LOCATIONS.has(raw.toLowerCase())) return null;
    return raw;
  }, [options?.savedProfileLocation]);

  const displayLocation = useMemo(() => {
    if (manualLabel) return manualLabel;
    if (address?.formatted) return address.formatted;
    if (savedNonDefaultProfile) return savedNonDefaultProfile;
    if (status === "detecting") return "Detecting location…";
    if (coords && geocodeError) return `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`;
    if (status === "denied" || status === "unavailable" || status === "timeout" || status === "insecure") {
      return "Location not set";
    }
    return "Detecting location…";
  }, [manualLabel, address, savedNonDefaultProfile, status, coords, geocodeError]);

  const effectiveCoords = coords ?? INTERNAL_FALLBACK_COORDS;

  return {
    coords,
    effectiveCoords,
    isFallbackCoords: coords === null,
    address,
    displayLocation,
    status,
    permissionState,
    loading: status === "detecting",
    error,
    geocodeError,
    lastUpdated,
    source,
    refreshLocation,
    setManualLocation,
  };
}
