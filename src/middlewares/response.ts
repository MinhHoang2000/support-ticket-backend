import { Request, Response, NextFunction } from 'express';
import { ResponseHelper } from '../utils/response';

// Extend Express Response type to include our helper methods
declare global {
  namespace Express {
    interface Response {
      success: <T>(data?: T, message?: string, statusCode?: number) => Response;
      error: (message?: string, statusCode?: number, error?: string) => Response;
      notFound: (message?: string) => Response;
      badRequest: (message?: string, error?: string) => Response;
      unauthorized: (message?: string) => Response;
      forbidden: (message?: string) => Response;
    }
  }
}

export const responseMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Attach response helper methods to response object
  res.success = <T>(data?: T, message: string = 'Success', statusCode: number = 200) => {
    return ResponseHelper.success(res, data, message, statusCode);
  };

  res.error = (message: string = 'An error occurred', statusCode: number = 500, error?: string) => {
    return ResponseHelper.error(res, message, statusCode, error);
  };

  res.notFound = (message: string = 'Resource not found') => {
    return ResponseHelper.notFound(res, message);
  };

  res.badRequest = (message: string = 'Bad request', error?: string) => {
    return ResponseHelper.badRequest(res, message, error);
  };

  res.unauthorized = (message: string = 'Unauthorized') => {
    return ResponseHelper.unauthorized(res, message);
  };

  res.forbidden = (message: string = 'Forbidden') => {
    return ResponseHelper.forbidden(res, message);
  };

  next();
};
