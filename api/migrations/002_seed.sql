-- Demo data: mirrors src/domain/fixtures.ts so the app looks real on first run.

INSERT INTO restaurant (id, name, timezone) VALUES
  ('00000000-0000-4000-8000-000000000001', 'The Copper Pot', 'Europe/Dublin');

INSERT INTO employee (id, restaurant_id, name, role, hourly_rate_cents, max_weekly_hours) VALUES
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 'Maria', 'Server',    1500, 32),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000001', 'Liam',  'Cook',      1800, 40),
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-000000000001', 'Aoife', 'Host',      1400, 24),
  ('00000000-0000-4000-8000-0000000000a4', '00000000-0000-4000-8000-000000000001', 'Sean',  'Bartender', 1600, 40),
  ('00000000-0000-4000-8000-0000000000a5', '00000000-0000-4000-8000-000000000001', 'Priya', 'Cook',      1800, 30);

-- Unavailable days: Maria Sun, Aoife Mon + Tue
INSERT INTO availability (employee_id, weekday, available) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 6, false),
  ('00000000-0000-4000-8000-0000000000a3', 0, false),
  ('00000000-0000-4000-8000-0000000000a3', 1, false);

-- One person per slot; two for Fri and Sat dinner
INSERT INTO coverage_rule (restaurant_id, weekday, slot, min_staff)
SELECT '00000000-0000-4000-8000-000000000001', d, s, CASE WHEN s = 'PM' AND d IN (4, 5) THEN 2 ELSE 1 END
FROM generate_series(0, 6) AS d, unnest(ARRAY['AM', 'PM']) AS s;

INSERT INTO schedule (id, restaurant_id, week_start, budget_cents) VALUES
  ('00000000-0000-4000-8000-000000000042', '00000000-0000-4000-8000-000000000001', '2026-11-02', 215000);

-- Three deliberate problems so the issues panel has something to show
INSERT INTO shift (schedule_id, employee_id, slot, starts_at, ends_at) VALUES
  ('00000000-0000-4000-8000-000000000042', '00000000-0000-4000-8000-0000000000a3', 'AM',
     '2026-11-02 07:00 Europe/Dublin', '2026-11-02 15:00 Europe/Dublin'),  -- Aoife on her day off
  ('00000000-0000-4000-8000-000000000042', '00000000-0000-4000-8000-0000000000a2', 'PM',
     '2026-11-03 15:00 Europe/Dublin', '2026-11-03 23:00 Europe/Dublin'),  -- Liam closes Tue…
  ('00000000-0000-4000-8000-000000000042', '00000000-0000-4000-8000-0000000000a2', 'AM',
     '2026-11-04 07:00 Europe/Dublin', '2026-11-04 15:00 Europe/Dublin');  -- …and opens Wed
