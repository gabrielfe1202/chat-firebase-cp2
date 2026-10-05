import cors from 'cors';
import express, { type Express } from 'express';

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  return app;
}

export const app = createApp();
