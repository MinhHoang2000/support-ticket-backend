import { Request, Response, NextFunction } from 'express';
import { validateDto } from '../../middlewares/validation';
import { CreateTicketDto, TicketStatus } from '../../dtos/ticket.dto';

describe('validateDto middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
    };
    mockResponse = {
      badRequest: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('CreateTicketDto validation', () => {
    const middleware = validateDto(CreateTicketDto);

    it('should call next() for valid input with all fields', async () => {
      mockRequest.body = {
        title: 'Valid Title',
        content: 'Valid content',
        status: 'OPEN',
        category: 'Bug',
        tag: 'frontend',
        sentiment: -1,
        urgency: 'high',
      };

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.badRequest).not.toHaveBeenCalled();
    });

    it('should call next() for valid input with only required fields', async () => {
      mockRequest.body = {
        title: 'Valid Title',
        content: 'Valid content',
        status: 'OPEN',
        category: 'Bug',
      };

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.badRequest).not.toHaveBeenCalled();
    });

    it('should return badRequest when title is missing', async () => {
      mockRequest.body = {
        content: 'Valid content',
        status: 'OPEN',
        category: 'Bug',
      };

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.stringContaining('Title')
      );
    });

    it('should return badRequest when content is missing', async () => {
      mockRequest.body = {
        title: 'Valid Title',
        status: 'OPEN',
        category: 'Bug',
      };

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.stringContaining('Content')
      );
    });

    it('should return badRequest when status is invalid', async () => {
      mockRequest.body = {
        title: 'Valid Title',
        content: 'Valid content',
        status: 'INVALID_STATUS',
        category: 'Bug',
      };

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.stringContaining('Status must be one of')
      );
    });

    it('should return badRequest when category is missing', async () => {
      mockRequest.body = {
        title: 'Valid Title',
        content: 'Valid content',
        status: 'OPEN',
      };

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.stringContaining('Category')
      );
    });

    it('should return badRequest when title exceeds max length', async () => {
      mockRequest.body = {
        title: 'a'.repeat(256),
        content: 'Valid content',
        status: 'OPEN',
        category: 'Bug',
      };

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.stringContaining('255')
      );
    });

    it('should return badRequest when sentiment is not an integer', async () => {
      mockRequest.body = {
        title: 'Valid Title',
        content: 'Valid content',
        status: 'OPEN',
        category: 'Bug',
        sentiment: 'not-a-number',
      };

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.badRequest).toHaveBeenCalledWith(
        'Validation failed',
        expect.stringContaining('Sentiment')
      );
    });

    it('should strip non-whitelisted properties', async () => {
      mockRequest.body = {
        title: 'Valid Title',
        content: 'Valid content',
        status: 'OPEN',
        category: 'Bug',
        unknownField: 'should be stripped',
      };

      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.badRequest).toHaveBeenCalled();
    });

    it('should accept all valid status values', async () => {
      const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

      for (const status of statuses) {
        mockRequest.body = {
          title: 'Valid Title',
          content: 'Valid content',
          status,
          category: 'Bug',
        };
        mockNext = jest.fn();

        await middleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(mockNext).toHaveBeenCalled();
      }
    });
  });
});
