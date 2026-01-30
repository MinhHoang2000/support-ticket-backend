import { Request, Response, NextFunction } from 'express';
import { ResponseHelper } from '../utils/response';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handler middleware
export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const NODE_ENV = process.env.NODE_ENV || 'development';

  // Log error details
  console.error('Error:', {
    message: err.message,
    stack: NODE_ENV === 'development' ? err.stack : undefined,
    statusCode: (err as AppError).statusCode,
    path: req.path,
    method: req.method,
  });

  // Determine status code
  const statusCode = (err as AppError).statusCode || 500;
  const isOperational = (err as AppError).isOperational !== false;

  // Prepare error message
  let message = err.message || 'An unexpected error occurred';
  
  // In production, don't expose internal error details
  if (NODE_ENV === 'production' && !isOperational) {
    message = 'An unexpected error occurred. Please try again later.';
  }

  // Send error response using standardized format
  ResponseHelper.error(res, message, statusCode, NODE_ENV === 'development' ? err.message : undefined);
};

// 404 handler for unknown routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  ResponseHelper.notFound(res, `Route ${req.method} ${req.path} not found`);
};

/**
 * Async handler wrapper to catch errors in async routes
 * 
 * Usage example:
 * app.get('/users/:id', asyncHandler(async (req, res) => {
 *   const user = await getUserById(req.params.id);
 *   if (!user) throw new CustomError('User not found', 404);
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
