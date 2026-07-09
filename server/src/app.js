import express from 'express';
import cors from 'cors';
import { airportsRouter } from './routes/airports.js';
import { flightsRouter } from './routes/flights.js';
import { authRouter } from './routes/auth.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/airports', airportsRouter);
  app.use('/api/flights', flightsRouter);
  app.use('/api/auth', authRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
