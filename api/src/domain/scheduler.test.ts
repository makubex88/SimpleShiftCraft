import { describe, it, expect } from 'vitest';
import { autoFill, findIssues, laborCostCents } from './scheduler';
import { seedWeek } from './fixtures';

const rules = (week: ReturnType<typeof seedWeek>) => findIssues(week).map((i) => `${i.severity}:${i.rule}`);

describe('findIssues', () => {
  it('flags a shift on an unavailable day', () => {
    const week = seedWeek({ shifts: [{ emp: 'aoife', day: 'Mon', slot: 'AM' }] });
    expect(findIssues(week)).toContainEqual(expect.objectContaining({
      rule: 'availability', severity: 'error', message: "Aoife isn't available on Mon.",
    }));
  });

  it('flags a clopening shift (close then open, 8h rest)', () => {
    const week = seedWeek({ shifts: [
      { emp: 'liam', day: 'Tue', slot: 'PM' },
      { emp: 'liam', day: 'Wed', slot: 'AM' },
    ] });
    expect(findIssues(week)).toContainEqual(expect.objectContaining({ rule: 'clopen', severity: 'error' }));
  });

  it('allows PM followed by PM (16h rest)', () => {
    const week = seedWeek({ shifts: [
      { emp: 'liam', day: 'Tue', slot: 'PM' },
      { emp: 'liam', day: 'Wed', slot: 'PM' },
    ] });
    expect(rules(week)).not.toContain('error:clopen');
  });

  it('flags going over max weekly hours', () => {
    const week = seedWeek({ shifts: (['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const)
      .map((day) => ({ emp: 'maria', day, slot: 'AM' as const })) });
    expect(findIssues(week)).toContainEqual(expect.objectContaining({
      rule: 'maxHours', message: 'Maria is at 40h this week (max 32h).',
    }));
  });

  it('warns when a slot is under-staffed', () => {
    const week = seedWeek({ shifts: [{ emp: 'sean', day: 'Fri', slot: 'PM' }] });
    expect(findIssues(week)).toContainEqual(expect.objectContaining({
      rule: 'coverage', severity: 'warning', message: 'Fri PM needs 2 people, has 1.',
    }));
  });

  it('warns when labor cost is over budget', () => {
    const week = { ...seedWeek({ shifts: [{ emp: 'liam', day: 'Mon', slot: 'AM' }] }), budgetCents: 10_000 };
    expect(laborCostCents(week)).toBe(8 * 1800);
    expect(rules(week)).toContain('warning:budget');
  });
});

describe('autoFill', () => {
  it('produces a week with no errors and every slot filled', () => {
    const { shifts, issues } = autoFill(seedWeek());
    expect(issues).toEqual([]);
    expect(shifts).toHaveLength(16); // 7 AM + 9 PM
  });

  it('never gives anyone two shifts on the same day', () => {
    const { shifts } = autoFill(seedWeek());
    const keys = shifts.map((s) => `${s.employeeId}-${s.day}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('ignores existing shifts and starts from a clean draft', () => {
    const { issues } = autoFill(seedWeek({ shifts: [{ emp: 'aoife', day: 'Mon', slot: 'AM' }] }));
    expect(issues).toEqual([]);
  });

  it('leaves a slot open (with a warning) when nobody can work it', () => {
    const week = seedWeek();
    week.employees = week.employees.filter((e) => e.id === 'aoife'); // only Aoife, off Mon/Tue
    const { issues } = autoFill(week);
    expect(issues).toContainEqual(expect.objectContaining({ rule: 'coverage', message: 'Mon AM needs 1 person, has 0.' }));
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
  });
});
