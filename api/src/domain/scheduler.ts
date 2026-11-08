/**
 * Scheduling rules. Pure functions only: no I/O, no framework.
 * Everything here is unit-tested in scheduler.test.ts.
 */

export type Slot = 'AM' | 'PM';
export type Severity = 'error' | 'warning';
export type Rule = 'availability' | 'clopen' | 'maxHours' | 'coverage' | 'budget';

export interface Employee {
  id: string;
  name: string;
  role: string;
  hourlyRateCents: number;
  maxHours: number;
  offDays: number[]; // 0 = Mon … 6 = Sun
}

/** One person on one slot of one day. */
export interface Assignment {
  employeeId: string;
  day: number;
  slot: Slot;
}
export interface Shift extends Assignment {
  id: string;
}

export interface CoverageRule {
  day: number;
  slot: Slot;
  minStaff: number;
}

export interface Plan {
  budgetCents: number;
  employees: Employee[];
  coverage: CoverageRule[];
  shifts: Assignment[];
}

export interface Week extends Plan {
  id: string;
  weekStart: string; // ISO date of the Monday
  status: 'draft' | 'published';
  shifts: Shift[];
}

export interface Issue {
  rule: Rule;
  severity: Severity;
  message: string;
  employeeId?: string;
  day?: number;
}

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const SLOT_TIMES: Record<Slot, { start: number; end: number }> = {
  AM: { start: 7, end: 15 },
  PM: { start: 15, end: 23 },
};
export const MIN_REST_HOURS = 10;

const slotHours = (slot: Slot) => SLOT_TIMES[slot].end - SLOT_TIMES[slot].start;
const restBetween = (today: Slot, tomorrow: Slot) =>
  24 - SLOT_TIMES[today].end + SLOT_TIMES[tomorrow].start;
const euro = (cents: number) => `€${Math.round(cents / 100).toLocaleString('en-IE')}`;
const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;

export function hoursFor(plan: Plan, employeeId: string): number {
  return plan.shifts
    .filter((s) => s.employeeId === employeeId)
    .reduce((sum, s) => sum + slotHours(s.slot), 0);
}

export function laborCostCents(plan: Plan): number {
  return plan.employees.reduce((sum, e) => sum + hoursFor(plan, e.id) * e.hourlyRateCents, 0);
}

/** Every problem in the plan, written for a human. Errors block publishing; warnings don't. */
export function findIssues(plan: Plan): Issue[] {
  const issues: Issue[] = [];

  for (const e of plan.employees) {
    const byDay = new Map(plan.shifts.filter((s) => s.employeeId === e.id).map((s) => [s.day, s.slot]));

    for (const [day, slot] of byDay) {
      if (e.offDays.includes(day)) {
        issues.push({ rule: 'availability', severity: 'error', employeeId: e.id, day,
          message: `${e.name} isn't available on ${DAYS[day]}.` });
      }
      const tomorrow = byDay.get(day + 1);
      if (tomorrow && restBetween(slot, tomorrow) < MIN_REST_HOURS) {
        issues.push({ rule: 'clopen', severity: 'error', employeeId: e.id, day,
          message: `${e.name} closes ${DAYS[day]} ${pad(SLOT_TIMES[slot].end)} and opens ${DAYS[day + 1]} ` +
            `${pad(SLOT_TIMES[tomorrow].start)}, which is only ${restBetween(slot, tomorrow)}h rest (min ${MIN_REST_HOURS}h).` });
      }
    }

    const hours = hoursFor(plan, e.id);
    if (hours > e.maxHours) {
      issues.push({ rule: 'maxHours', severity: 'error', employeeId: e.id,
        message: `${e.name} is at ${hours}h this week (max ${e.maxHours}h).` });
    }
  }

  for (const c of plan.coverage) {
    const have = plan.shifts.filter((s) => s.day === c.day && s.slot === c.slot).length;
    if (have < c.minStaff) {
      issues.push({ rule: 'coverage', severity: 'warning', day: c.day,
        message: `${DAYS[c.day]} ${c.slot} needs ${c.minStaff} ${c.minStaff > 1 ? 'people' : 'person'}, has ${have}.` });
    }
  }

  const cost = laborCostCents(plan);
  if (cost > plan.budgetCents) {
    issues.push({ rule: 'budget', severity: 'warning',
      message: `Labor is ${euro(cost)}, which is ${euro(cost - plan.budgetCents)} over budget.` });
  }

  return issues;
}

/**
 * Greedy auto-fill (see the flowchart in the design docs).
 * Walks slots Mon→Sun, AM before PM, and gives each one to the eligible
 * person with the fewest hours so far (tie: lowest rate). Predictable and easy
 * to explain; a solver could replace it behind the same signature.
 */
export function autoFill(plan: Plan): { shifts: Assignment[]; issues: Issue[] } {
  const draft: Plan = { ...plan, shifts: [] };
  const slots = [...plan.coverage].sort((a, b) => a.day - b.day || a.slot.localeCompare(b.slot));

  for (const { day, slot, minStaff } of slots) {
    for (let n = 0; n < minStaff; n++) {
      const working = (id: string, d: number) => draft.shifts.find((s) => s.employeeId === id && s.day === d);
      const pick = draft.employees
        .filter((e) => {
          const yesterday = working(e.id, day - 1);
          return !e.offDays.includes(day) &&
            !working(e.id, day) &&
            hoursFor(draft, e.id) + slotHours(slot) <= e.maxHours &&
            !(yesterday && restBetween(yesterday.slot, slot) < MIN_REST_HOURS);
        })
        .sort((a, b) => hoursFor(draft, a.id) - hoursFor(draft, b.id) || a.hourlyRateCents - b.hourlyRateCents)[0];
      if (pick) draft.shifts.push({ employeeId: pick.id, day, slot });
    }
  }

  return { shifts: draft.shifts, issues: findIssues(draft) };
}
