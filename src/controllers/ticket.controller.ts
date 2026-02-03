import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { CreateTicketDto, TicketStatus, UpdateAiReplyDto } from '../dtos/ticket.dto';
import { ticketService, TicketSortBy, TicketSortOrder } from '../services/ticket.service';
import { ticketQueue } from '../lib/queue';
import { ErrorCodes } from '../constants/errorCodes';

/** Allowed pagination limit values (items per page). */
const ALLOWED_PAGE_LIMITS = [10, 20, 50, 100] as const;

const SORT_BY_VALUES: TicketSortBy[] = ['createdAt', 'title'];
const SORT_ORDER_VALUES: TicketSortOrder[] = ['asc', 'desc'];

const TICKET_STATUS_VALUES: TicketStatus[] = Object.values(TicketStatus) as TicketStatus[];

export class TicketController {
  /**
   * Handle GET /tickets request (admin only).
   * Returns all tickets for list view (same format as DB). Supports filter (status, category, sentiment, urgency) and sort (createdAt, title; asc/desc).
   */
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    let page: number | undefined;
    if (req.query.page != null) {
      const parsed = Number(req.query.page);
      if (!Number.isInteger(parsed) || parsed < 1) {
        res.badRequest('page must be a positive integer', ErrorCodes.VALIDATION_ERROR.code);
        return;
      }
      page = parsed;
    }

