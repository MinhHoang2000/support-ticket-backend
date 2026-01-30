import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { responseMiddleware } from './middlewares/response';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { defaultRateLimiter } from './middlewares/rateLimiter';
import { initializeErrorHandlers } from './utils/errorHandler';
import { swaggerSpec } from './config/swagger';
import routes from './routes';

dotenv.config();
initializeErrorHandlers();

const app = express();
const NODE_ENV = process.env.NODE_ENV || 'development';

app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
}));
app.use(cors());

if (NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(responseMiddleware);

// Rate limit by IP: default 100 requests / 60s; use createRateLimiter() for per-route limits
app.set('trust proxy', 1);
app.use(defaultRateLimiter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Tickets API Documentation',
}));

app.use('/', routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
