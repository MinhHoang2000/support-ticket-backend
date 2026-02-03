import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

function createRedisClient(): Redis {
  const host = process.env.REDIS_HOST ?? 'localhost';
  const port = Number(process.env.REDIS_PORT ?? 6379);
  const password = process.env.REDIS_PASSWORD?.trim();
  const hasPassword = Boolean(password);

  const client = new Redis({
    host,
    port,
    ...(hasPassword ? { password } : {}),
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
  });

  client.on('error', (err) => {
    console.error('[Redis] connection error:', err.message);
  });

  client.on('connect', () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Redis] connected');
    }
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

/**
 * Ping Redis to verify connectivity. Use for startup and health checks.
 */
export async function pingRedis(): Promise<void> {
  const result = await redis.ping();
  if (result !== 'PONG') {
    throw new Error(`Redis ping failed: expected PONG, got ${result}`);
  }
}
