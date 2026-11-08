import type pg from 'pg';
import { SLOT_TIMES, type Assignment, type Week } from '../domain/scheduler';
import type { ShiftRepository } from './repository';

/**
 * Postgres implementation. Shifts are stored as real timestamps in the
 * restaurant's timezone; the domain only sees (day, slot).
 */
export class PgRepository implements ShiftRepository {
  constructor(private pool: pg.Pool) {}

  async getWeek(id: string): Promise<Week | null> {
    const { rows: [s] } = await this.pool.query(
      `SELECT s.id, s.week_start::text, s.budget_cents, s.status, s.restaurant_id
         FROM schedule s WHERE s.id = $1`, [id]);
    if (!s) return null;

    const [employees, coverage, shifts] = await Promise.all([
      this.pool.query(
        `SELECT e.id, e.name, e.role, e.hourly_rate_cents, e.max_weekly_hours,
                COALESCE(array_agg(a.weekday) FILTER (WHERE a.available = false), '{}') AS off_days
           FROM employee e LEFT JOIN availability a ON a.employee_id = e.id
          WHERE e.restaurant_id = $1 AND e.active
          GROUP BY e.id ORDER BY e.name`, [s.restaurant_id]),
      this.pool.query(
        `SELECT weekday, slot, min_staff FROM coverage_rule WHERE restaurant_id = $1`, [s.restaurant_id]),
      this.pool.query(
        `SELECT sh.id, sh.employee_id, sh.slot,
                (sh.starts_at AT TIME ZONE r.timezone)::date - s.week_start AS day
           FROM shift sh
           JOIN schedule s ON s.id = sh.schedule_id
           JOIN restaurant r ON r.id = s.restaurant_id
          WHERE sh.schedule_id = $1 AND sh.employee_id IS NOT NULL`, [id]),
    ]);

    return {
      id: s.id,
      weekStart: s.week_start,
      status: s.status,
      budgetCents: s.budget_cents,
      employees: employees.rows.map((e) => ({
        id: e.id, name: e.name, role: e.role,
        hourlyRateCents: e.hourly_rate_cents, maxHours: e.max_weekly_hours, offDays: e.off_days,
      })),
      coverage: coverage.rows.map((c) => ({ day: c.weekday, slot: c.slot, minStaff: c.min_staff })),
      shifts: shifts.rows.map((r) => ({ id: r.id, employeeId: r.employee_id, day: r.day, slot: r.slot })),
    };
  }

  async setShift(id: string, a: Parameters<ShiftRepository['setShift']>[1]) {
    await this.tx(async (c) => {
      await c.query(
        `DELETE FROM shift sh USING schedule s, restaurant r
          WHERE sh.schedule_id = s.id AND r.id = s.restaurant_id
            AND s.id = $1 AND sh.employee_id = $2
            AND (sh.starts_at AT TIME ZONE r.timezone)::date = s.week_start + $3::int`,
        [id, a.employeeId, a.day]);
      if (a.slot) await insertShift(c, id, { ...a, slot: a.slot });
    });
  }

  async replaceShifts(id: string, shifts: Assignment[]) {
    await this.tx(async (c) => {
      await c.query(`DELETE FROM shift WHERE schedule_id = $1`, [id]);
      for (const s of shifts) await insertShift(c, id, s);
    });
  }

  async publish(id: string) {
    await this.pool.query(`UPDATE schedule SET status = 'published' WHERE id = $1`, [id]);
  }

  private async tx(fn: (c: pg.PoolClient) => Promise<void>) {
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      await fn(c);
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK');
      throw err;
    } finally {
      c.release();
    }
  }
}

function insertShift(c: pg.PoolClient, scheduleId: string, { employeeId, day, slot }: Assignment) {
  const { start, end } = SLOT_TIMES[slot];
  return c.query(
    `INSERT INTO shift (schedule_id, employee_id, slot, starts_at, ends_at)
     SELECT s.id, $2, $4,
            ((s.week_start + $3::int) + make_interval(hours => $5)) AT TIME ZONE r.timezone,
            ((s.week_start + $3::int) + make_interval(hours => $6)) AT TIME ZONE r.timezone
       FROM schedule s JOIN restaurant r ON r.id = s.restaurant_id
      WHERE s.id = $1`,
    [scheduleId, employeeId, day, slot, start, end]);
}
