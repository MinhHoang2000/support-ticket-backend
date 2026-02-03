import { AIService } from '../../services/ai.service';
import * as aiModel from '../../lib/ai-model';

const mockInvoke = jest.fn();
jest.mock('../../lib/ai-model', () => ({
  getDefaultChatModel: jest.fn(() => ({ invoke: mockInvoke })),
  createChatModel: jest.fn(() => ({ invoke: mockInvoke })),
}));

describe('AIService', () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = new AIService();
    jest.clearAllMocks();
  });

  describe('chat', () => {
    it('should send message and return content', async () => {
      mockInvoke.mockResolvedValue({
        content: 'Hello from AI',
        response_metadata: {},
      });

      const result = await aiService.chat({ message: 'Hi' });

      expect(result.content).toBe('Hello from AI');
      expect(aiModel.getDefaultChatModel).toHaveBeenCalled();
      expect(mockInvoke).toHaveBeenCalled();
    });

    it('should include history when provided', async () => {
      mockInvoke.mockResolvedValue({ content: 'Reply', response_metadata: {} });
      await aiService.chat({
        message: 'Second',
        history: [
          { role: 'user', content: 'First' },
          { role: 'assistant', content: 'First reply' },
        ],
      });
      const messages = mockInvoke.mock.calls[0][0];
      expect(messages.length).toBe(3);
      expect(messages[0]._getType()).toBe('human');
      expect(messages[1]._getType()).toBe('ai');
      expect(messages[2]._getType()).toBe('human');
    });

    it('should return usage when present in response', async () => {
      mockInvoke.mockResolvedValue({
        content: 'Ok',
        response_metadata: {
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15,
          },
        },
      });
      const result = await aiService.chat({ message: 'Hi' });
      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      });
    });
  });

  describe('triage', () => {
    it('should return valid triage result when AI returns valid JSON', async () => {
      const rawJson = JSON.stringify({
        ticket_id: '42',
        category: 'Technical',
        sentiment_score: 5,
        urgency: 'Medium',
        response_draft: 'We will look into this issue.',
      });
      mockInvoke.mockResolvedValue({ content: rawJson });

      const result = await aiService.triage({
        ticket_id: '42',
        title: 'Bug',
        content: 'App crashes',
      });

      expect(result.valid).toBe(true);
      expect(result.result).not.toBeNull();
      expect(result.result!.ticket_id).toBe('42');
      expect(result.result!.category).toBe('Technical');
      expect(result.result!.sentiment_score).toBe(5);
      expect(result.result!.urgency).toBe('Medium');
      expect(result.result!.response_draft).toBe('We will look into this issue.');
      expect(aiModel.createChatModel).toHaveBeenCalledWith({
        temperature: 0.2,
        maxTokens: 1024,
      });
    });

    it('should strip markdown code block from raw response', async () => {
      const raw = '```json\n' + JSON.stringify({
        ticket_id: '1',
        category: 'Billing',
        sentiment_score: 3,
        urgency: 'High',
        response_draft: 'Draft',
      }) + '\n```';
      mockInvoke.mockResolvedValue({ content: raw });

      const result = await aiService.triage({
        ticket_id: '1',
        title: 'T',
        content: 'C',
      });

      expect(result.valid).toBe(true);
      expect(result.result!.category).toBe('Billing');
    });

    it('should return valid: false when AI returns invalid JSON', async () => {
      mockInvoke.mockResolvedValue({ content: 'not json at all' });

      const result = await aiService.triage({
        ticket_id: '1',
        title: 'T',
        content: 'C',
      });

      expect(result.valid).toBe(false);
      expect(result.result).toBeNull();
      expect(result.raw).toBe('not json at all');
    });

    it('should use fallback ticket_id when missing in parsed JSON', async () => {
      const rawJson = JSON.stringify({
        category: 'Feature Request',
        sentiment_score: 7,
        urgency: 'Low',
        response_draft: 'Thanks for the idea.',
      });
      mockInvoke.mockResolvedValue({ content: rawJson });

      const result = await aiService.triage({
        ticket_id: '99',
        title: 'T',
        content: 'C',
      });

      expect(result.result!.ticket_id).toBe('99');
    });

    it('should normalize invalid category to Technical', async () => {
      const rawJson = JSON.stringify({
        ticket_id: '1',
        category: 'InvalidCategory',
        sentiment_score: 5,
        urgency: 'Medium',
        response_draft: 'Draft',
      });
      mockInvoke.mockResolvedValue({ content: rawJson });

      const result = await aiService.triage({
        ticket_id: '1',
        title: 'T',
        content: 'C',
      });

      expect(result.result!.category).toBe('Technical');
    });

    it('should include user_context in prompt when provided', async () => {
      mockInvoke.mockResolvedValue({
        content: JSON.stringify({
          ticket_id: '1',
          category: 'Technical',
          sentiment_score: 5,
          urgency: 'Medium',
          response_draft: 'Draft',
        }),
      });
      await aiService.triage({
        ticket_id: '1',
        title: 'T',
        content: 'C',
        user_context: 'Premium user',
      });
      const messages = mockInvoke.mock.calls[0][0];
      const humanContent = messages.find((m: { _getType: () => string }) => m._getType() === 'human');
      expect(humanContent.content).toContain('user_context: Premium user');
    });

    it('should return valid: false when response_draft is empty after trim', async () => {
      const rawJson = JSON.stringify({
        ticket_id: '1',
        category: 'Technical',
        sentiment_score: 5,
        urgency: 'Medium',
        response_draft: '   ',
      });
      mockInvoke.mockResolvedValue({ content: rawJson });

      const result = await aiService.triage({
        ticket_id: '1',
        title: 'T',
        content: 'C',
      });

      expect(result.valid).toBe(false);
      expect(result.result).not.toBeNull();
    });
  });
});
