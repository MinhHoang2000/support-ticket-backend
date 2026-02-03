import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import type { User } from '@prisma/client';

const SALT_ROUNDS = 10;

/** User without password for API responses */
export type SafeUser = Omit<User, 'password'>;

export class AuthServiceError extends Error {
  constructor(
    message: string,
    public readonly code: 'EMAIL_EXISTS' | 'INVALID_CREDENTIALS'
  ) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

export class AuthService {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  /** Create user. Throws AuthServiceError if email already exists. */
  async signup(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<SafeUser> {
    const email = data.email.trim().toLowerCase();
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new AuthServiceError('An account with this email already exists.', 'EMAIL_EXISTS');
    }
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
      },
    });
    return this.toSafeUser(user);
  }

  /** Validate credentials and return user + token. Throws AuthServiceError if invalid. */
  async login(email: string, password: string): Promise<{ user: SafeUser; token: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.findByEmail(normalizedEmail);
    if (!user) {
      throw new AuthServiceError('Invalid email or password.', 'INVALID_CREDENTIALS');
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new AuthServiceError('Invalid email or password.', 'INVALID_CREDENTIALS');
    }
    const token = signToken({
      userId: user.id,
      email: user.email,
      roles: user.roles ?? ['user'],
    });
    return { user: this.toSafeUser(user), token };
  }

  private toSafeUser(user: User): SafeUser {
    const { password: _p, ...safe } = user;
    return safe;
  }
}

export const authService = new AuthService();
