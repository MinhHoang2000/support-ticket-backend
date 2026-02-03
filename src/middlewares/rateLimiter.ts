import rateLimit, { ipKeyGenerator, Options } from 'express-rate-limit';
import { Request, Response } from 'express';
import { ResponseHelper } from '../utils/response';
import { ErrorCodes } from '../constants/errorCodes';
import { createRedisStore, isRedisConfigured } from '../lib/redisStore';

/** Default: 100 requests per 60 seconds per IP */
const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX = 100;

/**
 * Get client IP for rate limit key.
 * Uses X-Forwarded-For when behind a proxy (set app.set('trust proxy', 1) if needed).
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

const defaultHandler = (req: Request, res: Response) => {
  ResponseHelper.error(
    res,
    ErrorCodes.RATE_LIMIT_EXCEEDED.message,
    ErrorCodes.RATE_LIMIT_EXCEEDED.statusCode,
    ErrorCodes.RATE_LIMIT_EXCEEDED.code
  );
};

/**
 * Default rate limiter: 100 requests per 60 seconds per IP.
 * Identify clients by IP (supports X-Forwarded-For when behind proxy).
 */
const defaultStore = isRedisConfigured()
  ? createRedisStore(DEFAULT_WINDOW_MS)
  : undefined;

export const defaultRateLimiter = rateLimit({
  windowMs: DEFAULT_WINDOW_MS,
  max: DEFAULT_MAX,
  store: defaultStore,
  keyGenerator: (req, res) => ipKeyGenerator(getClientIp(req)),
  standardHeaders: true,
  legacyHeaders: false,
  handler: defaultHandler,
  passOnStoreError: true,
});

export interface RateLimiterOptions {
  /** Time window in milliseconds (default: 60000) */
  windowMs?: number;
  /** Max requests per window per IP (default: 100) */
  max?: number;
  /** Optional custom message when limit exceeded */
  message?: string;
}

/**
 * Create a rate limiter with custom limits for a specific route or API.
 * Uses IP for identifying quotas.
 *
 * @example
 * // Stricter for ticket creation: 10 requests per minute
 * const createTicketLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });
 * router.post('/tickets', createTicketLimiter, ...);
 *
 * @example
 * // Relaxed for health: 1000 per minute
 * const healthLimiter = createRateLimiter({ max: 1000 });
 */
export function createRateLimiter(options: RateLimiterOptions = {}) {
  const { windowMs = DEFAULT_WINDOW_MS, max = DEFAULT_MAX, message } = options;
  const store = isRedisConfigured() ? createRedisStore(windowMs) : undefined;
  const config: Partial<Options> = {
    windowMs,
    max,
    store,
    keyGenerator: (req, res) => ipKeyGenerator(getClientIp(req)),
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    handler: (req, res) => {
      ResponseHelper.error(
        res,
        message ?? ErrorCodes.RATE_LIMIT_EXCEEDED.message,
        ErrorCodes.RATE_LIMIT_EXCEEDED.statusCode,
        ErrorCodes.RATE_LIMIT_EXCEEDED.code
      );
    },
  };
  return rateLimit(config);
}
