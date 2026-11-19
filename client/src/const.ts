import { OAUTH_STATE_COOKIE, OAUTH_STATE_COOKIE_FALLBACK, encodeOAuthState } from "@shared/const";
export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const startLogin = (returnPath = "/app") => {
  // These are public OAuth routing values, not credentials. The fallbacks keep
  // sign-in usable in WebDev previews where VITE_* values may not be injected
  // into the client bundle; private OAuth and session secrets remain server-side.
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL || "https://manus.im";
  const appId = import.meta.env.VITE_APP_ID || "j44ZSouSqyhJgeBh4tXcZ8";
  if (!oauthPortalUrl || !appId) {
    throw new Error("Secure sign-in is not configured for this deployment.");
  }
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const nonce = crypto.randomUUID();
  const secure = window.location.protocol === "https:";
  const cookieName = secure ? OAUTH_STATE_COOKIE : OAUTH_STATE_COOKIE_FALLBACK;
  document.cookie = `${cookieName}=${nonce}; Path=/; Max-Age=600; SameSite=Lax${secure ? "; Secure" : ""}`;
  const state = encodeOAuthState({ redirectUri, nonce, returnPath: returnPath.startsWith("/") ? returnPath : "/app" });
  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  window.location.href = url.toString();
};
