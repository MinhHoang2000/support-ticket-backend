import bcrypt from 'bcrypt';
import { AuthService, AuthServiceError } from '../../services/auth.service';
import { prisma } from '../../lib/prisma';
import { signToken } from '../../lib/jwt';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));
jest.mock('bcrypt');
jest.mock('../../lib/jwt', () => ({
  signToken: jest.fn(() => 'mock-jwt-token'),
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const user = { id: 1, email: 'user@example.com', password: 'hash' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      const result = await authService.findByEmail('user@example.com');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(result).toEqual(user);
    });

    it('should normalize email to lowercase', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await authService.findByEmail('User@Example.COM');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
    });

    it('should return null when not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await authService.findByEmail('nobody@example.com');
      expect(result).toBeNull();
    });
  });

  describe('signup', () => {
    const data = {
      email: 'new@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
    };

    it('should throw AuthServiceError when email exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1, email: data.email });
      await expect(authService.signup(data)).rejects.toThrow(AuthServiceError);
      await expect(authService.signup(data)).rejects.toMatchObject({
        code: 'EMAIL_EXISTS',
        message: 'An account with this email already exists.',
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should create user and return safe user without password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      const created = {
        id: 1,
        email: 'new@example.com',
        password: 'hashed',
        firstName: 'Jane',
        lastName: 'Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.user.create as jest.Mock).mockResolvedValue(created);

      const result = await authService.signup(data);

      expect(bcrypt.hash).toHaveBeenCalledWith(data.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          password: 'hashed',
          firstName: 'Jane',
          lastName: 'Doe',
        },
      });
      expect(result).not.toHaveProperty('password');
      expect(result).toMatchObject({
        id: 1,
        email: 'new@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      });
    });
  });

  describe('login', () => {
    it('should throw INVALID_CREDENTIALS when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(authService.login('nobody@example.com', 'pass')).rejects.toThrow(
        AuthServiceError
      );
      await expect(authService.login('nobody@example.com', 'pass')).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('should throw INVALID_CREDENTIALS when password wrong', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'u@e.com',
        password: 'hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(authService.login('u@e.com', 'wrong')).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('should return user and token when credentials valid', async () => {
      const user = {
        id: 1,
        email: 'u@e.com',
        password: 'hash',
        firstName: 'F',
        lastName: 'L',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login('u@e.com', 'correct');

      expect(bcrypt.compare).toHaveBeenCalledWith('correct', 'hash');
      expect(signToken).toHaveBeenCalledWith({
        userId: 1,
        email: 'u@e.com',
        roles: ['user'],
      });
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user).not.toHaveProperty('password');
      expect(result.user).toMatchObject({ id: 1, email: 'u@e.com' });
    });
  });
});
