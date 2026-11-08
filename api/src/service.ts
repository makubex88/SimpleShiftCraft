import { findIssues, hoursFor, laborCostCents, autoFill, type Slot, type Week } from './domain/scheduler';
import type { ShiftRepository } from './db/repository';

export class NotFoundError extends Error {}
export class ConflictError extends Error {
  constructor(message: string, public details?: unknown) { super(message); }
}

/** What both REST and GraphQL return: the stored week plus everything computed from it. */
export type ScheduleView = ReturnType<typeof toView>;

function toView(week: Week) {
  return {
    ...week,
    laborCostCents: laborCostCents(week),
    employees: week.employees.map((e) => ({ ...e, hours: hoursFor(week, e.id) })),
    issues: findIssues(week),
  };
}

/** Use cases. REST and GraphQL both call these, so rules live in one place. */
export function createScheduleService(repo: ShiftRepository) {
  async function load(id: string) {
    const week = await repo.getWeek(id);
    if (!week) throw new NotFoundError(`Schedule ${id} not found`);
    return week;
  }
  async function loadDraft(id: string) {
    const week = await load(id);
    if (week.status !== 'draft') throw new ConflictError('This schedule is already published');
    return week;
  }

  return {
    async view(id: string) {
      return toView(await load(id));
    },

    async setAssignment(id: string, a: { employeeId: string; day: number; slot: Slot | null }) {
      const week = await loadDraft(id);
      if (!week.employees.some((e) => e.id === a.employeeId)) throw new NotFoundError('Employee not found');
      await repo.setShift(id, a);
      return toView(await load(id));
    },

    async autoFill(id: string) {
      const week = await loadDraft(id);
      await repo.replaceShifts(id, autoFill(week).shifts);
      return toView(await load(id));
    },

    async publish(id: string) {
      const week = await loadDraft(id);
      const errors = findIssues(week).filter((i) => i.severity === 'error');
      if (errors.length) throw new ConflictError(`Fix ${errors.length} error(s) before publishing`, errors);
      await repo.publish(id);
      return toView(await load(id));
    },
  };
}

export type ScheduleService = ReturnType<typeof createScheduleService>;
