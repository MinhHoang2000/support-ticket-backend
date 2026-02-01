import { Queue, QueueOptions } from 'bullmq';
import { redis } from './redis';

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

/**
 * Close all queue connections. Call during graceful shutdown.
 * Close workers (e.g. closeTicketWorker) before calling this.
 */
export async function closeQueues(): Promise<void> {
  await ticketQueue.close();
  await defaultQueue.close();
}
