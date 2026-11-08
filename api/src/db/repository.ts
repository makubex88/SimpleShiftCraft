import type { Assignment, Week } from '../domain/scheduler';
import { DEMO_SHIFTS, seedWeek } from '../domain/fixtures';

/**
 * The only way the app touches storage. Postgres implements it today;
 * a DynamoDB adapter would implement the same four methods.
 */
export interface ShiftRepository {
  getWeek(scheduleId: string): Promise<Week | null>;
  /** Set one cell of the grid. `slot: null` clears it. Idempotent. */
  setShift(scheduleId: string, a: Omit<Assignment, 'slot'> & { slot: Assignment['slot'] | null }): Promise<void>;
  /** Swap all shifts in one go (used by auto-fill). */
  replaceShifts(scheduleId: string, shifts: Assignment[]): Promise<void>;
  publish(scheduleId: string): Promise<void>;
}

/** In-memory version for tests and for running without a database. */
export class InMemoryRepository implements ShiftRepository {
  private weeks = new Map<string, Week>();
  private nextId = 1;

  constructor(weeks: Week[] = [seedWeek({ shifts: DEMO_SHIFTS })]) {
    for (const w of weeks) this.weeks.set(w.id, structuredClone(w));
  }

  async getWeek(id: string) {
    const week = this.weeks.get(id);
    return week ? structuredClone(week) : null;
  }

  async setShift(id: string, { employeeId, day, slot }: Parameters<ShiftRepository['setShift']>[1]) {
    const week = this.weeks.get(id)!;
    week.shifts = week.shifts.filter((s) => !(s.employeeId === employeeId && s.day === day));
    if (slot) week.shifts.push({ id: `m${this.nextId++}`, employeeId, day, slot });
  }

  async replaceShifts(id: string, shifts: Assignment[]) {
    this.weeks.get(id)!.shifts = shifts.map((s) => ({ ...s, id: `m${this.nextId++}` }));
  }

  async publish(id: string) {
    this.weeks.get(id)!.status = 'published';
  }
}
