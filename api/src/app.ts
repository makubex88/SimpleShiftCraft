import express, { type ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import type { ShiftRepository } from './db/repository';
import { createGraphQL } from './graphql';
import { restRouter } from './rest';
import { ConflictError, NotFoundError, createScheduleService } from './service';

export function createApp(repo: ShiftRepository) {
  const service = createScheduleService(repo);
  const yoga = createGraphQL(service);
  const app = express();

  app.use(express.json());
  app.get('/health', (_req, res) => { res.json({ ok: true }); });
  app.use('/api', restRouter(service));
  app.use(yoga.graphqlEndpoint, yoga);

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) return void res.status(400).json({ error: 'Invalid request', details: err.issues });
    if (err instanceof NotFoundError) return void res.status(404).json({ error: err.message });
    if (err instanceof ConflictError) return void res.status(409).json({ error: err.message, details: err.details });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  };
  app.use(onError);

  return app;
}
