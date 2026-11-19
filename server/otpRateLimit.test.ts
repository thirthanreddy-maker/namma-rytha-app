import { createClient, type RedisClientType } from "redis";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { createRedisOtpLimiter } from "./otpRateLimit";

const REDIS_URL = process.env.REDIS_URL;
const PREFIX = `namma-rytha:test:otp:${process.pid}:${Date.now()}`;
const PHONE = "+919876543210";

describe.skipIf(!REDIS_URL)("Redis OTP rate limiter", () => {
  let redis!: RedisClientType;
  let limiter: ReturnType<typeof createRedisOtpLimiter>;

  beforeAll(async () => {
    redis = createClient({ url: REDIS_URL });
    redis.on("error", (error) => console.error("[Redis test]", error));
    await redis.connect();
    limiter = createRedisOtpLimiter(redis, {
      prefix: PREFIX,
      sendCooldownSeconds: 2,
      verificationWindowSeconds: 2,
      maxChecks: 5,
    });
  });

  beforeEach(async () => {
    await limiter.clear(PHONE);
  });

  afterAll(async () => {
    await limiter.clear(PHONE);
    await limiter.close();
  });

  test("allows exactly one concurrent send claim", async () => {
    const results = await Promise.all(
      Array.from({ length: 50 }, () => limiter.claimSendCooldown(PHONE)),
    );

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.filter((value) => !value)).toHaveLength(49);
  });

  test("enforces the verification-attempt cap across concurrent requests", async () => {
    const results = await Promise.all(
      Array.from({ length: 50 }, () => limiter.consumeVerificationAttempt(PHONE)),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(5);
    expect(results.filter((result) => !result.allowed)).toHaveLength(45);
    expect(Math.max(...results.map((result) => result.count))).toBe(50);
  });

  test("expires the send cooldown and verification counter", async () => {
    expect(await limiter.claimSendCooldown(PHONE)).toBe(true);
    expect(await limiter.claimSendCooldown(PHONE)).toBe(false);
    expect((await limiter.consumeVerificationAttempt(PHONE)).count).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 2_200));

    expect(await limiter.claimSendCooldown(PHONE)).toBe(true);
    const afterExpiry = await limiter.consumeVerificationAttempt(PHONE);
    expect(afterExpiry.count).toBe(1);
    expect(afterExpiry.allowed).toBe(true);
  });
});

if (!REDIS_URL) {
  console.warn("[Redis test] skipped: REDIS_URL is not configured");
}
