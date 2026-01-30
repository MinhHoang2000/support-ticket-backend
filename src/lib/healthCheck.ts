import { prisma } from './prisma';
import { pingRedis } from './redis';

export interface HealthCheckResult {
  database: 'ok' | 'error';
  redis: 'ok' | 'error';
  databaseError?: string;
  redisError?: string;
}

/**
 * Check database connectivity (Prisma).
 */
export async function checkDatabase(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}

/**
 * Check Redis connectivity.
 */
export async function checkRedis(): Promise<void> {
  await pingRedis();
}

/**
 * Run DB and Redis health checks. Throws on first failure.
 * Call once on server startup before listening.
 */
export async function checkHealthOnStartup(): Promise<void> {
  console.log('[Health] Checking database...');
  await checkDatabase();
  console.log('[Health] Database OK');

  console.log('[Health] Checking Redis...');
  await checkRedis();
  console.log('[Health] Redis OK');
}
