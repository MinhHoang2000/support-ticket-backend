import { Worker } from 'bullmq';
import { redis } from './redis';
import { TICKET_QUEUE_NAME } from './queue';
import { aiService } from '../services/ai.service';
import { ticketService } from '../services/ticket.service';

/** Worker concurrency for ticket queue */
const TICKET_WORKER_CONCURRENCY = 4;

type WorkerProcessStatusValue = 'INFO' | 'ERROR' | 'FAILED' | 'INVALID_RESPONSE';

async function logWorkerProcess(params: {
  workerId: string;
  ticketId: number;
  aiReplyMessage?: string | null;
  rawAiResponse?: string | null;
  status: WorkerProcessStatusValue;
  errorMessage?: string | null;
}) {
  const { prisma } = await import('./prisma');
  await prisma.workerProcess.create({
    data: {
      workerId: params.workerId,
      ticketId: params.ticketId,
      aiReplyMessage: params.aiReplyMessage ?? null,
      rawAiResponse: params.rawAiResponse ?? null,
      status: params.status,
      errorMessage: params.errorMessage ?? null,
    },
  });
}

/**
 * Worker that processes ticket queue jobs. Runs AI triage on new tickets
 * and persists category, sentiment, urgency, and response draft.
 */
export const ticketWorker = new Worker(
  TICKET_QUEUE_NAME,
  async (job) => {
    const { ticketId } = job.data as { ticketId: number };
    const workerId = String(job.id ?? job.name ?? 'unknown');

    if (!ticketId) {
      console.warn('Ticket worker: job missing ticketId', job.id);
      return;
    }

    const { prisma } = await import('./prisma');
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      console.warn('Ticket worker: ticket not found', ticketId);
      await logWorkerProcess({
        workerId,
        ticketId,
        status: 'FAILED',
        errorMessage: `Ticket not found: ${ticketId}`,
      });
      return;
    }

    try {
      const triageOutput = await aiService.triage({
        ticket_id: String(ticket.id),
        title: ticket.title,
        content: ticket.content,
        user_context: ticket.tag ?? undefined,
      });

      if (!triageOutput.valid || !triageOutput.result) {
        await logWorkerProcess({
          workerId,
          ticketId,
          rawAiResponse: triageOutput.raw,
          status: 'INVALID_RESPONSE',
        });
        console.warn('Ticket triage invalid response:', ticketId);
        return;
      }

      await ticketService.updateTriage(ticketId, triageOutput.result);
      await logWorkerProcess({
        workerId,
        ticketId,
        aiReplyMessage: triageOutput.result.response_draft,
        rawAiResponse: triageOutput.raw,
        status: 'INFO',
      });
      console.log('Ticket triage completed:', ticketId, triageOutput.result.category, triageOutput.result.urgency);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logWorkerProcess({
        workerId,
        ticketId,
        status: 'FAILED',
        errorMessage: message,
      });
      throw err;
    }
  },
  { connection: redis, concurrency: TICKET_WORKER_CONCURRENCY }
);

ticketWorker.on('error', (err) => {
  console.error('Ticket worker error:', err);
});

/**
 * Close the ticket worker. Call during graceful shutdown.
 */
export async function closeTicketWorker(): Promise<void> {
  await ticketWorker.close();
}
