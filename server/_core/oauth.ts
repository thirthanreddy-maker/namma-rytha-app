import { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, OAUTH_STATE_COOKIE_FALLBACK, decodeOAuthState } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getOAuthStateCookieOptions, getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined { const value = req.query[key]; return typeof value === "string" ? value : undefined; }

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const providerError = getQueryParam(req, "error");
    if (providerError) { redirectToOAuthError(res, "provider"); return; }
    if (!code || !state) { redirectToOAuthError(res, "missing"); return; }
    const { nonce, redirectUri, returnPath } = decodeOAuthState(state);
    if (!isValidOAuthRedirectUri(req, redirectUri)) { res.status(400).json({ error: "invalid oauth redirect" }); return; }
    const cookies = parseCookieHeader(req.headers.cookie ?? "");
    const expectedNonce = cookies[OAUTH_STATE_COOKIE] || cookies[OAUTH_STATE_COOKIE_FALLBACK];
    if (!nonce || nonce !== expectedNonce) { res.status(403).json({ error: "invalid oauth state" }); return; }
    const stateCookieOptions = getOAuthStateCookieOptions(req);
    res.clearCookie(OAUTH_STATE_COOKIE, stateCookieOptions);
    res.clearCookie(OAUTH_STATE_COOKIE_FALLBACK, stateCookieOptions);
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) { res.status(400).json({ error: "openId missing from user info" }); return; }
      await db.upsertUser({ openId: userInfo.openId, name: userInfo.name || null, email: userInfo.email ?? null, loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null, lastSignedIn: new Date() });
      const signedInUser = await db.getUserByOpenId(userInfo.openId);
      if (signedInUser) await db.createSignInHistory(signedInUser.id, userInfo.loginMethod ?? userInfo.platform ?? "OAuth");
      const sessionToken = await sdk.createSessionToken(userInfo.openId, { name: userInfo.name || "", expiresInMs: ONE_YEAR_MS });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, getOAuthSuccessPath(returnPath));
    } catch (error) { console.error("[OAuth] Callback failed", error); redirectToOAuthError(res, "server"); }
  });
}

function redirectToOAuthError(res: Response, reason: "provider" | "missing" | "server") {
  res.redirect(302, `/auth?mode=signin&oauthError=${reason}`);
}

export function getOAuthSuccessPath(returnPath?: string) {
  const safePath = returnPath && returnPath.startsWith("/") && !returnPath.startsWith("//") ? returnPath : "/app";
  const welcomeUrl = new URL(safePath, "https://namma-rytha.invalid");
  welcomeUrl.searchParams.set("welcome", "1");
  return `${welcomeUrl.pathname}${welcomeUrl.search}`;
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto?.split(",") ?? [];
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

/**
 * Validate the redirect encoded in OAuth state against the public request
 * origin. WebDev and production proxies can preserve the public host in
 * x-forwarded-host while Express sees an internal upstream Host value.
 */
export function isValidOAuthRedirectUri(req: Request, redirectUri: string) {
  let redirect: URL;
  try { redirect = new URL(redirectUri); } catch { return false; }
  if (redirect.pathname !== "/api/oauth/callback" || redirect.search || redirect.hash || redirect.username || redirect.password) return false;
  if (isSecureRequest(req) && redirect.protocol !== "https:") return false;
  if (!isSecureRequest(req) && redirect.protocol !== "http:" && redirect.protocol !== "https:") return false;

  const forwardedHost = req.headers["x-forwarded-host"];
  const forwardedHosts = (Array.isArray(forwardedHost) ? forwardedHost : forwardedHost?.split(",") ?? [])
    .flatMap(value => value.split(","))
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  const requestHost = req.get("host")?.trim().toLowerCase();
  const allowedHosts = new Set([...(requestHost ? [requestHost] : []), ...forwardedHosts]);
  return allowedHosts.has(redirect.host.toLowerCase());
}
