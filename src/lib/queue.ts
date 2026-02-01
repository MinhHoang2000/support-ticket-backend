import { Queue, QueueOptions, Worker, WorkerOptions } from 'bullmq';
import { redis } from './redis';
import { aiService } from '../services/ai.service';
import { ticketService } from '../services/ticket.service';

/** Queue name for ticket-related jobs */
export const TICKET_QUEUE_NAME = 'ticket';

const defaultQueueOptions: QueueOptions = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
};

/**
 * Default queue instance. Use for adding jobs.
 * Create named queues with createQueue() for different job types.
 */
export const defaultQueue = new Queue('default', defaultQueueOptions);

/**
 * Ticket queue. Add jobs when tickets are created or updated.
 */
export const ticketQueue = new Queue(TICKET_QUEUE_NAME, defaultQueueOptions);

/**
 * Create a BullMQ queue with the shared Redis connection.
 */
export function createQueue(name: string, options: Partial<QueueOptions> = {}): Queue {
  return new Queue(name, {
    ...defaultQueueOptions,
    ...options,
    connection: options.connection ?? redis,
  });
}

const defaultWorkerOptions: WorkerOptions = {
  connection: redis,
  concurrency: 4,
};

/**
 * Log a worker process record (info on success, error/failed on failure).
 */
type WorkerProcessStatusValue = 'INFO' | 'ERROR' | 'FAILED';

async function logWorkerProcess(params: {
  workerId: string;
  ticketId: number;
  aiResponse?: string | null;
  status: WorkerProcessStatusValue;
  errorMessage?: string | null;
}) {
  const { prisma } = await import('./prisma');
  await prisma.workerProcess.create({
    data: {
      workerId: params.workerId,
      ticketId: params.ticketId,
      aiResponse: params.aiResponse ?? null,
      status: params.status,
      errorMessage: params.errorMessage ?? null,
    },
  });
}

/**
 * Worker that processes ticket queue jobs. Runs AI triage on new tickets
 * and persists category, sentiment, urgency, and response draft.
 */
const ticketWorker = new Worker(
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
      const triage = await aiService.triage({
        ticket_id: String(ticket.id),
        title: ticket.title,
        content: ticket.content,
        user_context: ticket.tag ?? undefined,
      });

      await ticketService.updateTriage(ticketId, triage);
      await logWorkerProcess({
        workerId,
        ticketId,
        aiResponse: triage.response_draft,
        status: 'INFO',
      });
      console.log('Ticket triage completed:', ticketId, triage.category, triage.urgency);
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
  defaultWorkerOptions
);

ticketWorker.on('error', (err) => {
  console.error('Ticket worker error:', err);
});

/**
 * Close all queue and worker connections. Call during graceful shutdown.
 */
export async function closeQueue(): Promise<void> {
  await ticketWorker.close();
  await ticketQueue.close();
  await defaultQueue.close();
}
