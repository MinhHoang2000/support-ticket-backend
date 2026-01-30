import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * @swagger
 * components:
 *   schemas:
 *     TicketStatus:
 *       type: string
 *       enum: [OPEN, IN_PROGRESS, RESOLVED, CLOSED]
 *       description: The status of the ticket
 */
export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateTicketDto:
 *       type: object
 *       required:
 *         - title
 *         - content
 *         - status
 *         - category
 *       properties:
 *         title:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: The title of the ticket
 *           example: "Login page not loading"
 *         content:
 *           type: string
 *           minLength: 1
 *           description: The detailed content/description of the ticket
 *           example: "When I try to access the login page, it shows a blank screen."
 *         status:
 *           $ref: '#/components/schemas/TicketStatus'
 *           example: "OPEN"
 *         category:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: The category of the ticket
 *           example: "Bug"
 *         tag:
 *           type: string
 *           maxLength: 50
 *           description: Optional tag for the ticket
 *           example: "frontend"
 *         sentiment:
 *           type: integer
 *           description: Optional sentiment score
 *           example: -1
 *         urgency:
 *           type: string
 *           maxLength: 50
 *           description: Optional urgency level
 *           example: "high"
 */
export class CreateTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(1, { message: 'Title must not be empty' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Content is required' })
  @MinLength(1, { message: 'Content must not be empty' })
  content!: string;

  @IsEnum(TicketStatus, {
    message: 'Status must be one of: OPEN, IN_PROGRESS, RESOLVED, CLOSED',
  })
  @IsNotEmpty({ message: 'Status is required' })
  status!: TicketStatus;

  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  @MinLength(1, { message: 'Category must not be empty' })
  @MaxLength(100, { message: 'Category must not exceed 100 characters' })
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Tag must not exceed 50 characters' })
  tag?: string;

  @IsOptional()
  @IsInt({ message: 'Sentiment must be an integer' })
  sentiment?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Urgency must not exceed 50 characters' })
  urgency?: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Ticket:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the ticket
 *           example: 1
 *         title:
 *           type: string
 *           description: The title of the ticket
 *           example: "Login page not loading"
 *         content:
 *           type: string
 *           description: The detailed content/description of the ticket
 *           example: "When I try to access the login page, it shows a blank screen."
 *         status:
 *           $ref: '#/components/schemas/TicketStatus'
 *         category:
 *           type: string
 *           description: The category of the ticket
 *           example: "Bug"
 *         tag:
 *           type: string
 *           nullable: true
 *           description: Optional tag for the ticket
 *           example: "frontend"
 *         sentiment:
 *           type: integer
 *           nullable: true
 *           description: Optional sentiment score
 *           example: -1
 *         urgency:
 *           type: string
 *           nullable: true
 *           description: Optional urgency level
 *           example: "high"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the ticket was created
 *           example: "2026-01-30T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the ticket was last updated
 *           example: "2026-01-30T10:30:00.000Z"
 */
