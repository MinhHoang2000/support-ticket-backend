import { HumanMessage, AIMessage, BaseMessage, SystemMessage } from '@langchain/core/messages';
import {
  getDefaultChatModel,
  createChatModel,
  type AIModelConfig,
} from '../lib/ai-model';

/** Allowed triage categories */
export const TRIAGE_CATEGORIES = ['Billing', 'Technical', 'Feature Request'] as const;
export type TriageCategory = (typeof TRIAGE_CATEGORIES)[number];

/** Allowed urgency levels */
export const TRIAGE_URGENCIES = ['High', 'Medium', 'Low'] as const;
export type TriageUrgency = (typeof TRIAGE_URGENCIES)[number];

export interface TriageInput {
  ticket_id: string;
  title: string;
  content: string;
  user_context?: string;
}

export interface TriageResult {
  ticket_id: string;
  category: TriageCategory;
  sentiment_score: number;
  urgency: TriageUrgency;
  response_draft: string;
}

const TRIAGE_SYSTEM_PROMPT = `You are an AI customer support triage engine operating inside a backend background worker. Your task is to analyze a user support ticket and return a structured triage result suitable for direct database storage and downstream automation. You will receive the following input: ticket_id (string), title (string, the ticket subject/summary), content (string, the full message body/details), and an optional user_context (string, which may be empty). Use both title and content when categorizing, scoring sentiment, and assessing urgency—the title gives a quick summary while the content provides full context. First, categorize the issue into exactly one of the following categories: Billing, Technical, or Feature Request. Second, analyze the sentiment of the ticket (title + content) and return an integer sentiment_score from 1 (very negative) to 10 (very positive). Third, determine the urgency level as one of the following values only: High (service down, payment blocked, or severe frustration), Medium (a workaround exists or the issue is non-critical), or Low (suggestions or nice-to-have feature requests). Fourth, draft a polite, empathetic, and context-aware response that is ready to send to the customer. The response must not mention internal systems, internal processes, or AI, and must not make promises unless you are certain. You must return ONLY valid JSON and nothing else—no markdown, no explanations, no comments. The output must match this exact JSON schema: { "ticket_id": "string", "category": "Billing | Technical | Feature Request", "sentiment_score": 1, "urgency": "High | Medium | Low", "response_draft": "string" }. The sentiment_score must be an integer between 1 and 10. The category and urgency values must match the allowed values exactly. Do not add extra fields, do not return arrays, and do not return null values. If you violate any of these constraints, the output is considered invalid.`;

export interface ChatInput {
  /** User message or prompt */
  message: string;
  /** Optional conversation history for context */
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Optional model overrides for this request */
  modelConfig?: AIModelConfig;
}

export interface ChatResult {
  /** Assistant reply text */
  content: string;
  /** Token usage if available */
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

/**
 * AI service using LangChain and OpenAI.
 * Supports single-turn chat and multi-turn with history.
 */
export class AIService {
  /**
   * Send a message to the LLM and get a reply.
   * Uses default model unless modelConfig is provided.
   */
  async chat(input: ChatInput): Promise<ChatResult> {
    const model = input.modelConfig ? createChatModel(input.modelConfig) : getDefaultChatModel();

    const messages: BaseMessage[] = [];

    if (input.history?.length) {
      for (const turn of input.history) {
        if (turn.role === 'user') {
          messages.push(new HumanMessage(turn.content));
        } else {
          messages.push(new AIMessage(turn.content));
        }
      }
    }

    messages.push(new HumanMessage(input.message));

    const response = await model.invoke(messages);
    const content = typeof response.content === 'string' ? response.content : String(response.content);

    const usage = response.response_metadata?.usage as
      | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
      | undefined;

    return {
      content,
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : undefined,
    };
  }

  /**
   * Analyze a support ticket and return structured triage result for database storage.
   * Uses low temperature for deterministic structured output.
   */
  async triage(input: TriageInput): Promise<TriageResult> {
    const model = createChatModel({ temperature: 0.2, maxTokens: 1024 });

    const userContent =
      input.user_context && input.user_context.trim()
        ? `ticket_id: ${input.ticket_id}\ntitle: ${input.title}\ncontent: ${input.content}\nuser_context: ${input.user_context}`
        : `ticket_id: ${input.ticket_id}\ntitle: ${input.title}\ncontent: ${input.content}`;

    const messages: BaseMessage[] = [
      new SystemMessage(TRIAGE_SYSTEM_PROMPT),
      new HumanMessage(userContent),
    ];

    const response = await model.invoke(messages);
    const raw = typeof response.content === 'string' ? response.content : String(response.content);

    const parsed = this.parseTriageResponse(raw, input.ticket_id);
    this.validateTriageResult(parsed);
    return parsed;
  }

  private parseTriageResponse(raw: string, fallbackTicketId: string): TriageResult {
    const trimmed = raw.trim();
    const jsonStr = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    try {
      const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
      return {
        ticket_id: typeof parsed.ticket_id === 'string' ? parsed.ticket_id : fallbackTicketId,
        category: this.normalizeCategory(parsed.category),
        sentiment_score: this.normalizeSentiment(parsed.sentiment_score),
        urgency: this.normalizeUrgency(parsed.urgency),
        response_draft: typeof parsed.response_draft === 'string' ? parsed.response_draft : '',
      };
    } catch {
      throw new Error(`AI triage returned invalid JSON: ${raw.slice(0, 200)}...`);
    }
  }

  private normalizeCategory(value: unknown): TriageCategory {
    const s = String(value).trim();
    if (TRIAGE_CATEGORIES.includes(s as TriageCategory)) return s as TriageCategory;
    return 'Technical';
  }

  private normalizeSentiment(value: unknown): number {
    const n = typeof value === 'number' ? value : parseInt(String(value), 10);
    if (Number.isInteger(n) && n >= 1 && n <= 10) return n;
    return 5;
  }

  private normalizeUrgency(value: unknown): TriageUrgency {
    const s = String(value).trim();
    if (TRIAGE_URGENCIES.includes(s as TriageUrgency)) return s as TriageUrgency;
    return 'Medium';
  }

  private validateTriageResult(result: TriageResult): void {
    if (!TRIAGE_CATEGORIES.includes(result.category)) result.category = 'Technical';
    if (!Number.isInteger(result.sentiment_score) || result.sentiment_score < 1 || result.sentiment_score > 10) {
      result.sentiment_score = 5;
    }
    if (!TRIAGE_URGENCIES.includes(result.urgency)) result.urgency = 'Medium';
  }

  /**
   * Stream the LLM response token-by-token.
   * Uses default model unless modelConfig is provided.
   */
  async *streamChat(input: ChatInput): AsyncGenerator<string, void, unknown> {
    const model = input.modelConfig ? createChatModel(input.modelConfig) : getDefaultChatModel();

    const messages: BaseMessage[] = [];

    if (input.history?.length) {
      for (const turn of input.history) {
        if (turn.role === 'user') {
          messages.push(new HumanMessage(turn.content));
        } else {
          messages.push(new AIMessage(turn.content));
        }
      }
    }

    messages.push(new HumanMessage(input.message));

    const stream = await model.stream(messages);

    for await (const chunk of stream) {
      const text = typeof chunk.content === 'string' ? chunk.content : String(chunk.content);
      if (text) yield text;
    }
  }
}

export const aiService = new AIService();
