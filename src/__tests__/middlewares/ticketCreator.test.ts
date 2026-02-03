import { Response, NextFunction } from 'express';
import { requireTicketCreator } from '../../middlewares/ticketCreator';
import { ticketService } from '../../services/ticket.service';
import type { AuthenticatedRequest } from '../../middlewares/auth';

jest.mock('../../services/ticket.service');

describe('requireTicketCreator', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      params: {},
      user: { userId: 1, email: 'u@e.com', roles: ['user'] },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 400 for invalid id (non-integer)', async () => {
    mockRequest.params = { id: 'abc' };
    await requireTicketCreator(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(ticketService.getById).not.toHaveBeenCalled();
  });

  it('should return 400 for id less than 1', async () => {
    mockRequest.params = { id: '0' };
    await requireTicketCreator(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
  });

  it('should return 404 when ticket not found', async () => {
    mockRequest.params = { id: '999' };
    (ticketService.getById as jest.Mock).mockResolvedValue(null);
    await requireTicketCreator(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(404);
  });

  it('should return 403 when ticket has no userId (no creator)', async () => {
    mockRequest.params = { id: '1' };
    (ticketService.getById as jest.Mock).mockResolvedValue({
      id: 1,
      userId: null,
    });
    await requireTicketCreator(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(403);
  });

  it('should return 403 when user is not the creator', async () => {
    mockRequest.params = { id: '1' };
    mockRequest.user = { userId: 1, email: 'a@b.com', roles: ['user'] };
    (ticketService.getById as jest.Mock).mockResolvedValue({
      id: 1,
      userId: 2,
    });
    await requireTicketCreator(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(403);
  });

  it('should attach ticket and call next when user is creator', async () => {
    const ticket = { id: 1, userId: 1, title: 'T', content: 'C' };
    mockRequest.params = { id: '1' };
    mockRequest.user = { userId: 1, email: 'u@e.com', roles: ['user'] };
    (ticketService.getById as jest.Mock).mockResolvedValue(ticket);
    await requireTicketCreator(
      mockRequest as AuthenticatedRequest,
      mockResponse as Response,
      mockNext
    );
    expect((mockRequest as any).ticket).toEqual(ticket);
    expect(mockNext).toHaveBeenCalled();
  });
});
