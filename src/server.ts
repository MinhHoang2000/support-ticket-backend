import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { responseMiddleware } from './middlewares/response';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { initializeErrorHandlers } from './utils/errorHandler';
import { swaggerSpec } from './config/swagger';
import routes from './routes';
import { prisma } from './lib/prisma';

// Load environment variables
dotenv.config();

// Initialize global error handlers (must be called before anything else)
initializeErrorHandlers();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false, // Disable CSP in dev for Swagger UI
})); // Security headers
app.use(cors()); // Enable CORS

// HTTP request logger - logs all incoming requests
if (NODE_ENV === 'production') {
  app.use(morgan('combined')); // Apache combined log format for production
} else {
  app.use(morgan('dev')); // Colored output for development
}

app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Response middleware - standardizes all API responses
app.use(responseMiddleware);

// Swagger API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Tickets API Documentation',
}));

// API routes
app.use('/', routes);

// 404 handler for unknown routes (must be before error handler)
app.use(notFoundHandler);

// Global error handler (must be last middleware)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${NODE_ENV} mode`);
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    await prisma.$disconnect();
    console.log('HTTP server closed. Database disconnected.');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

export default app;
