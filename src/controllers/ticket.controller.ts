import { Request, Response } from 'express';
import { CreateTicketDto } from '../dtos/ticket.dto';
import { ticketService } from '../services/ticket.service';
import { ticketQueue } from '../lib/queue';

export class TicketController {
  /**
   * Handle POST /tickets request
   * Creates a new ticket and returns 201 Created status
   */
  async create(req: Request, res: Response): Promise<void> {
    const body: CreateTicketDto = req.body;

    const ticket = await ticketService.create(body);

    await ticketQueue.add('ticket-created', { ticketId: ticket.id });

    res.success(ticket, 'Ticket created successfully', 201);
  }
}

export const ticketController = new TicketController();
