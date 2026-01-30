import { Request, Response, NextFunction } from 'express';
import { ResponseHelper } from '../utils/response';

// Extend Express Response type to include our helper methods
declare global {
  namespace Express {
    interface Response {
      success: <T>(data?: T, message?: string, statusCode?: number) => Response;
      error: (message?: string, statusCode?: number, errorCode?: string) => Response;
      notFound: (message?: string, errorCode?: string) => Response;
      badRequest: (message?: string, errorCode?: string) => Response;
      unauthorized: (message?: string, errorCode?: string) => Response;
      forbidden: (message?: string, errorCode?: string) => Response;
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

  res.error = (message: string = 'An error occurred', statusCode: number = 500, errorCode?: string) => {
    return ResponseHelper.error(res, message, statusCode, errorCode);
  };

  res.notFound = (message?: string, errorCode?: string) => {
    return ResponseHelper.notFound(res, message, errorCode);
  };

  res.badRequest = (message?: string, errorCode?: string) => {
    return ResponseHelper.badRequest(res, message, errorCode);
  };

  res.unauthorized = (message?: string, errorCode?: string) => {
    return ResponseHelper.unauthorized(res, message, errorCode);
  };

  res.forbidden = (message?: string, errorCode?: string) => {
    return ResponseHelper.forbidden(res, message, errorCode);
  };

  next();
};
