import { useCallback, useEffect, useState } from 'react';
import { autoFill, fetchWeek, publish, setAssignment, type Issue, type Slot, type Week } from './api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const NEXT: Record<string, Slot | null> = { off: 'AM', AM: 'PM', PM: null };
const euro = (cents: number) => `€${Math.round(cents / 100).toLocaleString('en-IE')}`;

/** Does this issue point at this person on this day? (Clopening also marks the next morning.) */
const hits = (i: Issue, empId: string, day: number) =>
  i.severity === 'error' && i.employeeId === empId &&
  (i.day === null || i.day === day || (i.rule === 'clopen' && i.day + 1 === day));

export function App() {
  const [week, setWeek] = useState<Week | null>(null);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const flash = (text: string, bad = false) => {
    setToast({ text, bad });
    setTimeout(() => setToast(null), 2500);
  };

  /** Run a command, then re-read the week so the screen always shows server truth. */
  const run = useCallback(async (action: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    try {
      await action();
      setWeek(await fetchWeek());
      if (success) flash(success);
    } catch (e) {
      flash((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { fetchWeek().then(setWeek, (e) => flash(e.message, true)); }, []);

  if (!week) return <main className="loading">Loading week…{toast && <p className="err">{toast.text}</p>}</main>;

  const published = week.status === 'published';
  const errors = week.issues.filter((i) => i.severity === 'error');
  const warnings = week.issues.length - errors.length;
  const pct = (week.laborCostCents / week.budgetCents) * 100;
  const slotOf = (empId: string, day: number) =>
    week.shifts.find((s) => s.employee.id === empId && s.day === day)?.slot ?? null;
  const staffed = (day: number, slot: Slot) => week.shifts.filter((s) => s.day === day && s.slot === slot).length;
  const need = (day: number, slot: Slot) => week.coverage.find((c) => c.day === day && c.slot === slot)?.minStaff ?? 0;

  return (
    <main className="app">
      <header className="bar">
        <div>
          <h1>The Copper Pot</h1>
          <span className="muted">Week of {new Date(week.weekStart).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <span className={`badge ${published ? 'ok' : ''}`}>{published ? 'Published' : 'Draft'}</span>
        </div>
        <div className="btns">
          <button disabled={busy || published} onClick={() => run(autoFill, 'Draft built by auto-fill')}>✨ Auto-fill</button>
          <button className="primary" disabled={busy || published || errors.length > 0}
            title={errors.length ? 'Fix errors before publishing' : ''}
            onClick={() => run(publish, `Published · ${week.employees.length} staff notified`)}>Publish</button>
        </div>
      </header>

      <div className="body">
        <section className="board">
          <table className="grid">
            <thead>
              <tr><th />{DAYS.map((d) => <th key={d}>{d}</th>)}<th>Hours</th><th>Cost</th></tr>
            </thead>
            <tbody>
              {week.employees.map((e) => (
                <tr key={e.id}>
                  <td className="name"><b>{e.name}</b><span>{e.role} · {euro(e.hourlyRateCents)}/h</span></td>
                  {DAYS.map((d, day) => {
                    const slot = slotOf(e.id, day);
                    const off = e.offDays.includes(day);
                    const bad = week.issues.some((i) => hits(i, e.id, day) && (slot || i.rule !== 'maxHours'));
                    return (
                      <td key={d}>
                        <button
                          className={`cell ${slot ?? ''} ${off ? 'off' : ''} ${bad && slot ? 'bad' : ''}`}
                          disabled={busy || published}
                          aria-label={`${e.name} ${d}: ${slot ?? 'off'}`}
                          onClick={() => run(() => setAssignment(e.id, day, NEXT[slot ?? 'off'] ?? null))}
                        >{slot ?? (off ? 'n/a' : '+')}</button>
                      </td>
                    );
                  })}
                  <td className={`num ${e.hours > e.maxHours ? 'over' : ''}`}>{e.hours}/{e.maxHours}</td>
                  <td className="num">{euro(e.hours * e.hourlyRateCents)}</td>
                </tr>
              ))}
              <tr>
                <td className="name"><span>Coverage</span></td>
                {DAYS.map((d, day) => (
                  <td key={d} className="cov">
                    {(['AM', 'PM'] as Slot[]).map((s) => (
                      <div key={s} className={staffed(day, s) >= need(day, s) ? 'ok' : 'no'}>{s} {staffed(day, s)}/{need(day, s)}</div>
                    ))}
                  </td>
                ))}
                <td /><td />
              </tr>
            </tbody>
          </table>
          <p className="legend">
            <span><i className="AM" />AM 07:00–15:00</span><span><i className="PM" />PM 15:00–23:00</span>
            <span><i className="off" />Unavailable</span><span className="hint">Click a cell: Off → AM → PM</span>
          </p>
        </section>

        <aside className="side">
          <div className="stat"><span>Labor cost</span><b>{euro(week.laborCostCents)}</b></div>
          <div className={`meter ${pct > 100 ? 'over' : pct > 90 ? 'warn' : ''}`}><i style={{ width: `${Math.min(pct, 100)}%` }} /></div>
          <div className="stat"><span>Budget</span><b>{euro(week.budgetCents)}</b></div>
          <h2>Issues <small>{errors.length} errors · {warnings} warnings</small></h2>
          <ul className="issues">
            {week.issues.length === 0 && <li className="none">✅ No issues. Ready to publish.</li>}
            {[...errors, ...week.issues.filter((i) => i.severity === 'warning')].map((i, n) => (
              <li key={n} className={i.severity}>{i.severity === 'error' ? '⛔' : '⚠️'} {i.message}</li>
            ))}
          </ul>
        </aside>
      </div>

      {toast && <div className={`toast ${toast.bad ? 'bad' : ''}`} role="status">{toast.text}</div>}
    </main>
  );
}
