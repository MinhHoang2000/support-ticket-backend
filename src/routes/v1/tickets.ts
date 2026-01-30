import { Router } from 'express';
import { asyncHandler } from '../../middlewares/errorHandler';
import { validateDto } from '../../middlewares/validation';
import { CreateTicketDto } from '../../dtos/ticket.dto';
import { ticketController } from '../../controllers/ticket.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Ticket management endpoints
 */

/**
 * @swagger
 * /api/v1/tickets:
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
 *           examples:
 *             basic:
 *               summary: Basic ticket
 *               value:
 *                 title: "Login page not loading"
 *                 content: "When I try to access the login page, it shows a blank screen."
 *                 status: "OPEN"
 *                 category: "Bug"
 *             full:
 *               summary: Ticket with all fields
 *               value:
 *                 title: "Payment processing failed"
 *                 content: "Customer reported that payment gateway times out after 30 seconds."
 *                 status: "OPEN"
 *                 category: "Bug"
 *                 tag: "payment"
 *                 sentiment: -1
 *                 urgency: "high"
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
 *               message: Validation failed
 *               error: "Title is required; Status must be one of: OPEN, IN_PROGRESS, RESOLVED, CLOSED"
 *               timestamp: "2026-01-30T10:30:00.000Z"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/',
  validateDto(CreateTicketDto),
  asyncHandler(ticketController.create.bind(ticketController))
);

export default router;
