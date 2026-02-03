import { Router } from 'express';
import { asyncHandler } from '../../middlewares/errorHandler';
import { validateDto } from '../../middlewares/validation';
import { ticketController } from '../../controllers/ticket.controller';
import { UpdateAiReplyDto } from '../../dtos/ticket.dto';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Agent
 *   description: Agent/admin ticket endpoints (base path /agent)
 */

/**
 * @swagger
 * /agent/tickets:
 *   get:
 *     summary: List all tickets (admin or agent)
 *     tags: [Agent]
 *     description: Returns all tickets. Same format as DB. Requires admin or agent role.
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
 *           type: string
 *           enum: [open, in_progress, resolved, closed]
 *         description: Filter by ticket status (lowercase; values normalized before validation)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [billing, technical, "feature request"]
 *         description: Filter by category (lowercase)
 *       - in: query
 *         name: sentiment
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           description: 1 = very negative, 10 = very positive
 *         description: Filter by sentiment score (integer 1–10)
 *       - in: query
 *         name: urgency
 *         schema:
 *           type: string
 *           enum: [high, medium, low]
 *         description: Filter by urgency (lowercase)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdat, title]
 *           default: createdat
 *         description: Sort field (lowercase; createdat maps to createdAt)
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
 *         description: Validation error
 *       403:
 *         description: Not admin or agent
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/tickets',
  asyncHandler(ticketController.list.bind(ticketController))
);

/**
 * @swagger
 * /agent/tickets/{id}:
 *   get:
 *     summary: Get full ticket detail (admin or agent)
 *     tags: [Agent]
 *     description: Returns the full ticket (all fields). Requires admin or agent role.
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
 *         description: Full ticket retrieved successfully
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
 *       403:
 *         description: Not admin or agent
 *       404:
 *         description: Ticket not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/tickets/:id',
  asyncHandler(ticketController.getByIdForAdminOrAgent.bind(ticketController))
);

/**
 * @swagger
 * /agent/tickets/{id}/draft:
 *   patch:
 *     summary: Edit AI response draft (admin or agent)
 *     tags: [Agent]
 *     description: Updates only the AI-generated response draft stored on the ticket. Drafts can be edited only while the ticket is OPEN or IN_PROGRESS.
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
 *                       description: Updated ticket (includes id, status, responseDraft, response, etc.)
 *                     message:
 *                       type: string
 *                       example: AI draft updated successfully
 *       400:
 *         description: Invalid ticket ID, validation error, or ticket status not editable
 *       403:
 *         description: Not admin or agent
 *       404:
 *         description: Ticket or worker process not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch(
  '/tickets/:id/draft',
  validateDto(UpdateAiReplyDto),
  asyncHandler(ticketController.updateDraft.bind(ticketController))
);

/**
 * @swagger
 * /agent/tickets/{id}/resolve:
 *   post:
 *     summary: Resolve a ticket using the current response draft (admin or agent)
 *     tags: [Agent]
 *     description: Copies the existing responseDraft into response and marks the ticket as RESOLVED. Only tickets that are currently IN_PROGRESS or OPEN and have a non-empty responseDraft can be resolved.
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
 *         description: Ticket resolved successfully
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
 *                       example: Ticket resolved successfully
 *       400:
 *         description: Invalid ticket ID, ticket not IN_PROGRESS/OPEN, or no response draft to promote
 *       403:
 *         description: Not admin or agent
 *       404:
 *         description: Ticket not found
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/tickets/:id/resolve',
  asyncHandler(ticketController.resolve.bind(ticketController))
);

export default router;
