import { TicketService } from '../../services/ticket.service';
import { CreateTicketDto } from '../../dtos/ticket.dto';
import { prisma } from '../../lib/prisma';
import { TicketStatus } from '../../dtos/ticket.dto';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    ticket: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

describe('TicketService', () => {
  let ticketService: TicketService;

  beforeEach(() => {
    ticketService = new TicketService();
    jest.clearAllMocks();
  });

  describe('create', () => {
    const body: CreateTicketDto = {
      title: 'Test Ticket',
      content: 'Test content for the ticket',
    };
    const mockCreatedTicket = {
      id: 1,
      title: body.title,
      content: body.content,
      userId: 1,
      status: TicketStatus.OPEN,
      category: null,
      tag: null,
      sentiment: null,
      urgency: null,
      responseDraft: null,
      response: null,
      replyMadeBy: null,
      createdAt: new Date('2026-01-30T10:00:00.000Z'),
      updatedAt: new Date('2026-01-30T10:00:00.000Z'),
    };

    it('should create a ticket with title and content and optional userId', async () => {
      (prisma.ticket.create as jest.Mock).mockResolvedValue(mockCreatedTicket);

      const result = await ticketService.create(body, 1);

      expect(prisma.ticket.create).toHaveBeenCalledWith({
        data: {
          title: body.title,
          content: body.content,
          userId: 1,
          status: TicketStatus.OPEN,
          category: null,
          tag: null,
          sentiment: null,
          urgency: null,
          responseDraft: null,
          replyMadeBy: null,
        },
      });
      expect(result).toEqual(mockCreatedTicket);
    });

    it('should create ticket with null userId when not provided', async () => {
      (prisma.ticket.create as jest.Mock).mockResolvedValue({
        ...mockCreatedTicket,
        userId: null,
      });

      await ticketService.create(body);

      expect(prisma.ticket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: null }),
      });
    });

    it('should throw when database fails', async () => {
      (prisma.ticket.create as jest.Mock).mockRejectedValue(new Error('DB error'));
      await expect(ticketService.create(body)).rejects.toThrow('DB error');
    });
  });

  describe('getById', () => {
    it('should return ticket when found', async () => {
      const ticket = { id: 1, title: 'T', content: 'C' };
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(ticket);
      const result = await ticketService.getById(1);
      expect(prisma.ticket.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(ticket);
    });

    it('should return null when not found', async () => {
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await ticketService.getById(999);
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should return paginated list with defaults', async () => {
      (prisma.ticket.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.ticket.count as jest.Mock).mockResolvedValue(0);

      const result = await ticketService.list({});

      expect(result).toEqual({
        tickets: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should apply userId filter when provided', async () => {
      (prisma.ticket.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.ticket.count as jest.Mock).mockResolvedValue(0);
      await ticketService.list({ userId: 5 });
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 5 } })
      );
    });

    it('should apply status and pagination', async () => {
      (prisma.ticket.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.ticket.count as jest.Mock).mockResolvedValue(25);
      const result = await ticketService.list({
        page: 2,
        limit: 10,
        status: TicketStatus.OPEN,
      });
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: TicketStatus.OPEN },
          skip: 10,
          take: 10,
        })
      );
      expect(result.totalPages).toBe(3);
      expect(result.total).toBe(25);
    });
  });

  describe('updateAiReplyMessage', () => {
    it('should return null when ticket not found', async () => {
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await ticketService.updateAiReplyMessage(1, 'Draft');
      expect(result).toBeNull();
    });

    it('should update draft and return ticket', async () => {
      const updated = { id: 1, responseDraft: 'Draft', replyMadeBy: 'HUMAN_AI' };
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.ticket.update as jest.Mock).mockResolvedValue(updated);
      const result = await ticketService.updateAiReplyMessage(1, 'Draft');
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { replyMadeBy: 'HUMAN_AI', responseDraft: 'Draft' },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('resolveTicket', () => {
    it('should copy draft to response and set status RESOLVED', async () => {
      const resolved = { id: 1, status: TicketStatus.RESOLVED, response: 'Reply' };
      (prisma.ticket.update as jest.Mock).mockResolvedValue(resolved);
      const result = await ticketService.resolveTicket(1, 'Reply');
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { response: 'Reply', status: TicketStatus.RESOLVED },
      });
      expect(result).toEqual(resolved);
    });
  });

  describe('closeTicket', () => {
    it('should return null when ticket not found', async () => {
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await ticketService.closeTicket(1);
      expect(result).toBeNull();
    });

    it('should set status CLOSED and return ticket', async () => {
      const closed = { id: 1, status: TicketStatus.CLOSED };
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.ticket.update as jest.Mock).mockResolvedValue(closed);
      const result = await ticketService.closeTicket(1);
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: TicketStatus.CLOSED },
      });
      expect(result).toEqual(closed);
    });
  });

  describe('delete', () => {
    it('should return null when ticket not found', async () => {
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await ticketService.delete(1);
      expect(result).toBeNull();
      expect(prisma.ticket.delete).not.toHaveBeenCalled();
    });

    it('should delete and return ticket when found', async () => {
      const ticket = { id: 1, title: 'T' };
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(ticket);
      (prisma.ticket.delete as jest.Mock).mockResolvedValue(ticket);
      const result = await ticketService.delete(1);
      expect(prisma.ticket.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(ticket);
    });
  });

  describe('updateTriage', () => {
    it('should update ticket with triage result', async () => {
      const triage = {
        ticket_id: '1',
        category: 'Technical' as const,
        sentiment_score: 5,
        urgency: 'Medium' as const,
        response_draft: 'We will look into it.',
      };
      const updated = { id: 1, category: 'Technical', status: TicketStatus.IN_PROGRESS };
      (prisma.ticket.update as jest.Mock).mockResolvedValue(updated);
      const result = await ticketService.updateTriage(1, triage);
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          category: triage.category,
          sentiment: triage.sentiment_score,
          urgency: triage.urgency,
          responseDraft: triage.response_draft,
          replyMadeBy: 'AI',
          status: TicketStatus.IN_PROGRESS,
        },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('addTriageTag', () => {
    it('should throw when ticket not found', async () => {
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(ticketService.addTriageTag(1, 'AI_TRIAGE_DONE')).rejects.toThrow(
        'Ticket not found: 1'
      );
    });

    it('should append tag to existing tag', async () => {
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue({ id: 1, tag: 'existing' });
      (prisma.ticket.update as jest.Mock).mockResolvedValue({
        id: 1,
        tag: 'existing,AI_TRIAGE_DONE',
      });
      const result = await ticketService.addTriageTag(1, 'AI_TRIAGE_DONE');
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { tag: 'existing,AI_TRIAGE_DONE' },
      });
      expect(result.tag).toBe('existing,AI_TRIAGE_DONE');
    });

    it('should set tag when none exists', async () => {
      (prisma.ticket.findUnique as jest.Mock).mockResolvedValue({ id: 1, tag: null });
      (prisma.ticket.update as jest.Mock).mockResolvedValue({ id: 1, tag: 'AI_TRIAGE_DONE' });
      await ticketService.addTriageTag(1, 'AI_TRIAGE_DONE');
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { tag: 'AI_TRIAGE_DONE' },
      });
    });
  });
});
