import { Request, Response } from 'express';
import { TicketController } from '../../controllers/ticket.controller';
import { ticketService } from '../../services/ticket.service';
import { CreateTicketDto, TicketStatus } from '../../dtos/ticket.dto';

// Mock the ticket service
jest.mock('../../services/ticket.service', () => ({
  ticketService: {
    create: jest.fn(),
  },
}));

describe('TicketController', () => {
  let ticketController: TicketController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    ticketController = new TicketController();
    mockRequest = {};
    mockResponse = {
      success: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('create', () => {
    const mockTicketBody: CreateTicketDto = {
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
      ...mockTicketBody,
      createdAt: new Date('2026-01-30T10:00:00.000Z'),
      updatedAt: new Date('2026-01-30T10:00:00.000Z'),
    };

    it('should create a ticket and return 201 status', async () => {
      mockRequest.body = mockTicketBody;
      (ticketService.create as jest.Mock).mockResolvedValue(mockCreatedTicket);

      await ticketController.create(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(ticketService.create).toHaveBeenCalledTimes(1);
      expect(ticketService.create).toHaveBeenCalledWith(mockTicketBody);
      expect(mockResponse.success).toHaveBeenCalledWith(
        mockCreatedTicket,
        'Ticket created successfully',
        201
      );
    });

    it('should pass body data correctly to service', async () => {
      const customBody: CreateTicketDto = {
        title: 'Custom Title',
        content: 'Custom Content',
        status: TicketStatus.IN_PROGRESS,
        category: 'Feature Request',
      };

      mockRequest.body = customBody;

      const expectedTicket = {
        id: 2,
        ...customBody,
        tag: null,
        sentiment: null,
        urgency: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (ticketService.create as jest.Mock).mockResolvedValue(expectedTicket);

      await ticketController.create(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(ticketService.create).toHaveBeenCalledWith(customBody);
      expect(mockResponse.success).toHaveBeenCalledWith(
        expectedTicket,
        'Ticket created successfully',
        201
      );
    });

    it('should throw error when service fails', async () => {
      mockRequest.body = mockTicketBody;
      const serviceError = new Error('Service error');
      (ticketService.create as jest.Mock).mockRejectedValue(serviceError);

      await expect(
        ticketController.create(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('Service error');
    });

    it('should handle ticket with all optional fields', async () => {
      const fullBody: CreateTicketDto = {
        title: 'Full Ticket',
        content: 'Full content',
        status: TicketStatus.OPEN,
        category: 'Bug',
        tag: 'backend',
        sentiment: 1,
        urgency: 'low',
      };

      mockRequest.body = fullBody;

      const fullTicket = {
        id: 3,
        ...fullBody,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (ticketService.create as jest.Mock).mockResolvedValue(fullTicket);

      await ticketController.create(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(ticketService.create).toHaveBeenCalledWith(fullBody);
      expect(mockResponse.success).toHaveBeenCalledWith(
        fullTicket,
        'Ticket created successfully',
        201
      );
    });
  });
});
