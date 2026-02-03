import type { ClientRateLimitInfo, Store } from 'express-rate-limit';
import { redis } from './redis';

const PREFIX = 'rl:';

/**
 * Create a Redis-backed store for express-rate-limit.
 * Shares limits across instances and survives restarts.
 * Use when REDIS_HOST is set; otherwise use default in-memory store.
 */
export function createRedisStore(windowMs: number): Store {
  return {
    localKeys: false,

    async increment(key: string): Promise<ClientRateLimitInfo> {
      const rkey = PREFIX + key;
      const multi = redis.multi();
      multi.incr(rkey);
      multi.pttl(rkey);
      const results = await multi.exec();
      if (!results || results.length < 2) {
        throw new Error('Redis store increment failed');
      }
      const incrResult = results[0];
      const ttlResult = results[1];
      if (incrResult[0]) throw incrResult[0];
      if (ttlResult[0]) throw ttlResult[0];
      const totalHits = incrResult[1] as number;
      let ttl = ttlResult[1] as number;
      if (ttl === -1 || ttl < 0) {
        await redis.pexpire(rkey, windowMs);
        ttl = windowMs;
      }
      const resetTime = new Date(Date.now() + ttl);
      return { totalHits, resetTime };
    },

    async decrement(key: string): Promise<void> {
      const rkey = PREFIX + key;
      await redis.decr(rkey);
    },

    async resetKey(key: string): Promise<void> {
      await redis.del(PREFIX + key);
    },

    async resetAll(): Promise<void> {
      const keys = await redis.keys(PREFIX + '*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    },
  };
}

/**
 * Whether Redis is configured (host set) and can be used for rate limit store.
 */
export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_HOST);
}
