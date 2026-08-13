import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import pinoHttpModule from 'pino-http';

const pinoHttp = pinoHttpModule.default ?? pinoHttpModule;

import { env } from './config/index.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { healthRouter } from './modules/health/index.js';
import { userRouter } from './modules/users/index.js';
import { adminRouter } from './modules/admin/index.js';
import { authRouter } from './modules/auth/index.js';


export const createApp = (): Express => {
  const app = express();

  app.disable('x-powered-by');

  app.use(
    pinoHttp({
      level: env.LOG_LEVEL,
    }),
  );

  app.use(requestIdMiddleware);

  app.use(cookieParser());

  app.use(helmet());

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));

  app.use(
    express.urlencoded({
      extended: true,
      limit: '1mb',
    }),
  );

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'LinkHub API',
    });
  });

  app.use('/api/v1/health', healthRouter);

  app.use('/api/v1/users', userRouter);

  app.use('/api/v1/auth', authRouter);

  app.use('/api/v1/admin',adminRouter);

  app.use(notFoundMiddleware);

  app.use(errorMiddleware);

  return app;
};
