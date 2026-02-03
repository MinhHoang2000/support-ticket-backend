import { prisma } from "../lib/prisma";
import { CreateTicketDto, TicketStatus } from "../dtos/ticket.dto";
import { Prisma, Ticket, WorkerProcess } from "@prisma/client";
import type { TriageResult } from "./ai.service";

/** Ticket fields returned by list (same shape as DB, no computed fields) */
export type TicketListRow = Pick<
  Ticket,
  | "id"
  | "title"
  | "content"
  | "createdAt"
  | "updatedAt"
  | "status"
  | "category"
  | "tag"
  | "sentiment"
  | "urgency"
  | "replyMadeBy"
>;

export type TicketSortBy = "createdAt" | "title";
export type TicketSortOrder = "asc" | "desc";

export interface ListTicketsOptions {
  page?: number;
  limit?: number;
  /** When set, only tickets for this user are returned. */
  userId?: number;
  status?: TicketStatus;
  category?: string;
  sentiment?: number;
  urgency?: string;
  sortBy?: TicketSortBy;
  sortOrder?: TicketSortOrder;
  /** Full-text search in title (PostgreSQL FTS). When set, uses raw SQL for list/count. */
  search?: string;
}

export interface ListTicketsResult {
  tickets: TicketListRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class TicketService {
  /**
   * Create a new ticket in the database. Optionally associate with a user (userId).
   */
  async create(data: CreateTicketDto, userId?: number): Promise<Ticket> {
    return prisma.ticket.create({
      data: {
        title: data.title,
        content: data.content,
        userId: userId ?? null,
        status: TicketStatus.OPEN,
        category: null,
        tag: null,
        sentiment: null,
        urgency: null,
        responseDraft: null,
        replyMadeBy: null,
      },
    });
  }

  /**
   * Get a single ticket by ID. Returns full ticket (same format as DB). Returns null if not found.
   */
  async getById(id: number): Promise<Ticket | null> {
    return prisma.ticket.findUnique({
      where: { id },
    });
  }

  private static readonly DEFAULT_LIMIT = 20;

  /** Build Prisma where clause from list options. */
  private buildWhereClause(
    options: ListTicketsOptions,
  ): Prisma.TicketWhereInput {
    const where: Prisma.TicketWhereInput = {};
    if (options.userId != null) where.userId = options.userId;
    if (options.status != null) where.status = options.status;
    if (options.category != null && options.category !== "")
      where.category = options.category;
    if (options.sentiment != null && Number.isInteger(options.sentiment))
      where.sentiment = options.sentiment;
    if (options.urgency != null && options.urgency !== "")
      where.urgency = options.urgency;
    return where;
  }

  /** Build Prisma orderBy from sort options. */
  private buildOrderByClause(
    sortBy: TicketSortBy = "createdAt",
    sortOrder: TicketSortOrder = "desc",
  ): Prisma.TicketOrderByWithRelationInput {
    return sortBy === "createdAt"
      ? ({ createdAt: sortOrder } as const)
      : ({ title: sortOrder } as const);
  }

  /**
   * List tickets with pagination, filters, sort, and optional full-text search in title.
   * When search is provided, uses PostgreSQL FTS (to_tsvector/plainto_tsquery) via raw SQL.
   * limit must be 10, 20, 50, or 100 (enforced by controller).
   */
  async list(options: ListTicketsOptions = {}): Promise<ListTicketsResult> {
    const page = Math.max(1, options.page ?? 1);
    const limit = options.limit ?? TicketService.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const searchTerm = options.search?.trim();
    if (searchTerm) {
      return this.listWithFullTextSearch({
        ...options,
        page,
        limit,
        skip,
        searchTerm,
      });
    }

    const where = this.buildWhereClause(options);
    const orderBy = this.buildOrderByClause(options.sortBy, options.sortOrder);

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          status: true,
          category: true,
          tag: true,
          sentiment: true,
          urgency: true,
          replyMadeBy: true,
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return {
      tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Build raw SQL where conditions for FTS list (includes search + filters). */
  private buildWhereSqlConditions(
    options: ListTicketsOptions & { searchTerm: string },
  ): Prisma.Sql {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`to_tsvector('english', title) @@ plainto_tsquery('english', ${options.searchTerm})`,
    ];
    if (options.userId != null)
      conditions.push(Prisma.sql`"user_id" = ${options.userId}`);
    if (options.status != null)
      conditions.push(Prisma.sql`status = ${options.status}`);
    if (options.category != null && options.category !== "")
      conditions.push(Prisma.sql`category = ${options.category}`);
    if (options.sentiment != null && Number.isInteger(options.sentiment))
      conditions.push(Prisma.sql`sentiment = ${options.sentiment}`);
    if (options.urgency != null && options.urgency !== "")
      conditions.push(Prisma.sql`urgency = ${options.urgency}`);
    return Prisma.join(conditions, " AND ");
  }

  /** Build raw SQL order clause (column and direction). */
  private buildOrderByRaw(
    sortBy: TicketSortBy = "createdAt",
    sortOrder: TicketSortOrder = "desc",
  ): { orderColumn: string; orderDir: "ASC" | "DESC" } {
    const orderColumn = sortBy === "createdAt" ? '"createdAt"' : "title";
    const orderDir = sortOrder.toUpperCase() as "ASC" | "DESC";
    return { orderColumn, orderDir };
  }

  /**
   * List with PostgreSQL full-text search on title. Uses raw SQL for FTS condition.
   */
  private async listWithFullTextSearch(
    options: ListTicketsOptions & {
      page: number;
      limit: number;
      skip: number;
      searchTerm: string;
    },
  ): Promise<ListTicketsResult> {
    const {
      page,
      limit,
      skip,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const whereSql = this.buildWhereSqlConditions(options);
    const { orderColumn, orderDir } = this.buildOrderByRaw(sortBy, sortOrder);

    const tickets = await prisma.$queryRaw<TicketListRow[]>`
      SELECT id, title, content, "createdAt", "updatedAt", status, category, tag, sentiment, urgency, "reply_made_by" AS "replyMadeBy"
      FROM tickets
      WHERE ${whereSql}
      ORDER BY ${Prisma.raw(orderColumn)} ${Prisma.raw(orderDir)}
      LIMIT ${limit}
      OFFSET ${skip}
    `;

    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count
      FROM tickets
      WHERE ${whereSql}
    `;
    const total = Number(countResult[0]?.count ?? 0);

    return {
      tickets: tickets as TicketListRow[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update only ai_reply_message for the latest worker process of a ticket.
   * Returns the updated WorkerProcess, or null if ticket not found or has no worker process.
   */
  async updateAiReplyMessage(
    ticketId: number,
    draftReplyMessage: string,
  ): Promise<Ticket | null> {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return null;

    return await prisma.ticket.update({
      where: { id: ticketId },
      data: { replyMadeBy: "HUMAN_AI", responseDraft: draftReplyMessage },
    });
  }

  /**
   * Delete a ticket by ID. Related worker processes are cascade-deleted.
   * Returns the deleted ticket, or null if not found.
   */
  async delete(id: number): Promise<Ticket | null> {
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) return null;
    await prisma.ticket.delete({ where: { id } });
    return ticket;
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
        replyMadeBy: "AI",
      },
    });
  }

  /** Triage outcome tags set by the worker after AI triage. */
  static readonly TRIAGE_TAG = {
    DONE: "AI_TRIAGE_DONE",
    NO_RESULT: "AI_TRIAGE_NO_RESULT",
    ERROR: "AI_TRIAGE_ERROR",
  } as const;

  /**
   * Append a triage outcome tag to the ticket (e.g. AI_TRIAGE_DONE, AI_TRIAGE_NO_RESULT, AI_TRIAGE_ERROR).
   * Preserves existing tag by appending with a comma.
   */
  async addTriageTag(ticketId: number, triageTag: string): Promise<Ticket> {
    const row = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { tag: true },
    });
    if (!row) throw new Error(`Ticket not found: ${ticketId}`);
    const newTag = row.tag ? `${row.tag},${triageTag}` : triageTag;
    return prisma.ticket.update({
      where: { id: ticketId },
      data: { tag: newTag },
    });
  }
}

export const ticketService = new TicketService();
