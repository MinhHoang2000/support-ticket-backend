import { Router } from 'express';
import { asyncHandler } from '../../middlewares/errorHandler';
import { validateDto } from '../../middlewares/validation';
import { createRateLimiter } from '../../middlewares/rateLimiter';
import { CreateTicketDto } from '../../dtos/ticket.dto';
import { ticketController } from '../../controllers/ticket.controller';

// Stricter limit for ticket creation: 20 requests per minute per IP
const createTicketLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Ticket management endpoints
 */

/**
 * @swagger
 * /tickets:
 *   post:
 *     summary: Create a new ticket
 *     tags: [Tickets]
 *     description: Creates a new ticket and stores it in the database. Returns 201 Created status immediately after successful creation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTicketDto'
 *           example:
 *             title: "Login page not loading"
 *             content: "When I try to access the login page, it shows a blank screen."
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Ticket'
 *                     message:
 *                       type: string
 *                       example: Ticket created successfully
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               data: null
 *               message: Validation failed. Please check your input.
 *               errorCode: VALIDATION_ERROR
 *               timestamp: "2026-01-30T10:30:00.000Z"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/',
  createTicketLimiter,
  validateDto(CreateTicketDto),
  asyncHandler(ticketController.create.bind(ticketController))
);

export default router;
