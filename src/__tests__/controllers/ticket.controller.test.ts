import { Response } from 'express';
import { TicketController } from '../../controllers/ticket.controller';
import { ticketService } from '../../services/ticket.service';
import { ticketQueue } from '../../lib/queue';
import { CreateTicketDto } from '../../dtos/ticket.dto';
import type { AuthenticatedRequest } from '../../middlewares/auth';
import type { TicketCreatorRequest } from '../../middlewares/ticketCreator';
import { TicketStatus } from '../../dtos/ticket.dto';

jest.mock('../../services/ticket.service');
jest.mock('../../lib/queue', () => ({
  ticketQueue: { add: jest.fn() },
}));

describe('TicketController', () => {
  let ticketController: TicketController;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;

  const createMockRes = () => ({
    success: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    badRequest: jest.fn().mockReturnThis(),
    notFound: jest.fn().mockReturnThis(),
    forbidden: jest.fn().mockReturnThis(),
  });

  beforeEach(() => {
    ticketController = new TicketController();
    mockRequest = { user: { userId: 1, email: 'u@e.com', roles: ['user'] } };
    mockResponse = createMockRes();
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

    it('should create a ticket and return 201 status', async () => {
      mockRequest.body = body;
      (ticketService.create as jest.Mock).mockResolvedValue(mockCreatedTicket);

      await ticketController.create(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(ticketService.create).toHaveBeenCalledWith(body, 1);
      expect(ticketQueue.add).toHaveBeenCalledWith('ticket-created', { ticketId: 1 });
      expect(mockResponse.success).toHaveBeenCalledWith(
        mockCreatedTicket,
        'Ticket created successfully',
        201
      );
    });

    it('should pass userId from req.user to service', async () => {
      (mockRequest as AuthenticatedRequest).user = { userId: 42, email: 'a@b.com', roles: ['user'] };
      mockRequest.body = body;
      (ticketService.create as jest.Mock).mockResolvedValue({ ...mockCreatedTicket, userId: 42 });

      await ticketController.create(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(ticketService.create).toHaveBeenCalledWith(body, 42);
    });

    it('should throw when service fails', async () => {
      mockRequest.body = body;
      (ticketService.create as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(
        ticketController.create(mockRequest as AuthenticatedRequest, mockResponse as Response)
      ).rejects.toThrow('DB error');
    });
  });

  describe('list', () => {
    it('should return tickets from service with default params', async () => {
      const result = { tickets: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      (ticketService.list as jest.Mock).mockResolvedValue(result);
      mockRequest.query = {};

      await ticketController.list(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(ticketService.list).toHaveBeenCalledWith({});
      expect(mockResponse.success).toHaveBeenCalledWith(result, 'Tickets retrieved successfully');
    });

    it('should validate page and return badRequest when invalid', async () => {
      mockRequest.query = { page: '0' };
      await ticketController.list(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );
      expect(mockResponse.badRequest).toHaveBeenCalledWith(
        'page must be a positive integer',
        'VALIDATION_ERROR'
      );
    });

    it('should validate limit and return badRequest when not allowed', async () => {
      mockRequest.query = { limit: '15' };
      await ticketController.list(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );
      expect(mockResponse.badRequest).toHaveBeenCalledWith(
        expect.stringContaining('limit must be one of'),
        'VALIDATION_ERROR'
      );
    });

    it('should validate status and return badRequest when invalid', async () => {
      mockRequest.query = { status: 'invalid' };
      await ticketController.list(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );
      expect(mockResponse.badRequest).toHaveBeenCalledWith(
        expect.stringContaining('status must be one of'),
        'VALIDATION_ERROR'
      );
    });

    it('should accept valid query params and call service', async () => {
      mockRequest.query = {
        page: '1',
        limit: '20',
        status: 'open',
        sortBy: 'createdat',
        sortOrder: 'desc',
      };
      const result = { tickets: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      (ticketService.list as jest.Mock).mockResolvedValue(result);

      await ticketController.list(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(ticketService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
          status: TicketStatus.OPEN,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        })
      );
      expect(mockResponse.success).toHaveBeenCalledWith(result, 'Tickets retrieved successfully');
    });
  });

  describe('listMine', () => {
    it('should pass userId to list and return result', async () => {
      mockRequest.user = { userId: 5, email: 'u@e.com', roles: ['user'] };
      mockRequest.query = {};
      const result = { tickets: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      (ticketService.list as jest.Mock).mockResolvedValue(result);

      await ticketController.listMine(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(ticketService.list).toHaveBeenCalledWith(expect.objectContaining({ userId: 5 }));
      expect(mockResponse.success).toHaveBeenCalledWith(result, 'Tickets retrieved successfully');
    });
  });

  describe('getById', () => {
    it('should return limited ticket fields and include response when RESOLVED', async () => {
      const ticket = {
        id: 1,
        title: 'T',
        content: 'C',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: TicketStatus.RESOLVED,
        response: 'We fixed it.',
      };
      mockRequest = { ticket } as unknown as TicketCreatorRequest;

      await ticketController.getById(
        mockRequest as TicketCreatorRequest,
        mockResponse as Response
      );

      expect(mockResponse.success).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          title: 'T',
          content: 'C',
          status: TicketStatus.RESOLVED,
          response: 'We fixed it.',
        }),
        'Ticket retrieved successfully'
      );
    });

    it('should omit response when status is OPEN', async () => {
      const ticket = {
        id: 2,
        title: 'T2',
        content: 'C2',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: TicketStatus.OPEN,
        response: null,
      };
      mockRequest = { ticket } as unknown as TicketCreatorRequest;

      await ticketController.getById(
        mockRequest as TicketCreatorRequest,
        mockResponse as Response
      );

      const payload = (mockResponse.success as jest.Mock).mock.calls[0][0];
      expect(payload).not.toHaveProperty('response');
    });
  });

  describe('getByIdForAdminOrAgent', () => {
    it('should return 400 for invalid id', async () => {
      mockRequest.params = { id: 'abc' };
      await ticketController.getByIdForAdminOrAgent(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );
      expect(mockResponse.badRequest).toHaveBeenCalledWith('Invalid ticket ID', 'BAD_REQUEST');
    });

    it('should return 404 when ticket not found', async () => {
      mockRequest.params = { id: '999' };
      (ticketService.getById as jest.Mock).mockResolvedValue(null);
      await ticketController.getByIdForAdminOrAgent(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );
      expect(mockResponse.notFound).toHaveBeenCalled();
    });

    it('should return full ticket when found', async () => {
      const ticket = { id: 1, title: 'T', content: 'C', status: TicketStatus.OPEN };
      mockRequest.params = { id: '1' };
      (ticketService.getById as jest.Mock).mockResolvedValue(ticket);
      await ticketController.getByIdForAdminOrAgent(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );
      expect(mockResponse.success).toHaveBeenCalledWith(ticket, 'Ticket retrieved successfully');
    });
  });

  describe('updateDraft', () => {
    it('should return 400 for invalid id', async () => {
      mockRequest.params = { id: 'x' };
      mockRequest.body = { draftReplyMessage: 'Draft' };
      await ticketController.updateDraft(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );
      expect(mockResponse.badRequest).toHaveBeenCalledWith('Invalid ticket ID', 'BAD_REQUEST');
    });

    it('should return 404 when ticket not found', async () => {
      mockRequest.params = { id: '1' };
      (ticketService.getById as jest.Mock).mockResolvedValue(null);
      mockRequest.body = { draftReplyMessage: 'Draft' };
      await ticketController.updateDraft(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );
      expect(mockResponse.notFound).toHaveBeenCalled();
    });

    it('should return 400 when ticket is RESOLVED', async () => {
      mockRequest.params = { id: '1' };
      (ticketService.getById as jest.Mock).mockResolvedValue({
        id: 1,
        status: TicketStatus.RESOLVED,
      });
      mockRequest.body = { draftReplyMessage: 'Draft' };
      await ticketController.updateDraft(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );
      expect(mockResponse.badRequest).toHaveBeenCalledWith(
        expect.stringContaining('Draft replies can only be edited'),
        'BAD_REQUEST'
      );
    });

    it('should update draft and return success when OPEN', async () => {
      const updated = { id: 1, status: TicketStatus.OPEN, responseDraft: 'New draft' };
      mockRequest.params = { id: '1' };
      (ticketService.getById as jest.Mock).mockResolvedValue({ id: 1, status: TicketStatus.OPEN });
      (ticketService.updateAiReplyMessage as jest.Mock).mockResolvedValue(updated);
      mockRequest.body = { draftReplyMessage: 'New draft' };
      await ticketController.updateDraft(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );
      expect(ticketService.updateAiReplyMessage).toHaveBeenCalledWith(1, 'New draft');
      expect(mockResponse.success).toHaveBeenCalledWith(
        updated,
        'Draft reply message updated successfully'
      );
    });
  });

  describe('close', () => {
    it('should return 400 for invalid id', async () => {
      mockRequest.params = { id: 'nope' };
      await ticketController.close(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );
      expect(mockResponse.badRequest).toHaveBeenCalledWith('Invalid ticket ID', 'BAD_REQUEST');
    });

    it('should return 404 when ticket not found', async () => {
      mockRequest.params = { id: '1' };
      (ticketService.getById as jest.Mock).mockResolvedValue(null);
      await ticketController.close(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );
      expect(mockResponse.notFound).toHaveBeenCalled();
    });

    it('should return 403 when user is not creator', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.user = { userId: 1, email: 'a@b.com', roles: ['user'] };
      (ticketService.getById as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 2,
        status: TicketStatus.OPEN,
      });
      await ticketController.close(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );
      expect(mockResponse.forbidden).toHaveBeenCalledWith(
        'Only the user who created the ticket can close it.',
        'FORBIDDEN'
      );
    });

    it('should return 400 when ticket already closed', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.user = { userId: 1, email: 'a@b.com', roles: ['user'] };
      (ticketService.getById as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 1,
        status: TicketStatus.CLOSED,
      });
      await ticketController.close(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );
      expect(mockResponse.badRequest).toHaveBeenCalledWith(
        'Ticket is already closed.',
        'BAD_REQUEST'
      );
    });

    it('should close ticket and return success when user is creator', async () => {
      const closed = { id: 1, userId: 1, status: TicketStatus.CLOSED };
      mockRequest.params = { id: '1' };
      mockRequest.user = { userId: 1, email: 'a@b.com', roles: ['user'] };
      (ticketService.getById as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 1,
        status: TicketStatus.OPEN,
      });
      (ticketService.closeTicket as jest.Mock).mockResolvedValue(closed);
      await ticketController.close(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );
      expect(ticketService.closeTicket).toHaveBeenCalledWith(1);
      expect(mockResponse.success).toHaveBeenCalledWith(closed, 'Ticket closed successfully');
    });
  });

  describe('resolve', () => {
    it('should return 400 for invalid id', async () => {
      mockRequest.params = { id: 'x' };
      await ticketController.resolve(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );
      expect(mockResponse.badRequest).toHaveBeenCalledWith('Invalid ticket ID', 'BAD_REQUEST');
    });

    it('should return 404 when ticket not found', async () => {
      mockRequest.params = { id: '1' };
      (ticketService.getById as jest.Mock).mockResolvedValue(null);
      await ticketController.resolve(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );
      expect(mockResponse.notFound).toHaveBeenCalled();
    });

    it('should return 400 when ticket has no draft', async () => {
      mockRequest.params = { id: '1' };
      (ticketService.getById as jest.Mock).mockResolvedValue({
        id: 1,
        status: TicketStatus.OPEN,
        responseDraft: null,
      });
      await ticketController.resolve(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );
      expect(mockResponse.badRequest).toHaveBeenCalledWith(
        'Cannot resolve a ticket without a response draft.',
        'BAD_REQUEST'
      );
    });

    it('should resolve ticket and return success', async () => {
      const resolved = { id: 1, status: TicketStatus.RESOLVED, response: 'Done.' };
      mockRequest.params = { id: '1' };
      (ticketService.getById as jest.Mock).mockResolvedValue({
        id: 1,
        status: TicketStatus.OPEN,
        responseDraft: 'Done.',
      });
      (ticketService.resolveTicket as jest.Mock).mockResolvedValue(resolved);
      await ticketController.resolve(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );
      expect(ticketService.resolveTicket).toHaveBeenCalledWith(1, 'Done.');
      expect(mockResponse.success).toHaveBeenCalledWith(resolved, 'Ticket resolved successfully');
    });
  });

  describe('delete', () => {
    it('should return 404 when delete returns null', async () => {
      mockRequest = { ticket: { id: 1 } } as unknown as TicketCreatorRequest;
      (ticketService.delete as jest.Mock).mockResolvedValue(null);
      await ticketController.delete(
        mockRequest as TicketCreatorRequest,
        mockResponse as Response
      );
      expect(mockResponse.notFound).toHaveBeenCalled();
    });

    it('should return success with deleted id', async () => {
      mockRequest = { ticket: { id: 1 } } as unknown as TicketCreatorRequest;
      (ticketService.delete as jest.Mock).mockResolvedValue({ id: 1 });
      await ticketController.delete(
        mockRequest as TicketCreatorRequest,
        mockResponse as Response
      );
      expect(ticketService.delete).toHaveBeenCalledWith(1);
      expect(mockResponse.success).toHaveBeenCalledWith(
        { id: 1 },
        'Ticket deleted successfully'
      );
    });
  });
});
