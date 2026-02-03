import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import type { TicketCreatorRequest } from '../middlewares/ticketCreator';
import { CreateTicketDto, TicketStatus, UpdateAiReplyDto } from '../dtos/ticket.dto';
import { ticketService, TicketSortBy, TicketSortOrder } from '../services/ticket.service';
import { ticketQueue } from '../lib/queue';
import { ErrorCodes } from '../constants/errorCodes';

/** Allowed pagination limit values (items per page). */
const ALLOWED_PAGE_LIMITS = [10, 20, 50, 100] as const;

/** Sentiment filter: integer 1 (very negative) to 10 (very positive). */
const SENTIMENT_MIN = 1;
const SENTIMENT_MAX = 10;

/** Lowercase filter enum values (API accepts these; validated and transformed from query params). */
const STATUS_LOWER = ['open', 'in_progress', 'resolved', 'closed'] as const;
const CATEGORY_LOWER = ['billing', 'technical', 'feature request'] as const;
const URGENCY_LOWER = ['high', 'medium', 'low'] as const;
const SORT_BY_LOWER = ['createdat', 'title'] as const;
const SORT_ORDER_LOWER = ['asc', 'desc'] as const;

/** Map lowercase status → canonical TicketStatus. */
const STATUS_LOWER_TO_CANONICAL: Record<(typeof STATUS_LOWER)[number], TicketStatus> = {
  open: TicketStatus.OPEN,
  in_progress: TicketStatus.IN_PROGRESS,
  resolved: TicketStatus.RESOLVED,
  closed: TicketStatus.CLOSED,
};

/** Map lowercase category → canonical (matches TRIAGE_CATEGORIES). */
const CATEGORY_LOWER_TO_CANONICAL: Record<(typeof CATEGORY_LOWER)[number], string> = {
  billing: 'Billing',
  technical: 'Technical',
  'feature request': 'Feature Request',
};

/** Map lowercase urgency → canonical (matches TRIAGE_URGENCIES). */
const URGENCY_LOWER_TO_CANONICAL: Record<(typeof URGENCY_LOWER)[number], string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** Map lowercase sortBy → canonical TicketSortBy. */
const SORT_BY_LOWER_TO_CANONICAL: Record<(typeof SORT_BY_LOWER)[number], TicketSortBy> = {
  createdat: 'createdAt',
  title: 'title',
};

