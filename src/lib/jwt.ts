import jwt, { type SignOptions } from 'jsonwebtoken';

const rawSecret =
  process.env.JWT_SECRET ??
  (process.env.NODE_ENV === 'test' ? 'test-secret-do-not-use-in-production' : undefined);
if (!rawSecret?.trim()) {
  throw new Error(
    'JWT_SECRET is required. Set JWT_SECRET in .env (and never use a fallback in production).'
  );
}
const JWT_SECRET: string = rawSecret;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JwtPayload {
  userId: number;
  email: string;
  roles: string[];
}

const signOptions: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] };

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, signOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
