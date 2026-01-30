import { Request, Response, NextFunction } from 'express';
import { ResponseHelper } from '../utils/response';
import { ErrorCodes, ErrorCodeName } from '../constants/errorCodes';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  errorCode?: string;
}

export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;
  errorCode: string;
  /** General user-facing message (from ErrorCodes or override). Never includes stack. */
  publicMessage: string;

  constructor(
    errorCode: ErrorCodeName,
    options?: { messageOverride?: string; statusCodeOverride?: number; isOperational?: boolean }
  ) {
    const def = ErrorCodes[errorCode];
    const message = options?.messageOverride ?? def.message;
    super(message);
    this.name = 'CustomError';
    this.statusCode = options?.statusCodeOverride ?? def.statusCode;
    this.isOperational = options?.isOperational ?? true;
    this.errorCode = def.code;
    this.publicMessage = message;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handler middleware - never sends stack or internal details in API response
export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const NODE_ENV = process.env.NODE_ENV || 'development';

  // Log error details (stack only in logs, never in response)
  console.error('Error:', {
    message: err.message,
    stack: NODE_ENV === 'development' ? (err as Error).stack : undefined,
    statusCode: (err as AppError).statusCode,
    errorCode: (err as AppError).errorCode,
    path: req.path,
    method: req.method,
  });

  const appErr = err as AppError;
  const statusCode = appErr.statusCode ?? 500;

  // Use only general message and errorCode - never expose stack or internal details
  const message =
    err instanceof CustomError ? err.publicMessage : ErrorCodes.INTERNAL_ERROR.message;
  const errorCode =
    err instanceof CustomError ? err.errorCode : ErrorCodes.INTERNAL_ERROR.code;

  ResponseHelper.error(res, message, statusCode, errorCode);
};

// 404 handler for unknown routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  ResponseHelper.error(
    res,
    ErrorCodes.NOT_FOUND.message,
    ErrorCodes.NOT_FOUND.statusCode,
    ErrorCodes.NOT_FOUND.code
  );
};

/**
 * Async handler wrapper to catch errors in async routes
 * 
 * Usage example:
 * app.get('/users/:id', asyncHandler(async (req, res) => {
 *   const user = await getUserById(req.params.id);
 *   if (!user) throw new CustomError('NOT_FOUND');
 *   res.success(user, 'User retrieved successfully');
 * }));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
