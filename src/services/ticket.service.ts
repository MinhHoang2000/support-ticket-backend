import { prisma } from '../lib/prisma';
import { CreateTicketDto } from '../dtos/ticket.dto';
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
        status: data.status,
        category: data.category,
        tag: data.tag,
        sentiment: data.sentiment,
        urgency: data.urgency,
      },
    });
  }
}

export const ticketService = new TicketService();
