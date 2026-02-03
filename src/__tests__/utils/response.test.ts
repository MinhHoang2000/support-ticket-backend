import { Response } from 'express';
import { ResponseHelper } from '../../utils/response';

describe('ResponseHelper', () => {
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('success', () => {
    it('should send 200 with data and message', () => {
      ResponseHelper.success(mockRes as Response, { id: 1 }, 'Done');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { id: 1 },
          message: 'Done',
          errorCode: null,
        })
      );
    });

    it('should send custom status code', () => {
      ResponseHelper.success(mockRes as Response, null, 'Created', 201);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('error', () => {
    it('should send status and error payload', () => {
      ResponseHelper.error(mockRes as Response, 'Failed', 500, 'INTERNAL_ERROR');
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Failed',
          errorCode: 'INTERNAL_ERROR',
        })
      );
    });
  });

  describe('notFound', () => {
    it('should send 404 with default message', () => {
      ResponseHelper.notFound(mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'The requested resource was not found.',
          errorCode: 'NOT_FOUND',
        })
      );
    });
  });

  describe('badRequest', () => {
    it('should send 400 with message and code', () => {
      ResponseHelper.badRequest(mockRes as Response, 'Invalid input', 'VALIDATION_ERROR');
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid input',
          errorCode: 'VALIDATION_ERROR',
        })
      );
    });
  });

  describe('unauthorized', () => {
    it('should send 401', () => {
      ResponseHelper.unauthorized(mockRes as Response, 'Login required', 'UNAUTHORIZED');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Login required',
          errorCode: 'UNAUTHORIZED',
        })
      );
    });
  });

  describe('forbidden', () => {
    it('should send 403', () => {
      ResponseHelper.forbidden(mockRes as Response, 'No access', 'FORBIDDEN');
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'No access',
          errorCode: 'FORBIDDEN',
        })
      );
    });
  });
});
