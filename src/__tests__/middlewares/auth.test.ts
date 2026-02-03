import { Request, Response, NextFunction } from 'express';
import { requireAuth, requireAdmin, requireAdminOrAgent } from '../../middlewares/auth';
import { verifyToken } from '../../lib/jwt';
import { isBlacklisted } from '../../lib/tokenBlacklist';

jest.mock('../../lib/jwt');
jest.mock('../../lib/tokenBlacklist');

describe('Auth middlewares', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = { headers: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should return 401 when no Authorization header', async () => {
      await requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(verifyToken).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization is not Bearer', async () => {
      mockRequest.headers = { authorization: 'Basic xyz' };
      await requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 when token is blacklisted', async () => {
      mockRequest.headers = { authorization: 'Bearer my-token' };
      (verifyToken as jest.Mock).mockReturnValue({ userId: 1, email: 'u@e.com', roles: ['user'] });
      (isBlacklisted as jest.Mock).mockResolvedValue(true);

      await requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should attach user and call next when token valid and not blacklisted', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      const payload = { userId: 1, email: 'u@e.com', roles: ['user'] };
      (verifyToken as jest.Mock).mockReturnValue(payload);
      (isBlacklisted as jest.Mock).mockResolvedValue(false);

      await requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect((mockRequest as any).user).toEqual(payload);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when verifyToken throws', async () => {
      mockRequest.headers = { authorization: 'Bearer bad-token' };
      (verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('invalid');
      });

      await requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe('requireAdmin', () => {
    it('should return 403 when user has no admin role', () => {
      (mockRequest as any).user = { userId: 1, roles: ['user'] };
      requireAdmin(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should call next when user has admin role', () => {
      (mockRequest as any).user = { userId: 1, roles: ['admin'] };
      requireAdmin(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireAdminOrAgent', () => {
    it('should return 403 when user has neither admin nor agent', () => {
      (mockRequest as any).user = { userId: 1, roles: ['user'] };
      requireAdminOrAgent(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should call next when user has admin role', () => {
      (mockRequest as any).user = { userId: 1, roles: ['admin'] };
      requireAdminOrAgent(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next when user has agent role', () => {
      (mockRequest as any).user = { userId: 1, roles: ['agent'] };
      requireAdminOrAgent(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
