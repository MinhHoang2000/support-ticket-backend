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
      error: null,
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string = 'An error occurred',
    statusCode: number = 500,
    error?: string
  ): Response {
    const response: ApiResponse = {
      success: false,
      data: undefined,
      message,
      error: error || message,
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(response);
  }

  static notFound(res: Response, message: string = 'Resource not found'): Response {
    return this.error(res, message, 404);
  }

  static badRequest(res: Response, message: string = 'Bad request', error?: string): Response {
    return this.error(res, message, 400, error);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return this.error(res, message, 401);
  }

  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    return this.error(res, message, 403);
  }
}
