import { Router } from 'express';
import { z } from 'zod';
import type { ScheduleService } from './service';

const AssignmentBody = z.object({
  employeeId: z.string().min(1),
  day: z.number().int().min(0).max(6),
  slot: z.enum(['AM', 'PM']).nullable(),
});

/** REST is used for commands (writes). Errors are mapped to status codes in app.ts. */
export function restRouter(service: ScheduleService) {
  const r = Router();

  r.get('/schedules/:id', async (req, res) => {
    res.json(await service.view(req.params.id));
  });

  // Idempotent "set this cell": sending the same body twice gives the same result.
  r.put('/schedules/:id/assignments', async (req, res) => {
    res.json(await service.setAssignment(req.params.id, AssignmentBody.parse(req.body)));
  });

  r.post('/schedules/:id/auto-fill', async (req, res) => {
    res.json(await service.autoFill(req.params.id));
  });

  r.post('/schedules/:id/publish', async (req, res) => {
    res.json(await service.publish(req.params.id));
  });

  return r;
}
