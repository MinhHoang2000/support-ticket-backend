import { Request, Response, NextFunction } from 'express';
import { validateDto } from '../../middlewares/validation';
import { CreateTicketDto, UpdateAiReplyDto } from '../../dtos/ticket.dto';
import { SignupDto, LoginDto } from '../../dtos/auth.dto';

describe('validateDto middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = { body: {} };
    mockResponse = {
      badRequest: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('CreateTicketDto', () => {
    const middleware = validateDto(CreateTicketDto);

    it('should call next() for valid title and content', async () => {
      mockRequest.body = { title: 'Valid Title', content: 'Valid content' };
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.badRequest).not.toHaveBeenCalled();
    });

    it('should return badRequest when title is missing', async () => {
      mockRequest.body = { content: 'Valid content' };
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.badRequest).toHaveBeenCalledWith(
        'Validation failed. Please check your input.',
        'VALIDATION_ERROR'
      );
    });

    it('should return badRequest when content is missing', async () => {
      mockRequest.body = { title: 'Valid Title' };
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.badRequest).toHaveBeenCalledWith(
        'Validation failed. Please check your input.',
        'VALIDATION_ERROR'
      );
    });

    it('should return badRequest when title exceeds 255 characters', async () => {
      mockRequest.body = { title: 'a'.repeat(256), content: 'Valid content' };
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.badRequest).toHaveBeenCalled();
    });

    it('should return badRequest when content exceeds 50,000 characters', async () => {
      mockRequest.body = { title: 'T', content: 'a'.repeat(50_001) };
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.badRequest).toHaveBeenCalled();
    });

    it('should strip non-whitelisted properties and fail with forbidNonWhitelisted', async () => {
      mockRequest.body = {
        title: 'T',
        content: 'C',
        extraField: 'not allowed',
      };
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.badRequest).toHaveBeenCalled();
    });
  });

  describe('UpdateAiReplyDto', () => {
    const middleware = validateDto(UpdateAiReplyDto);

    it('should call next() for valid draftReplyMessage', async () => {
      mockRequest.body = { draftReplyMessage: 'Draft reply text' };
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.badRequest).not.toHaveBeenCalled();
    });

    it('should return badRequest when draftReplyMessage exceeds 50,000 chars', async () => {
      mockRequest.body = { draftReplyMessage: 'a'.repeat(50_001) };
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.badRequest).toHaveBeenCalled();
    });
  });

  describe('SignupDto', () => {
    const middleware = validateDto(SignupDto);

    it('should call next() for valid signup body', async () => {
      mockRequest.body = {
        email: 'user@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.badRequest).not.toHaveBeenCalled();
    });

    it('should return badRequest when email is invalid', async () => {
      mockRequest.body = {
        email: 'not-an-email',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.badRequest).toHaveBeenCalled();
    });

    it('should return badRequest when password is too short', async () => {
      mockRequest.body = {
        email: 'user@example.com',
        password: 'short',
        firstName: 'John',
        lastName: 'Doe',
      };
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.badRequest).toHaveBeenCalled();
    });
  });

  describe('LoginDto', () => {
    const middleware = validateDto(LoginDto);

    it('should call next() for valid login body', async () => {
      mockRequest.body = { email: 'user@example.com', password: 'anypassword' };
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.badRequest).not.toHaveBeenCalled();
    });

    it('should return badRequest when email is missing', async () => {
      mockRequest.body = { password: 'secret' };
      await middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockResponse.badRequest).toHaveBeenCalled();
    });
  });
});
