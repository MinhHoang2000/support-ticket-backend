import { prisma } from '../lib/prisma';
import { CreateTicketDto, TicketStatus } from '../dtos/ticket.dto';
import { Ticket } from '@prisma/client';

export class TicketService {
  /**
   * Create a new ticket in the database
   */
  async create(data: CreateTicketDto): Promise<Ticket> {
    return prisma.ticket.create({
      data: {
        title: data.title,
        content: data.content,
        status: TicketStatus.OPEN,
        category: null,
        tag: null,
        sentiment: null,
        urgency: null,
      },
    });
  }
}

export const ticketService = new TicketService();
