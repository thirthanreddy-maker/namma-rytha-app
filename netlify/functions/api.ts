import { handleTrpcFetchRequest } from "../../server/_core/fetchHandler";

export const handler = async (event: {
  httpMethod: string;
  path: string;
  rawUrl?: string;
  rawQuery?: string;
  queryStringParameters?: Record<string, string | undefined>;
  headers?: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
}) => {
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,Cookie",
    "Access-Control-Allow-Credentials": "true",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  const normalizedPath = (event.path || "/api/trpc")
    .replace(/^\/\.netlify\/functions\/api/, "/api")
    .replace(/^\/api\/api/, "/api");

  const query = event.rawQuery
    ? `?${event.rawQuery}`
    : event.queryStringParameters && Object.keys(event.queryStringParameters).length > 0
      ? `?${new URLSearchParams(
          Object.entries(event.queryStringParameters).filter(([, v]) => v !== undefined) as [string, string][]
        ).toString()}`
      : "";

  const host = event.headers?.host || "rytha.netlify.app";
  const proto = event.headers?.["x-forwarded-proto"] || "https";
  const fullUrl = `${proto}://${host}${normalizedPath}${query}`;

  const reqHeaders = new Headers();
  if (event.headers) {
    for (const [k, v] of Object.entries(event.headers)) {
      if (v !== undefined) reqHeaders.set(k, v);
    }
  }

  const bodyBuffer =
    event.body && event.httpMethod !== "GET" && event.httpMethod !== "HEAD"
      ? event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : event.body
      : undefined;

  const webReq = new Request(fullUrl, {
    method: event.httpMethod,
    headers: reqHeaders,
    body: bodyBuffer,
  });

  const webRes = await handleTrpcFetchRequest(webReq, "/api/trpc");
  const text = await webRes.text();

  const outHeaders: Record<string, string> = { ...corsHeaders };
  const setCookies: string[] = [];
  webRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      setCookies.push(value);
    } else {
      outHeaders[key] = value;
    }
  });

  return {
    statusCode: webRes.status,
    headers: outHeaders,
    ...(setCookies.length > 0 ? { multiValueHeaders: { "Set-Cookie": setCookies } } : {}),
    body: text,
  };
};
