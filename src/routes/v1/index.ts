import { Router } from 'express';
import { asyncHandler } from '../../middlewares/errorHandler';
import { requireAuth } from '../../middlewares/auth';
import ticketsRouter from './tickets';
import authRouter from './auth';
import { checkDatabase, checkRedis } from '../../lib/healthCheck';

const router = Router();

// Mount tickets routes (protected: require valid JWT; blacklisted tokens rejected)
router.use('/tickets', requireAuth, ticketsRouter);
// Mount auth routes
router.use('/auth', authRouter);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint (v1)
 *     tags: [Health]
 *     description: Returns the health status of the server, database and Redis
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/HealthCheckData'
 *                     message:
 *                       type: string
 *                       example: Server is healthy
 *       503:
 *         description: Service unavailable (DB or Redis down)
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const NODE_ENV = process.env.NODE_ENV || 'development';
    const dbOk = await checkDatabase().then(() => true).catch(() => false);
    const redisOk = await checkRedis().then(() => true).catch(() => false);
    const healthy = dbOk && redisOk;

    res.status(healthy ? 200 : 503).success(
      {
        status: healthy ? 'ok' : 'degraded',
        uptime: process.uptime(),
        environment: NODE_ENV,
        version: 'v1',
        database: dbOk ? 'ok' : 'error',
        redis: redisOk ? 'ok' : 'error',
      },
      healthy ? 'Server is healthy' : 'Database or Redis unavailable'
    );
  })
);

export default router;
