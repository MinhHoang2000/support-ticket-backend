import { Request, Response, NextFunction } from 'express';
import { verifyToken, type JwtPayload } from '../lib/jwt';
import { isBlacklisted } from '../lib/tokenBlacklist';
import { ErrorCodes } from '../constants/errorCodes';
import { ResponseHelper } from '../utils/response';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || typeof auth !== 'string') return null;
  const [scheme, token] = auth.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

/**
 * Require valid JWT and reject blacklisted (logged-out) tokens.
 * Attaches req.user (userId, email, roles).
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = getBearerToken(req);
  if (!token) {
    ResponseHelper.unauthorized(res, 'Authorization header with Bearer token required', ErrorCodes.UNAUTHORIZED.code);
    return;
  }
  try {
    const payload = verifyToken(token);
    const blacklisted = await isBlacklisted(token);
    if (blacklisted) {
      ResponseHelper.unauthorized(res, 'Token has been revoked', ErrorCodes.UNAUTHORIZED.code);
      return;
    }
    (req as AuthenticatedRequest).user = payload;
    next();
  } catch {
    ResponseHelper.unauthorized(res, 'Invalid or expired token', ErrorCodes.UNAUTHORIZED.code);
  }
}

/**
 * Require req.user to have admin role. Must be used after requireAuth.
 * Returns 403 if user is not admin.
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthenticatedRequest;
  const roles = authReq.user?.roles ?? [];
  if (!Array.isArray(roles) || !roles.includes('admin')) {
    ResponseHelper.forbidden(res, ErrorCodes.FORBIDDEN.message, ErrorCodes.FORBIDDEN.code);
    return;
  }
  next();
}
