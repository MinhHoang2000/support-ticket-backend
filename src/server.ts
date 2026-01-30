import app from './app';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { closeQueue } from './lib/queue';
import { checkHealthOnStartup } from './lib/healthCheck';

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer(): Promise<void> {
  await checkHealthOnStartup();

  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${NODE_ENV} mode`);
  });

  const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      try {
        await closeQueue();
        await prisma.$disconnect();
        await redis.quit();
        console.log('HTTP server closed. Database, Redis and queue disconnected.');
      } catch (err) {
        console.error('Error during shutdown:', err);
      }
      process.exit(0);
    });

    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
}

void startServer();

export default app;
