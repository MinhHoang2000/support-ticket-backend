import { Router } from 'express';
import { asyncHandler } from '../../middlewares/errorHandler';
import { validateDto } from '../../middlewares/validation';
import { SignupDto, LoginDto } from '../../dtos/auth.dto';
import { authController } from '../../controllers/auth.controller';
import { createRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();
const authLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication (signup, login, logout)
 */

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Create account
 *     tags: [Auth]
 *     description: Register a new user. Returns 409 if email already exists.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupDto'
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       description: User (id, email, firstName, lastName, createdAt, updatedAt)
 *                     message:
 *                       type: string
 *                       example: Account created successfully
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/signup',
  authLimiter,
  validateDto(SignupDto),
  asyncHandler(authController.signup.bind(authController))
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in
 *     tags: [Auth]
 *     description: Validate email/password and return user + JWT.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginDto'
 *     responses:
 *       200:
 *         description: Logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           type: object
 *                           description: User without password
 *                         token:
 *                           type: string
 *                           description: JWT for Authorization header
 *                     message:
 *                       type: string
 *                       example: Logged in successfully
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/login',
  authLimiter,
  validateDto(LoginDto),
  asyncHandler(authController.login.bind(authController))
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out
 *     tags: [Auth]
 *     description: Stateless JWT; client should discard the token. Returns 200.
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Logged out successfully
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/logout',
  asyncHandler(authController.logout.bind(authController))
);

export default router;