export class TicketController {
  /**
   * Handle GET /tickets request (admin or agent only).
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
      const val = String(req.query.status).toLowerCase();
      if (!STATUS_LOWER.includes(val as (typeof STATUS_LOWER)[number])) {
        res.badRequest(
          `status must be one of: ${STATUS_LOWER.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
        return;
      }
      status = STATUS_LOWER_TO_CANONICAL[val as (typeof STATUS_LOWER)[number]];
    }

    let sentiment: number | undefined;
    if (req.query.sentiment != null) {
      const parsed = Number(req.query.sentiment);
      if (!Number.isInteger(parsed) || parsed < SENTIMENT_MIN || parsed > SENTIMENT_MAX) {
        res.badRequest(
          `sentiment must be an integer between ${SENTIMENT_MIN} and ${SENTIMENT_MAX}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
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
      const val = String(req.query.sortBy).toLowerCase();
      if (!SORT_BY_LOWER.includes(val as (typeof SORT_BY_LOWER)[number])) {
        res.badRequest(
          `sortBy must be one of: ${SORT_BY_LOWER.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
        return;
      }
      sortBy = SORT_BY_LOWER_TO_CANONICAL[val as (typeof SORT_BY_LOWER)[number]];
    }

    let sortOrder: TicketSortOrder | undefined;
    if (req.query.sortOrder != null) {
      const val = String(req.query.sortOrder).toLowerCase();
      if (!SORT_ORDER_LOWER.includes(val as (typeof SORT_ORDER_LOWER)[number])) {
        res.badRequest(
          `sortOrder must be one of: ${SORT_ORDER_LOWER.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
        return;
      }
      sortOrder = val as TicketSortOrder;
    }

    let category: string | undefined;
    if (req.query.category != null) {
      const val = String(req.query.category).toLowerCase();
      if (!CATEGORY_LOWER.includes(val as (typeof CATEGORY_LOWER)[number])) {
        res.badRequest(
          `category must be one of: ${CATEGORY_LOWER.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
        return;
      }
      category = CATEGORY_LOWER_TO_CANONICAL[val as (typeof CATEGORY_LOWER)[number]];
    }

    let urgency: string | undefined;
    if (req.query.urgency != null) {
      const val = String(req.query.urgency).toLowerCase();
      if (!URGENCY_LOWER.includes(val as (typeof URGENCY_LOWER)[number])) {
        res.badRequest(
          `urgency must be one of: ${URGENCY_LOWER.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
        return;
      }
      urgency = URGENCY_LOWER_TO_CANONICAL[val as (typeof URGENCY_LOWER)[number]];
    }

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
      const val = String(req.query.status).toLowerCase();
      if (!STATUS_LOWER.includes(val as (typeof STATUS_LOWER)[number])) {
        res.badRequest(
          `status must be one of: ${STATUS_LOWER.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
        return;
      }
      status = STATUS_LOWER_TO_CANONICAL[val as (typeof STATUS_LOWER)[number]];
    }

    let sentiment: number | undefined;
    if (req.query.sentiment != null) {
      const parsed = Number(req.query.sentiment);
      if (!Number.isInteger(parsed) || parsed < SENTIMENT_MIN || parsed > SENTIMENT_MAX) {
        res.badRequest(
          `sentiment must be an integer between ${SENTIMENT_MIN} and ${SENTIMENT_MAX}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
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
      const val = String(req.query.sortBy).toLowerCase();
      if (!SORT_BY_LOWER.includes(val as (typeof SORT_BY_LOWER)[number])) {
        res.badRequest(
          `sortBy must be one of: ${SORT_BY_LOWER.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
        return;
      }
      sortBy = SORT_BY_LOWER_TO_CANONICAL[val as (typeof SORT_BY_LOWER)[number]];
    }

    let sortOrder: TicketSortOrder | undefined;
    if (req.query.sortOrder != null) {
      const val = String(req.query.sortOrder).toLowerCase();
      if (!SORT_ORDER_LOWER.includes(val as (typeof SORT_ORDER_LOWER)[number])) {
        res.badRequest(
          `sortOrder must be one of: ${SORT_ORDER_LOWER.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
        return;
      }
      sortOrder = val as TicketSortOrder;
    }

    let category: string | undefined;
    if (req.query.category != null) {
      const val = String(req.query.category).toLowerCase();
      if (!CATEGORY_LOWER.includes(val as (typeof CATEGORY_LOWER)[number])) {
        res.badRequest(
          `category must be one of: ${CATEGORY_LOWER.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
        return;
      }
      category = CATEGORY_LOWER_TO_CANONICAL[val as (typeof CATEGORY_LOWER)[number]];
    }

    let urgency: string | undefined;
    if (req.query.urgency != null) {
      const val = String(req.query.urgency).toLowerCase();
      if (!URGENCY_LOWER.includes(val as (typeof URGENCY_LOWER)[number])) {
        res.badRequest(
          `urgency must be one of: ${URGENCY_LOWER.join(', ')}`,
          ErrorCodes.VALIDATION_ERROR.code
        );
        return;
      }
      urgency = URGENCY_LOWER_TO_CANONICAL[val as (typeof URGENCY_LOWER)[number]];
    }

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
   * Handle GET /tickets/:id request (user/creator only).
   * Returns only id, title, content, createdAt, updatedAt, status; includes response only when status is RESOLVED or CLOSED.
   * Uses req.ticket from requireTicketCreator middleware.
   */
  async getById(req: TicketCreatorRequest, res: Response): Promise<void> {
    const ticket = req.ticket;
    const status = ticket.status as TicketStatus;
    const isResolvedOrClosed = status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED;

    const payload: {
      id: number;
      title: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
      status: string;
      response?: string;
    } = {
      id: ticket.id,
      title: ticket.title,
      content: ticket.content,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      status: ticket.status,
    };
    if (isResolvedOrClosed && ticket.response != null) {
      payload.response = ticket.response;
    }

    res.success(payload, 'Ticket retrieved successfully');
  }

