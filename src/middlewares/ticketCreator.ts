import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { ResponseHelper } from '../utils/response';
import { ErrorCodes } from '../constants/errorCodes';
import { ticketService } from '../services/ticket.service';
import type { Ticket } from '@prisma/client';

export interface TicketCreatorRequest extends AuthenticatedRequest {
  ticket: Ticket;
}

/**
 * Require the ticket to exist and the authenticated user to be its creator.
 * Must be used after requireAuth. Loads the ticket by :id and attaches it to req.ticket.
 * Returns 400 for invalid id, 404 if ticket not found, 403 if user is not the creator.
 */
export async function requireTicketCreator(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    ResponseHelper.badRequest(res, 'Invalid ticket ID', ErrorCodes.BAD_REQUEST.code);
    return;
  }

  const ticket = await ticketService.getById(id);
  if (ticket == null) {
    ResponseHelper.notFound(res, ErrorCodes.NOT_FOUND.message, ErrorCodes.NOT_FOUND.code);
    return;
  }

  if (ticket.userId == null) {
    ResponseHelper.forbidden(
      res,
      'Only the creator of this ticket can perform this action.',
      ErrorCodes.FORBIDDEN.code
    );
    return;
  }

  if (ticket.userId !== req.user!.userId) {
    ResponseHelper.forbidden(
      res,
      'Only the creator of this ticket can perform this action.',
      ErrorCodes.FORBIDDEN.code
    );
    return;
  }

  (req as TicketCreatorRequest).ticket = ticket;
  next();
}
