import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { appRouter } from "../routers";
import type { TrpcContext } from "./context";
import { sdk } from "./sdk";

type CookieOptions = {
  httpOnly?: boolean;
  path?: string;
  sameSite?: boolean | "lax" | "strict" | "none";
  secure?: boolean;
  maxAge?: number;
  domain?: string;
};

function serializeCookie(name: string, val: string, options: CookieOptions = {}): string {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(val)}`];
  if (typeof options.maxAge === "number") parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  parts.push(`Path=${options.path || "/"}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) {
    const s = options.sameSite === true ? "Strict" : String(options.sameSite);
    parts.push(`SameSite=${s.charAt(0).toUpperCase() + s.slice(1)}`);
  }
  return parts.join("; ");
}

export async function handleTrpcFetchRequest(req: Request, endpoint = "/api/trpc"): Promise<Response> {
  return fetchRequestHandler({
    endpoint,
    req,
    router: appRouter,
    createContext: async ({ resHeaders }): Promise<TrpcContext> => {
      const url = new URL(req.url);
      const headersObj: Record<string, string> = {};
      req.headers.forEach((value, key) => {
        headersObj[key.toLowerCase()] = value;
      });

      const reqShim = {
        protocol: url.protocol.replace(":", "") || "https",
        headers: headersObj,
        hostname: url.hostname,
        get: (name: string) => headersObj[name.toLowerCase()],
      } as unknown as ExpressRequest;

      const resShim = {
        cookie: (name: string, val: string, options: CookieOptions = {}) => {
          resHeaders.append("Set-Cookie", serializeCookie(name, val, options));
        },
        clearCookie: (name: string, options: CookieOptions = {}) => {
          resHeaders.append("Set-Cookie", serializeCookie(name, "", { ...options, maxAge: -1000 }));
        },
      } as unknown as ExpressResponse;

      let user = null;
      try {
        user = await sdk.authenticateRequest(reqShim);
      } catch {
        user = null;
      }

      return { req: reqShim, res: resShim, user };
    },
  });
}
