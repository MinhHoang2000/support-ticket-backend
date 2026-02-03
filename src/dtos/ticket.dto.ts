import {
  IsString,
  IsNotEmpty,
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
 *     ReplyMadeBy:
 *       type: string
 *       enum: [AI, HUMAN_AI]
 *       description: AI = only AI message reply, no edit. HUMAN_AI = someone edited the AI response.
 */
export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum ReplyMadeBy {
  AI = 'AI',
  HUMAN_AI = 'HUMAN_AI',
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
  @MaxLength(50_000, { message: 'Content must not exceed 50,000 characters' })
  content!: string;
}

/** DTO for PATCH /tickets/:id/draft - update only draft_reply_message */
export class UpdateAiReplyDto {
  @IsString()
  @MaxLength(50_000, { message: 'Draft reply message must not exceed 50,000 characters' })
  draftReplyMessage!: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateAiReplyDto:
 *       type: object
 *       required:
 *         - aiReplyMessage
 *       properties:
 *         aiReplyMessage:
 *           type: string
 *           description: New value for ai_reply_message (worker process AI draft)
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
 *         responseDraft:
 *           type: string
 *           nullable: true
 *           description: AI-generated response draft (detail view only)
 *         response:
 *           type: string
 *           nullable: true
 *           description: Reply sent to the user
 *         replyMadeBy:
 *           $ref: '#/components/schemas/ReplyMadeBy'
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
