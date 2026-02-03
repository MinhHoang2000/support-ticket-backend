import { ChatOpenAI } from '@langchain/openai';

/** Default OpenAI chat model name */
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

/** Default temperature for chat (0–2). Higher = more random. */
export const DEFAULT_TEMPERATURE = 0.7;

/** Default max tokens per response */
export const DEFAULT_MAX_TOKENS = 1024;

export interface AIModelConfig {
  /** OpenAI model name (e.g. gpt-4o, gpt-4o-mini) */
  model?: string;
  /** Sampling temperature 0–2 */
  temperature?: number;
  /** Max tokens to generate */
  maxTokens?: number;
  /** OpenAI API key (defaults to OPENAI_API_KEY env) */
  apiKey?: string;
}

/**
 * Create a LangChain ChatOpenAI instance with optional overrides.
 * Uses OPENAI_API_KEY from env when apiKey is not provided.
 */
export function createChatModel(config: AIModelConfig = {}): ChatOpenAI {
  const apiKey = config?.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OpenAI API key is required. Set OPENAI_API_KEY in .env or pass apiKey in config.'
    );
  }

  return new ChatOpenAI({
    model: config.model ?? DEFAULT_OPENAI_MODEL,
    temperature: config.temperature ?? DEFAULT_TEMPERATURE,
    maxTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
    apiKey,
  });
}

/**
 * Default chat model instance. Use for simple invoke/stream calls.
 * Lazy-initialized so env is loaded before first use.
 */
let defaultChatModel: ChatOpenAI | null = null;

/**
 * Get the default ChatOpenAI instance. Creates it on first access.
 */
export function getDefaultChatModel(): ChatOpenAI {
  if (!defaultChatModel) {
    defaultChatModel = createChatModel();
  }
  return defaultChatModel;
}

/**
 * Reset the default model (e.g. for tests or config changes).
 */
export function resetDefaultChatModel(): void {
  defaultChatModel = null;
}
