import type { IncomingMessage, ServerResponse } from "node:http";
import { handleTrpcFetchRequest } from "../server/_core/fetchHandler";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,Cookie");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  const chunks: Buffer[] = [];
  if (req.method !== "GET" && req.method !== "HEAD") {
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
  }

  const proto = String(req.headers["x-forwarded-proto"] || "https");
  const host = String(req.headers.host || "localhost");
  const url = `${proto}://${host}${req.url || "/api/trpc"}`;

  const reqHeaders = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") reqHeaders.set(k, v);
    else if (Array.isArray(v)) reqHeaders.set(k, v.join(", "));
  }

  const webReq = new Request(url, {
    method: req.method || "GET",
    headers: reqHeaders,
    body: chunks.length > 0 ? Buffer.concat(chunks) : undefined,
  });

  const webRes = await handleTrpcFetchRequest(webReq, "/api/trpc");
  res.statusCode = webRes.status;

  const setCookies: string[] = [];
  webRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") setCookies.push(value);
    else res.setHeader(key, value);
  });
  if (setCookies.length > 0) res.setHeader("Set-Cookie", setCookies);

  const responseText = await webRes.text();
  res.end(responseText);
}
