import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler, asyncHandler, CustomError } from '../../middlewares/errorHandler';

describe('errorHandler middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = { path: '/test', method: 'GET' };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should send CustomError statusCode and message', () => {
    const err = new CustomError('NOT_FOUND');
    errorHandler(
      err,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'The requested resource was not found.',
        errorCode: 'NOT_FOUND',
      })
    );
  });

  it('should send 500 and INTERNAL_ERROR for generic Error', () => {
    const err = new Error('Something broke');
    errorHandler(
      err,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
      })
    );
  });
});

describe('notFoundHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it('should send 404 with NOT_FOUND', () => {
    notFoundHandler(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errorCode: 'NOT_FOUND',
      })
    );
  });
});

describe('asyncHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    mockNext = jest.fn();
  });

  it('should call next with error when async fn rejects', async () => {
    const err = new Error('Async error');
    const handler = asyncHandler(async () => {
      throw err;
    });
    await handler(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );
    expect(mockNext).toHaveBeenCalledWith(err);
  });

  it('should not call next when async fn resolves', async () => {
    const handler = asyncHandler(async (req, res) => {
      (res as any).done = true;
    });
    await handler(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );
    expect(mockNext).not.toHaveBeenCalled();
  });
});
