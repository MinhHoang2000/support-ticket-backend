import { TicketService } from '../../services/ticket.service';
import { CreateTicketDto, TicketStatus } from '../../dtos/ticket.dto';
import { prisma } from '../../lib/prisma';

// Mock prisma
jest.mock('../../lib/prisma', () => ({
  prisma: {
    ticket: {
      create: jest.fn(),
    },
  },
}));

describe('TicketService', () => {
  let ticketService: TicketService;

  beforeEach(() => {
    ticketService = new TicketService();
    jest.clearAllMocks();
  });

  describe('create', () => {
    const mockTicketData: CreateTicketDto = {
      title: 'Test Ticket',
      content: 'Test content for the ticket',
      status: TicketStatus.OPEN,
      category: 'Bug',
      tag: 'frontend',
      sentiment: -1,
      urgency: 'high',
    };

    const mockCreatedTicket = {
      id: 1,
      ...mockTicketData,
      createdAt: new Date('2026-01-30T10:00:00.000Z'),
      updatedAt: new Date('2026-01-30T10:00:00.000Z'),
    };

    it('should create a ticket with all fields', async () => {
      (prisma.ticket.create as jest.Mock).mockResolvedValue(mockCreatedTicket);

      const result = await ticketService.create(mockTicketData);

      expect(prisma.ticket.create).toHaveBeenCalledTimes(1);
      expect(prisma.ticket.create).toHaveBeenCalledWith({
        data: {
          title: mockTicketData.title,
          content: mockTicketData.content,
          status: mockTicketData.status,
          category: mockTicketData.category,
          tag: mockTicketData.tag,
          sentiment: mockTicketData.sentiment,
          urgency: mockTicketData.urgency,
        },
      });
      expect(result).toEqual(mockCreatedTicket);
    });

    it('should create a ticket with only required fields', async () => {
      const minimalTicketData: CreateTicketDto = {
        title: 'Minimal Ticket',
        content: 'Minimal content',
        status: TicketStatus.OPEN,
        category: 'Support',
      };

      const minimalCreatedTicket = {
        id: 2,
        ...minimalTicketData,
        tag: null,
        sentiment: null,
        urgency: null,
        createdAt: new Date('2026-01-30T10:00:00.000Z'),
        updatedAt: new Date('2026-01-30T10:00:00.000Z'),
      };

      (prisma.ticket.create as jest.Mock).mockResolvedValue(minimalCreatedTicket);

      const result = await ticketService.create(minimalTicketData);

      expect(prisma.ticket.create).toHaveBeenCalledTimes(1);
      expect(prisma.ticket.create).toHaveBeenCalledWith({
        data: {
          title: minimalTicketData.title,
          content: minimalTicketData.content,
          status: minimalTicketData.status,
          category: minimalTicketData.category,
          tag: undefined,
          sentiment: undefined,
          urgency: undefined,
        },
      });
      expect(result).toEqual(minimalCreatedTicket);
    });

    it('should create tickets with different statuses', async () => {
      const statuses = [
        TicketStatus.OPEN,
        TicketStatus.IN_PROGRESS,
        TicketStatus.RESOLVED,
        TicketStatus.CLOSED,
      ];

      for (const status of statuses) {
        const ticketData: CreateTicketDto = {
          title: `Ticket with status ${status}`,
          content: 'Content',
          status,
          category: 'Test',
        };

        const createdTicket = {
          id: 1,
          ...ticketData,
          tag: null,
          sentiment: null,
          urgency: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (prisma.ticket.create as jest.Mock).mockResolvedValue(createdTicket);

        const result = await ticketService.create(ticketData);

        expect(result.status).toBe(status);
      }
    });

    it('should throw error when database operation fails', async () => {
      const dbError = new Error('Database connection failed');
      (prisma.ticket.create as jest.Mock).mockRejectedValue(dbError);

      await expect(ticketService.create(mockTicketData)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });
});
