import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { redis } from './redis';

const PREFIX = 'jwt:blacklist:';

function tokenKey(token: string): string {
  return PREFIX + crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Add a JWT to the blacklist so it is rejected until it expires.
 * Uses token's exp claim for TTL so keys auto-expire.
 */
export async function addToBlacklist(token: string): Promise<void> {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) return;
  const ttlMs = decoded.exp * 1000 - Date.now();
  if (ttlMs <= 0) return;
  const key = tokenKey(token);
  await redis.set(key, '1', 'PX', Math.min(ttlMs, 7 * 24 * 60 * 60 * 1000)); // cap at 7d
}

/**
 * Returns true if the token is blacklisted (logout/invalidated).
 */
export async function isBlacklisted(token: string): Promise<boolean> {
  const key = tokenKey(token);
  const value = await redis.get(key);
  return value === '1';
}
