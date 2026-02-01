import { prisma } from '../lib/prisma';
import { CreateTicketDto, TicketStatus } from '../dtos/ticket.dto';
import { Ticket } from '@prisma/client';
import type { TriageResult } from './ai.service';

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

  /**
   * Update a ticket with triage results (category, sentiment, urgency, response draft)
   */
  async updateTriage(ticketId: number, triage: TriageResult): Promise<Ticket> {
    return prisma.ticket.update({
      where: { id: ticketId },
      data: {
        category: triage.category,
        sentiment: triage.sentiment_score,
        urgency: triage.urgency,
        responseDraft: triage.response_draft,
      },
    });
  }
}

export const ticketService = new TicketService();