    let status: TicketStatus | undefined;
    if (req.query.status != null) {
      const val = String(req.query.status);
      if (!TICKET_STATUS_VALUES.includes(val as TicketStatus)) {
        res.badRequest(
          `status must be one of: ${TICKET_STATUS_VALUES.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
        return;
      }
      status = val as TicketStatus;
    }

    let sentiment: number | undefined;
    if (req.query.sentiment != null) {
      const parsed = Number(req.query.sentiment);
      if (!Number.isInteger(parsed)) {
        res.badRequest('sentiment must be an integer', ErrorCodes.VALIDATION_ERROR.code);
        return;
      }
      sentiment = parsed;
    }

    let limit: number | undefined;
    if (req.query.limit != null) {
      const parsed = Number(req.query.limit);
      if (!Number.isInteger(parsed) || !(ALLOWED_PAGE_LIMITS as readonly number[]).includes(parsed)) {
        res.badRequest(
          `limit must be one of: ${ALLOWED_PAGE_LIMITS.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
        return;
      }
      limit = parsed;
    }

    let sortBy: TicketSortBy | undefined;
    if (req.query.sortBy != null) {
      const val = String(req.query.sortBy);
      if (!SORT_BY_VALUES.includes(val as TicketSortBy)) {
        res.badRequest(
          `sortBy must be one of: ${SORT_BY_VALUES.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
        return;
      }
      sortBy = val as TicketSortBy;
    }

    let sortOrder: TicketSortOrder | undefined;
    if (req.query.sortOrder != null) {
      const val = String(req.query.sortOrder).toLowerCase();
      if (!SORT_ORDER_VALUES.includes(val as TicketSortOrder)) {
        res.badRequest(
          `sortOrder must be one of: ${SORT_ORDER_VALUES.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
        return;
      }
      sortOrder = val as TicketSortOrder;
    }

    const category =
      typeof req.query.category === 'string' && req.query.category.length <= 200
        ? req.query.category
        : typeof req.query.category === 'string'
          ? undefined
          : (req.query.category as string | undefined);
    const urgency =
      typeof req.query.urgency === 'string' && req.query.urgency.length <= 200
        ? req.query.urgency
        : typeof req.query.urgency === 'string'
          ? undefined
          : (req.query.urgency as string | undefined);

    let search: string | undefined;
    if (typeof req.query.search === 'string') {
      search = req.query.search.length <= 500 ? req.query.search : req.query.search.slice(0, 500);
    }

    const result = await ticketService.list({
      page,
      limit,
      status,
      category,
      sentiment,
      urgency,
      sortBy,
      sortOrder,
      search,
    });
    res.success(result, 'Tickets retrieved successfully');
  }

  /**
   * Handle GET /tickets/mine request.
   * Returns tickets for the authenticated user only (same query params as list).
   */
  async listMine(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    let page: number | undefined;
    if (req.query.page != null) {
      const parsed = Number(req.query.page);
      if (!Number.isInteger(parsed) || parsed < 1) {
        res.badRequest('page must be a positive integer', ErrorCodes.VALIDATION_ERROR.code);
        return;
      }
      page = parsed;
    }

    let status: TicketStatus | undefined;
    if (req.query.status != null) {
      const val = String(req.query.status);
      if (!TICKET_STATUS_VALUES.includes(val as TicketStatus)) {
        res.badRequest(
          `status must be one of: ${TICKET_STATUS_VALUES.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
        return;
      }
      status = val as TicketStatus;
    }

    let sentiment: number | undefined;
    if (req.query.sentiment != null) {
      const parsed = Number(req.query.sentiment);
      if (!Number.isInteger(parsed)) {
        res.badRequest('sentiment must be an integer', ErrorCodes.VALIDATION_ERROR.code);
        return;
      }
      sentiment = parsed;
    }

    let limit: number | undefined;
    if (req.query.limit != null) {
      const parsed = Number(req.query.limit);
      if (!Number.isInteger(parsed) || !(ALLOWED_PAGE_LIMITS as readonly number[]).includes(parsed)) {
        res.badRequest(
          `limit must be one of: ${ALLOWED_PAGE_LIMITS.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
        return;
      }
      limit = parsed;
    }

    let sortBy: TicketSortBy | undefined;
    if (req.query.sortBy != null) {
      const val = String(req.query.sortBy);
      if (!SORT_BY_VALUES.includes(val as TicketSortBy)) {
        res.badRequest(
          `sortBy must be one of: ${SORT_BY_VALUES.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
        return;
      }
      sortBy = val as TicketSortBy;
    }

    let sortOrder: TicketSortOrder | undefined;
    if (req.query.sortOrder != null) {
      const val = String(req.query.sortOrder).toLowerCase();
      if (!SORT_ORDER_VALUES.includes(val as TicketSortOrder)) {
        res.badRequest(
          `sortOrder must be one of: ${SORT_ORDER_VALUES.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
        return;
      }
      sortOrder = val as TicketSortOrder;
    }

    const category =
      typeof req.query.category === 'string' && req.query.category.length <= 200
        ? req.query.category
        : typeof req.query.category === 'string'
          ? undefined
          : (req.query.category as string | undefined);
    const urgency =
      typeof req.query.urgency === 'string' && req.query.urgency.length <= 200
        ? req.query.urgency
        : typeof req.query.urgency === 'string'
          ? undefined
          : (req.query.urgency as string | undefined);

    let search: string | undefined;
    if (typeof req.query.search === 'string') {
      search = req.query.search.length <= 500 ? req.query.search : req.query.search.slice(0, 500);
    }

    const result = await ticketService.list({
      page,
      limit,
      userId,
      status,
      category,
      sentiment,
      urgency,
      sortBy,
      sortOrder,
      search,
    });
    res.success(result, 'Tickets retrieved successfully');
  }

  /**
   * Handle GET /tickets/:id request
   * Returns a single ticket by ID (full detail, same format as DB).
   */
  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.badRequest('Invalid ticket ID', ErrorCodes.BAD_REQUEST.code);
      return;
    }
    const ticket = await ticketService.getById(id);
    if (ticket == null) {
      res.notFound(ErrorCodes.NOT_FOUND.message, ErrorCodes.NOT_FOUND.code);
      return;
    }
    res.success(ticket, 'Ticket retrieved successfully');
  }

  /**
   * Handle PATCH /tickets/:id/draft request
   * Updates only ai_reply_message on the latest worker process for the ticket.
   */
  async updateDraft(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.badRequest('Invalid ticket ID', ErrorCodes.BAD_REQUEST.code);
      return;
    }
    const body = req.body as UpdateAiReplyDto;
    const updated = await ticketService.updateAiReplyMessage(id, body.aiReplyMessage);
    if (updated == null) {
      res.notFound(ErrorCodes.NOT_FOUND.message, ErrorCodes.NOT_FOUND.code);
      return;
    }
    res.success(updated, 'AI draft updated successfully');
  }

  /**
   * Handle DELETE /tickets/:id request
   * Deletes a ticket by ID (cascade deletes related worker processes).
   */
  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.badRequest('Invalid ticket ID', ErrorCodes.BAD_REQUEST.code);
      return;
    }
    const deleted = await ticketService.delete(id);
    if (deleted == null) {
      res.notFound(ErrorCodes.NOT_FOUND.message, ErrorCodes.NOT_FOUND.code);
      return;
    }
    res.success({ id: deleted.id }, 'Ticket deleted successfully');
  }

  /**
   * Handle POST /tickets request
   * Creates a new ticket and returns 201 Created status. Associates ticket with authenticated user.
   */
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const body: CreateTicketDto = req.body;
    const userId = req.user!.userId;

    const ticket = await ticketService.create(body, userId);

    await ticketQueue.add('ticket-created', { ticketId: ticket.id });

    res.success(ticket, 'Ticket created successfully', 201);
  }
}

export const ticketController = new TicketController();
