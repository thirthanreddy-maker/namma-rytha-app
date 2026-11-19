import { createClient, type RedisClientType } from "redis";
import { ENV } from "./_core/env";
import { createRedisOtpLimiter } from "./otpRateLimit";

let client: RedisClientType | null = null;
let connecting: Promise<RedisClientType> | null = null;

export async function getRedis() {
  if (!ENV.redisUrl) throw new Error("REDIS_URL is not configured");
  if (client?.isReady) return client;
  if (connecting) return connecting;
  const next = createClient({ url: ENV.redisUrl });
  next.on("error", (error) => console.error("[Redis] connection error", error));
  client = next as RedisClientType;
  connecting = next.connect().then(() => next as RedisClientType).finally(() => { connecting = null; });
  return connecting;
}

export async function getOtpLimiter() {
  return createRedisOtpLimiter(await getRedis());
}
