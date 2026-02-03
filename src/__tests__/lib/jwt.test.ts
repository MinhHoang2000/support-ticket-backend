import { signToken, verifyToken, JwtPayload } from '../../lib/jwt';

describe('jwt', () => {
  const payload: JwtPayload = {
    userId: 1,
    email: 'user@example.com',
    roles: ['user', 'admin'],
  };

  describe('signToken', () => {
    it('should return a non-empty string', () => {
      const token = signToken(payload);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      expect(token.split('.')).toHaveLength(3);
    });

    it('should produce different tokens for different payloads', () => {
      const token1 = signToken(payload);
      const token2 = signToken({ ...payload, userId: 2 });
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should decode payload matching what was signed', () => {
      const token = signToken(payload);
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.roles).toEqual(payload.roles);
      expect(decoded).toHaveProperty('exp');
      expect(decoded).toHaveProperty('iat');
    });

    it('should throw on invalid token', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow();
    });

    it('should throw on tampered token', () => {
      const token = signToken(payload);
      const parts = token.split('.');
      const tampered = parts[0] + '.' + parts[1] + '.tampered';
      expect(() => verifyToken(tampered)).toThrow();
    });
  });
});
