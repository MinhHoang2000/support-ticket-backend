import { Router } from 'express';
import { asyncHandler } from '../../middlewares/errorHandler';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint (v2)
 *     tags: [Health]
 *     description: Returns the health status of the server
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
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const NODE_ENV = process.env.NODE_ENV || 'development';
    res.success(
      {
        status: 'ok',
        uptime: process.uptime(),
        environment: NODE_ENV,
        version: 'v2',
      },
      'Server is healthy'
    );
  })
);

export default router;
