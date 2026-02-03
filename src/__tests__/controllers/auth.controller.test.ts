import { Request, Response } from 'express';
import { AuthController } from '../../controllers/auth.controller';
import { authService, AuthServiceError } from '../../services/auth.service';
import { addToBlacklist } from '../../lib/tokenBlacklist';
import { isRedisConfigured } from '../../lib/redisStore';

jest.mock('../../services/auth.service', () => {
  const actual = jest.requireActual<typeof import('../../services/auth.service')>('../../services/auth.service');
  return {
    ...actual,
    authService: {
      signup: jest.fn(),
      login: jest.fn(),
    },
  };
});
jest.mock('../../lib/tokenBlacklist');
jest.mock('../../lib/redisStore');

describe('AuthController', () => {
  let authController: AuthController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    authController = new AuthController();
    mockRequest = { body: {} };
    mockResponse = {
      success: jest.fn().mockReturnThis(),
      error: jest.fn().mockReturnThis(),
      unauthorized: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('signup', () => {
    const signupBody = {
      email: 'user@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should create user and return 201', async () => {
      const user = {
        id: 1,
        email: signupBody.email,
        firstName: signupBody.firstName,
        lastName: signupBody.lastName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (authService.signup as jest.Mock).mockResolvedValue(user);
      mockRequest.body = signupBody;

      await authController.signup(mockRequest as Request, mockResponse as Response);

      expect(authService.signup).toHaveBeenCalledWith({
        email: signupBody.email,
        password: signupBody.password,
        firstName: signupBody.firstName,
        lastName: signupBody.lastName,
      });
      expect(mockResponse.success).toHaveBeenCalledWith(
        user,
        'Account created successfully',
        201
      );
    });

    it('should return 409 when email already exists', async () => {
      (authService.signup as jest.Mock).mockRejectedValue(
        new AuthServiceError('An account with this email already exists.', 'EMAIL_EXISTS')
      );
      mockRequest.body = signupBody;

      await authController.signup(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.error).toHaveBeenCalledWith(
        'An account with this email already exists.',
        409,
        'CONFLICT'
      );
      expect(mockResponse.success).not.toHaveBeenCalled();
    });

    it('should rethrow non-AuthServiceError', async () => {
      (authService.signup as jest.Mock).mockRejectedValue(new Error('DB error'));
      mockRequest.body = signupBody;

      await expect(
        authController.signup(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('DB error');
    });
  });

  describe('login', () => {
    const loginBody = { email: 'user@example.com', password: 'password123' };

    it('should return user and token on success', async () => {
      const result = {
        user: { id: 1, email: loginBody.email, firstName: 'J', lastName: 'D' },
        token: 'jwt-token',
      };
      (authService.login as jest.Mock).mockResolvedValue(result);
      mockRequest.body = loginBody;

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(authService.login).toHaveBeenCalledWith(loginBody.email, loginBody.password);
      expect(mockResponse.success).toHaveBeenCalledWith(
        result,
        'Logged in successfully'
      );
    });

    it('should return 401 when credentials invalid', async () => {
      (authService.login as jest.Mock).mockRejectedValue(
        new AuthServiceError('Invalid email or password.', 'INVALID_CREDENTIALS')
      );
      mockRequest.body = loginBody;

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.unauthorized).toHaveBeenCalledWith(
        'Invalid email or password.',
        'UNAUTHORIZED'
      );
      expect(mockResponse.success).not.toHaveBeenCalled();
    });

    it('should rethrow non-AuthServiceError', async () => {
      (authService.login as jest.Mock).mockRejectedValue(new Error('Network error'));
      mockRequest.body = loginBody;

      await expect(
        authController.login(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('Network error');
    });
  });

  describe('logout', () => {
    it('should return success without blacklisting when Redis not configured', async () => {
      (isRedisConfigured as jest.Mock).mockReturnValue(false);
      mockRequest.headers = {};

      await authController.logout(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.success).toHaveBeenCalledWith(null, 'Logged out successfully');
      expect(addToBlacklist).not.toHaveBeenCalled();
    });

    it('should blacklist token and return success when Redis configured and Bearer present', async () => {
      (isRedisConfigured as jest.Mock).mockReturnValue(true);
      mockRequest.headers = { authorization: 'Bearer my-token' };
      (addToBlacklist as jest.Mock).mockResolvedValue(undefined);

      await authController.logout(mockRequest as Request, mockResponse as Response);

      expect(addToBlacklist).toHaveBeenCalledWith('my-token');
      expect(mockResponse.success).toHaveBeenCalledWith(null, 'Logged out successfully');
    });

    it('should not call addToBlacklist when no Bearer token', async () => {
      (isRedisConfigured as jest.Mock).mockReturnValue(true);
      mockRequest.headers = {};

      await authController.logout(mockRequest as Request, mockResponse as Response);

      expect(addToBlacklist).not.toHaveBeenCalled();
      expect(mockResponse.success).toHaveBeenCalledWith(null, 'Logged out successfully');
    });
  });
});
