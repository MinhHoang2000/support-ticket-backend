import { Router } from 'express';
import { asyncHandler } from '../../middlewares/errorHandler';
import { validateDto } from '../../middlewares/validation';
import { createRateLimiter } from '../../middlewares/rateLimiter';
import { requireTicketCreator } from '../../middlewares/ticketCreator';
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
 * /tickets/mine:
 *   get:
 *     summary: List current user's tickets
 *     tags: [Tickets]
 *     description: Returns tickets belonging to the authenticated user (same query params as list all).
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           enum: [10, 20, 50, 100]
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/TicketStatus'
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: sentiment
 *         schema:
 *           type: integer
 *       - in: query
 *         name: urgency
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, title]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User's tickets retrieved successfully
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
 *                         tickets:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Ticket'
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                     message:
 *                       type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/mine',
  asyncHandler(ticketController.listMine.bind(ticketController))
);

/**
 * @swagger
 * /tickets/{id}:
 *   get:
 *     summary: Get ticket by ID (user/creator, limited fields)
 *     tags: [Tickets]
 *     description: |
 *       Only the creator of the ticket can access. Returns id, title, content, createdAt, updatedAt, status.
 *       The response field is included only when status is RESOLVED or CLOSED.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket retrieved successfully (limited fields; response only if RESOLVED/CLOSED)
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
 *                         id: { type: integer }
 *                         title: { type: string }
 *                         content: { type: string }
 *                         createdAt: { type: string, format: date-time }
 *                         updatedAt: { type: string, format: date-time }
 *                         status: { $ref: '#/components/schemas/TicketStatus' }
 *                         response: { type: string, nullable: true, description: Present only when status is RESOLVED or CLOSED }
 *                     message:
 *                       type: string
 *                       example: Ticket retrieved successfully
 *       400:
 *         description: Invalid ticket ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not the creator of this ticket
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Ticket not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/:id',
  asyncHandler(requireTicketCreator),
  asyncHandler(ticketController.getById.bind(ticketController) as (req: import('express').Request, res: import('express').Response) => Promise<void>)
);

/**
 * @swagger
 * /tickets/{id}:
 *   delete:
 *     summary: Delete a ticket
 *     tags: [Tickets]
 *     description: Only the creator of the ticket can delete it. Deletes the ticket by ID; related worker processes are cascade-deleted.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket deleted successfully
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
 *                         id:
 *                           type: integer
 *                           description: ID of the deleted ticket
 *                     message:
 *                       type: string
 *                       example: Ticket deleted successfully
 *       400:
 *         description: Invalid ticket ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not the creator of this ticket
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Ticket not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete(
  '/:id',
  asyncHandler(requireTicketCreator),
  asyncHandler(ticketController.delete.bind(ticketController) as (req: import('express').Request, res: import('express').Response) => Promise<void>)
);

/**
 * @swagger
 * /tickets/{id}/close:
 *   post:
 *     summary: Close a ticket
 *     tags: [Tickets]
 *     description: Marks the ticket as CLOSED. Only the user who created the ticket can close it.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket closed successfully
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
 *                       example: Ticket closed successfully
 *       400:
 *         description: Invalid ticket ID or ticket already closed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Only the user who created the ticket can close it
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Ticket not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/:id/close',
  asyncHandler(ticketController.close.bind(ticketController))
);

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
