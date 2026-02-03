import jwt from 'jsonwebtoken';
import { addToBlacklist, isBlacklisted } from '../../lib/tokenBlacklist';
import { redis } from '../../lib/redis';

jest.mock('../../lib/redis', () => ({
  redis: {
    set: jest.fn(),
    get: jest.fn(),
  },
}));
jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'),
  decode: jest.fn(),
}));

describe('tokenBlacklist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addToBlacklist', () => {
    it('should not call redis when token has no exp', async () => {
      (jwt.decode as jest.Mock).mockReturnValue({});
      await addToBlacklist('token');
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('should not call redis when token is already expired', async () => {
      (jwt.decode as jest.Mock).mockReturnValue({ exp: Math.floor(Date.now() / 1000) - 10 });
      await addToBlacklist('token');
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('should set key with PX when token is valid', async () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      (jwt.decode as jest.Mock).mockReturnValue({ exp });
      (redis.set as jest.Mock).mockResolvedValue('OK');
      await addToBlacklist('my-jwt-token');
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^jwt:blacklist:/),
        '1',
        'PX',
        expect.any(Number)
      );
    });
  });

  describe('isBlacklisted', () => {
    it('should return true when key exists', async () => {
      (redis.get as jest.Mock).mockResolvedValue('1');
      const result = await isBlacklisted('token');
      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      const result = await isBlacklisted('token');
      expect(result).toBe(false);
    });
  });
});
