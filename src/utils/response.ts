import { Response } from 'express';
import { ApiResponse } from '../types/response';

export class ResponseHelper {
  static success<T>(
    res: Response,
    data?: T,
    message: string = 'Success',
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      errorCode: null,
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(response);
  }

  /** Sends error response with general message and errorCode. Never includes stack or internal details. */
  static error(
    res: Response,
    message: string = 'An error occurred',
    statusCode: number = 500,
    errorCode?: string
  ): Response {
    const response: ApiResponse = {
      success: false,
      data: undefined,
      message,
      errorCode: errorCode ?? null,
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(response);
  }

  static notFound(res: Response, message?: string, errorCode?: string): Response {
    return this.error(res, message ?? 'The requested resource was not found.', 404, errorCode ?? 'NOT_FOUND');
  }

  static badRequest(res: Response, message?: string, errorCode?: string): Response {
    return this.error(res, message ?? 'The request is invalid.', 400, errorCode ?? 'BAD_REQUEST');
  }

  static unauthorized(res: Response, message?: string, errorCode?: string): Response {
    return this.error(res, message ?? 'Authentication is required.', 401, errorCode ?? 'UNAUTHORIZED');
  }

  static forbidden(res: Response, message?: string, errorCode?: string): Response {
    return this.error(res, message ?? 'You do not have permission.', 403, errorCode ?? 'FORBIDDEN');
  }
}
