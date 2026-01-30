import { CustomError } from '../middlewares/errorHandler';

// Handle uncaught exceptions
export const handleUncaughtException = (): void => {
  process.on('uncaughtException', (error: Error) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error('Error:', error.name, error.message);
    console.error('Stack:', error.stack);
    
    // Give the server time to log the error and send responses
    // In production, you might want to use a process manager like PM2
    // which will automatically restart the process
    process.exit(1);
  });
};

// Handle unhandled promise rejections
export const handleUnhandledRejection = (): void => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error('Reason:', reason);
    console.error('Promise:', promise);
    
    // Log the error but don't crash immediately
    // In production, you might want to gracefully shut down
    // For now, we'll log and continue, but you can change this to process.exit(1)
    if (reason instanceof Error) {
      console.error('Error:', reason.name, reason.message);
      console.error('Stack:', reason.stack);
    }
    
    // In production, you might want to exit here
    // process.exit(1);
  });
};

// Initialize all error handlers
export const initializeErrorHandlers = (): void => {
  handleUncaughtException();
  handleUnhandledRejection();
};
