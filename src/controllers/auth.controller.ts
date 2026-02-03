import { Request, Response } from 'express';
import { authService, AuthServiceError } from '../services/auth.service';
import { ErrorCodes } from '../constants/errorCodes';
import type { SignupDto, LoginDto } from '../dtos/auth.dto';

export class AuthController {
  /**
   * POST /auth/signup
   * Create user. Returns 409 if email already exists.
   */
  async signup(req: Request, res: Response): Promise<void> {
    const body = req.body as SignupDto;
    try {
      const user = await authService.signup({
        email: body.email,
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
      });
      res.success(user, 'Account created successfully', 201);
    } catch (err) {
      if (err instanceof AuthServiceError && err.code === 'EMAIL_EXISTS') {
        res.error(err.message, ErrorCodes.CONFLICT.statusCode, ErrorCodes.CONFLICT.code);
        return;
      }
      throw err;
    }
  }

  /**
   * POST /auth/login
   * Validate credentials and return user + JWT.
   */
  async login(req: Request, res: Response): Promise<void> {
    const body = req.body as LoginDto;
    try {
      const { user, token } = await authService.login(body.email, body.password);
      res.success({ user, token }, 'Logged in successfully');
    } catch (err) {
      if (err instanceof AuthServiceError && err.code === 'INVALID_CREDENTIALS') {
        res.unauthorized(err.message, ErrorCodes.UNAUTHORIZED.code);
        return;
      }
      throw err;
    }
  }

  /**
   * POST /auth/logout
   * Stateless JWT: client should discard the token. Returns 200.
   */
  async logout(_req: Request, res: Response): Promise<void> {
    res.success(null, 'Logged out successfully');
  }
}

export const authController = new AuthController();
