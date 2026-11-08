import pg from 'pg';
import { createApp } from './app';
import { InMemoryRepository, type ShiftRepository } from './db/repository';
import { PgRepository } from './db/pgRepository';

// With DATABASE_URL we use Postgres; without it, an in-memory demo week (no setup needed).
const url = process.env.DATABASE_URL;
const repo: ShiftRepository = url ? new PgRepository(new pg.Pool({ connectionString: url })) : new InMemoryRepository();
const port = Number(process.env.PORT ?? 4000);

createApp(repo).listen(port, () => {
  console.log(`API on http://localhost:${port}  (REST /api, GraphQL /graphql, storage: ${url ? 'postgres' : 'in-memory'})`);
});
