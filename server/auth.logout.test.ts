import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import { getSessionCookieOptions } from "./_core/cookies";
import { getOAuthSuccessPath, isValidOAuthRedirectUri } from "./_core/oauth";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "lax",
      httpOnly: true,
      path: "/",
    });
  });

  it("uses HttpOnly SameSite=Lax cookies and only enables Secure on HTTPS", () => {
    const httpsOptions = getSessionCookieOptions({ protocol: "https", headers: {} } as TrpcContext["req"]);
    const httpOptions = getSessionCookieOptions({ protocol: "http", headers: {} } as TrpcContext["req"]);
    expect(httpsOptions).toMatchObject({ httpOnly: true, sameSite: "lax", secure: true, path: "/" });
    expect(httpOptions).toMatchObject({ httpOnly: true, sameSite: "lax", secure: false, path: "/" });
  });

  it("accepts the public forwarded host used by the deployment proxy", () => {
    const req = {
      protocol: "http",
      headers: { "x-forwarded-proto": "https", "x-forwarded-host": "nammafarm-7aptvepg.manus.space" },
      get: (name: string) => name === "host" ? "127.0.0.1:3000" : undefined,
    } as TrpcContext["req"];
    expect(isValidOAuthRedirectUri(req, "https://nammafarm-7aptvepg.manus.space/api/oauth/callback")).toBe(true);
  });

  it("rejects a redirect to another origin or a different callback path", () => {
    const req = {
      protocol: "https",
      headers: {},
      get: () => "nammafarm-7aptvepg.manus.space",
    } as TrpcContext["req"];
    expect(isValidOAuthRedirectUri(req, "https://evil.example/api/oauth/callback")).toBe(false);
    expect(isValidOAuthRedirectUri(req, "https://nammafarm-7aptvepg.manus.space/app")).toBe(false);
  });

  it("adds a one-time welcome marker without allowing an external redirect", () => {
    expect(getOAuthSuccessPath("/app")).toBe("/app?welcome=1");
    expect(getOAuthSuccessPath("/app?view=profile")).toBe("/app?view=profile&welcome=1");
    expect(getOAuthSuccessPath("https://evil.example")).toBe("/app?welcome=1");
  });
});
