import type { RedisClientType } from "redis";

const SEND_COOLDOWN_LUA = `
  local created = redis.call('SET', KEYS[1], '1', 'EX', ARGV[1], 'NX')
  if created then return 1 else return 0 end
`;

const CONSUME_ATTEMPT_LUA = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
  local ttl = redis.call('TTL', KEYS[1])
  return { count, ttl }
`;

export function createRedisOtpLimiter(redis: RedisClientType, options: { prefix?: string; sendCooldownSeconds?: number; verificationWindowSeconds?: number; maxChecks?: number } = {}) {
  const prefix = options.prefix ?? "namma-rytha:otp";
  const sendCooldownSeconds = options.sendCooldownSeconds ?? 60;
  const verificationWindowSeconds = options.verificationWindowSeconds ?? 600;
  const maxChecks = options.maxChecks ?? 5;
  const key = (kind: "send" | "checks", phone: string) => `${prefix}:${kind}:${phone}`;

  return {
    async claimSendCooldown(phone: string) {
      const result = await redis.eval(SEND_COOLDOWN_LUA, { keys: [key("send", phone)], arguments: [String(sendCooldownSeconds)] });
      return Number(result) === 1;
    },
    async consumeVerificationAttempt(phone: string) {
      const result = await redis.eval(CONSUME_ATTEMPT_LUA, { keys: [key("checks", phone)], arguments: [String(verificationWindowSeconds)] });
      const values = Array.isArray(result) ? result.map(Number) : [];
      const count = values[0] ?? Number.NaN;
      const ttl = values[1] ?? Number.NaN;
      return { allowed: Number.isFinite(count) && count <= maxChecks && ttl > 0, count, ttl };
    },
    async clear(phone: string) {
      await redis.del([key("send", phone), key("checks", phone)]);
    },
    async close() {
      if (redis.isOpen) await redis.quit();
    },
  };
}
