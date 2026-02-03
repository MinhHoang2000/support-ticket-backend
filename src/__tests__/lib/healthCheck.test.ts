import { checkDatabase, checkRedis } from '../../lib/healthCheck';
import { prisma } from '../../lib/prisma';
import { pingRedis } from '../../lib/redis';

jest.mock('../../lib/prisma', () => ({
  prisma: { $queryRaw: jest.fn() },
}));
jest.mock('../../lib/redis', () => ({
  pingRedis: jest.fn(),
}));

describe('healthCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkDatabase', () => {
    it('should resolve when prisma query succeeds', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue(undefined);
      await expect(checkDatabase()).resolves.toBeUndefined();
      expect(prisma.$queryRaw).toHaveBeenCalledWith(expect.anything());
    });

    it('should reject when prisma query fails', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection refused'));
      await expect(checkDatabase()).rejects.toThrow('Connection refused');
    });
  });

  describe('checkRedis', () => {
    it('should resolve when ping succeeds', async () => {
      (pingRedis as jest.Mock).mockResolvedValue(undefined);
      await expect(checkRedis()).resolves.toBeUndefined();
      expect(pingRedis).toHaveBeenCalled();
    });

    it('should reject when ping fails', async () => {
      (pingRedis as jest.Mock).mockRejectedValue(new Error('Redis down'));
      await expect(checkRedis()).rejects.toThrow('Redis down');
    });
  });
});
