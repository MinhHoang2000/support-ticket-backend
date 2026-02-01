import { Router } from 'express';
import { asyncHandler } from '../../middlewares/errorHandler';
import { validateDto } from '../../middlewares/validation';
import { createRateLimiter } from '../../middlewares/rateLimiter';
import { CreateTicketDto, UpdateAiReplyDto } from '../../dtos/ticket.dto';
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
 *   get:
 *     summary: List tickets (list view)
 *     tags: [Tickets]
 *     description: Returns tickets in same format as DB (id, title, content, status, category, tag, sentiment, urgency, createdAt, updatedAt). Color-coding by urgency can be done in the frontend.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number (1-based)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           enum: [10, 20, 50, 100]
 *           default: 20
 *         description: Items per page (only 10, 20, 50, or 100 allowed)
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/TicketStatus'
 *         description: Filter by ticket status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: sentiment
 *         schema:
 *           type: integer
 *         description: Filter by sentiment (integer)
 *       - in: query
 *         name: urgency
 *         schema:
 *           type: string
 *         description: Filter by urgency
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, title]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort direction
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Full-text search in title (PostgreSQL FTS; tokenized/stemmed)
 *     responses:
 *       200:
 *         description: Tickets retrieved successfully
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
 *                           description: Total number of tickets
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                     message:
 *                       type: string
 *                       example: Tickets retrieved successfully
 *       400:
 *         description: Validation error (e.g. invalid limit, sortBy, sortOrder, or sentiment)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/',
  asyncHandler(ticketController.list.bind(ticketController))
);

/**
 * @swagger
 * /tickets/{id}:
 *   get:
 *     summary: Get ticket by ID (detail view)
 *     tags: [Tickets]
 *     description: Returns a single ticket with all fields (same format as DB).
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
 *         description: Ticket retrieved successfully
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
 *                       example: Ticket retrieved successfully
 *       400:
 *         description: Invalid ticket ID
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
  asyncHandler(ticketController.getById.bind(ticketController))
);

/**
 * @swagger
 * /tickets/{id}:
 *   delete:
 *     summary: Delete a ticket
 *     tags: [Tickets]
 *     description: Deletes a ticket by ID. Related worker processes are cascade-deleted.
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
  asyncHandler(ticketController.delete.bind(ticketController))
);

/**
 * @swagger
 * /tickets/{id}/draft:
 *   patch:
 *     summary: Edit AI draft response (ai_reply_message only)
 *     tags: [Tickets]
 *     description: Updates only the ai_reply_message field on the latest worker process for this ticket.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Ticket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAiReplyDto'
 *     responses:
 *       200:
 *         description: AI draft updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       description: Updated worker process (includes id, ticketId, aiReplyMessage, etc.)
 *                     message:
 *                       type: string
 *                       example: AI draft updated successfully
 *       400:
 *         description: Invalid ticket ID or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Ticket or worker process not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch(
  '/:id/draft',
  validateDto(UpdateAiReplyDto),
  asyncHandler(ticketController.updateDraft.bind(ticketController))
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
