import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { InMemoryRepository } from './db/repository';
import { SEED_SCHEDULE_ID } from './domain/fixtures';

const id = SEED_SCHEDULE_ID;

describe('API smoke tests', () => {
  it('GraphQL returns the week with its issues', async () => {
    const res = await request(createApp(new InMemoryRepository()))
      .post('/graphql')
      .send({ query: `{ schedule(id: "${id}") { status employees { name } shifts { day slot employee { name } } issues { rule severity } } }` });

    expect(res.status).toBe(200);
    const week = res.body.data.schedule;
    expect(week.employees).toHaveLength(5);
    expect(week.shifts[0].employee.name).toBe('Aoife');
    expect(week.issues).toContainEqual({ rule: 'clopen', severity: 'error' });
  });

  it('REST blocks publishing with errors (409), then allows it after auto-fill', async () => {
    const app = createApp(new InMemoryRepository());

    const blocked = await request(app).post(`/api/schedules/${id}/publish`);
    expect(blocked.status).toBe(409);

    await request(app).post(`/api/schedules/${id}/auto-fill`).expect(200);
    const ok = await request(app).post(`/api/schedules/${id}/publish`);
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('published');
  });

  it('REST rejects a bad request body (400)', async () => {
    await request(createApp(new InMemoryRepository()))
      .put(`/api/schedules/${id}/assignments`)
      .send({ employeeId: 'maria', day: 9, slot: 'NOON' })
      .expect(400);
  });
});
