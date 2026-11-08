import { DAYS, type CoverageRule, type Employee, type Slot, type Week } from './scheduler';

/** The same restaurant as migrations/002_seed.sql, kept in memory for tests and DB-less dev. */
export const SEED_SCHEDULE_ID = '00000000-0000-4000-8000-000000000042';

const employees: Employee[] = [
  { id: 'maria', name: 'Maria', role: 'Server',    hourlyRateCents: 1500, maxHours: 32, offDays: [6] },
  { id: 'liam',  name: 'Liam',  role: 'Cook',      hourlyRateCents: 1800, maxHours: 40, offDays: [] },
  { id: 'aoife', name: 'Aoife', role: 'Host',      hourlyRateCents: 1400, maxHours: 24, offDays: [0, 1] },
  { id: 'sean',  name: 'Sean',  role: 'Bartender', hourlyRateCents: 1600, maxHours: 40, offDays: [] },
  { id: 'priya', name: 'Priya', role: 'Cook',      hourlyRateCents: 1800, maxHours: 30, offDays: [] },
];

// One person per slot; two for Fri and Sat dinner.
const coverage: CoverageRule[] = DAYS.flatMap((_, day) => [
  { day, slot: 'AM' as Slot, minStaff: 1 },
  { day, slot: 'PM' as Slot, minStaff: day === 4 || day === 5 ? 2 : 1 },
]);

type ShorthandShift = { emp: string; day: (typeof DAYS)[number]; slot: Slot };

/** A demo week with three deliberate problems, used on first run. */
export const DEMO_SHIFTS: ShorthandShift[] = [
  { emp: 'aoife', day: 'Mon', slot: 'AM' }, // unavailable day
  { emp: 'liam', day: 'Tue', slot: 'PM' },  // closes…
  { emp: 'liam', day: 'Wed', slot: 'AM' },  // …then opens: clopening
];

export function seedWeek(opts: { shifts?: ShorthandShift[] } = {}): Week {
  return {
    id: SEED_SCHEDULE_ID,
    weekStart: '2026-11-02',
    status: 'draft',
    budgetCents: 215_000,
    employees: structuredClone(employees),
    coverage: structuredClone(coverage),
    shifts: (opts.shifts ?? []).map((s, i) => ({
      id: `s${i + 1}`,
      employeeId: s.emp,
      day: DAYS.indexOf(s.day),
      slot: s.slot,
    })),
  };
}