  /**
   * Handle GET /tickets/:id/detail request (admin or agent only).
   * Returns full ticket (all fields). Uses ticket ID from params.
   */
  async getByIdForAdminOrAgent(req: AuthenticatedRequest, res: Response): Promise<void> {
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
   * Updates only the ticket responseDraft (AI response draft).
   */
  async updateDraft(req: AuthenticatedRequest, res: Response): Promise<void> {
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
    const ticketStatus = ticket.status as TicketStatus;
    if (![TicketStatus.OPEN, TicketStatus.IN_PROGRESS].includes(ticketStatus)) {
      res.badRequest(
        'Draft replies can only be edited when the ticket is OPEN or IN_PROGRESS.',
        ErrorCodes.BAD_REQUEST.code
      );
      return;
    }
    const body = req.body as UpdateAiReplyDto;
    const updated = await ticketService.updateAiReplyMessage(id, body.draftReplyMessage);
    if (updated == null) {
      res.notFound(ErrorCodes.NOT_FOUND.message, ErrorCodes.NOT_FOUND.code);
      return;
    }
    res.success(updated, 'Draft reply message updated successfully');
  }

  /**
   * Handle POST /tickets/:id/close request
   * Marks the ticket CLOSED. Only the user who created the ticket can close it.
   */
  async close(req: AuthenticatedRequest, res: Response): Promise<void> {
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
    if (ticket.userId == null) {
      res.forbidden('Only the user who created the ticket can close it.', ErrorCodes.FORBIDDEN.code);
      return;
    }
    if (ticket.userId !== req.user!.userId) {
      res.forbidden('Only the user who created the ticket can close it.', ErrorCodes.FORBIDDEN.code);
      return;
    }
    const ticketStatus = ticket.status as TicketStatus;
    if (ticketStatus === TicketStatus.CLOSED) {
      res.badRequest('Ticket is already closed.', ErrorCodes.BAD_REQUEST.code);
      return;
    }
    const closed = await ticketService.closeTicket(id);
    if (closed == null) {
      res.notFound(ErrorCodes.NOT_FOUND.message, ErrorCodes.NOT_FOUND.code);
      return;
    }
    res.success(closed, 'Ticket closed successfully');
  }

  /**
   * Handle POST /tickets/:id/resolve request
   * Copies the current responseDraft into response and marks the ticket RESOLVED.
   */
  async resolve(req: AuthenticatedRequest, res: Response): Promise<void> {
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
    const ticketStatus = ticket.status as TicketStatus;
    if (ticketStatus !== TicketStatus.IN_PROGRESS && ticketStatus !== TicketStatus.OPEN) {
      res.badRequest('Only IN_PROGRESS or OPEN tickets can be resolved.', ErrorCodes.BAD_REQUEST.code);
      return;
    }
    if (ticket.responseDraft == null) {
      res.badRequest('Cannot resolve a ticket without a response draft.', ErrorCodes.BAD_REQUEST.code);
      return;
    }

    const draft = ticket.responseDraft.trim();
    if (draft.length === 0) {
      res.badRequest('Cannot resolve a ticket without a response draft.', ErrorCodes.BAD_REQUEST.code);
      return;
    }

    const resolved = await ticketService.resolveTicket(id, ticket.responseDraft);
    res.success(resolved, 'Ticket resolved successfully');
  }

  /**
   * Handle DELETE /tickets/:id request.
   * Only the creator can delete. Uses req.ticket from requireTicketCreator middleware.
   */
  async delete(req: TicketCreatorRequest, res: Response): Promise<void> {
    const deleted = await ticketService.delete(req.ticket.id);
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
