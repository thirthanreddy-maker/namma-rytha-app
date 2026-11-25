import { describe, expect, it } from "vitest";
import { reverseGeocodeCoordinates } from "./engines/locationEngine";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("Namma Rytha Centralized Location & Reverse Geocoding", () => {
  it("rejects out-of-range coordinates without inventing a place name", async () => {
    const result = await reverseGeocodeCoordinates(999, 77.5);
    expect(result.ok).toBe(false);
    expect(result.formattedAddress).toBeNull();
    expect(result.provider).toBe("unavailable");
    expect(result.error).toBe("invalid_coordinates");
  });

  it("validates latitude/longitude bounds in the tRPC location.reverseGeocode endpoint", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.location.reverseGeocode({ lat: 120, lng: 77 })).rejects.toThrow();
  });
});
