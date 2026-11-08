-- SimpleShiftCraft schema. Plain SQL so it is easy to review.
-- Money is integer cents; times are timestamptz (UTC) + the restaurant's timezone.

CREATE TABLE restaurant (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name      text NOT NULL,
  timezone  text NOT NULL DEFAULT 'Europe/Dublin'
);

CREATE TABLE employee (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id      uuid NOT NULL REFERENCES restaurant(id),
  name               text NOT NULL,
  role               text NOT NULL,
  hourly_rate_cents  int  NOT NULL CHECK (hourly_rate_cents > 0),
  max_weekly_hours   int  NOT NULL CHECK (max_weekly_hours BETWEEN 1 AND 60),
  active             bool NOT NULL DEFAULT true
);

-- weekday: 0 = Mon … 6 = Sun
CREATE TABLE availability (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  uuid NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  weekday      smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  available    bool NOT NULL,
  UNIQUE (employee_id, weekday)
);

CREATE TABLE coverage_rule (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id  uuid NOT NULL REFERENCES restaurant(id),
  weekday        smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  slot           text NOT NULL CHECK (slot IN ('AM', 'PM')),
  min_staff      smallint NOT NULL CHECK (min_staff >= 0),
  UNIQUE (restaurant_id, weekday, slot)
);

CREATE TABLE schedule (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id  uuid NOT NULL REFERENCES restaurant(id),
  week_start     date NOT NULL CHECK (extract(isodow FROM week_start) = 1), -- always a Monday
  budget_cents   int  NOT NULL CHECK (budget_cents >= 0),
  status         text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  version        int  NOT NULL DEFAULT 1,
  UNIQUE (restaurant_id, week_start, version)
);

CREATE TABLE shift (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id  uuid NOT NULL REFERENCES schedule(id) ON DELETE CASCADE,
  employee_id  uuid REFERENCES employee(id),  -- NULL = open shift
  slot         text NOT NULL CHECK (slot IN ('AM', 'PM')),
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz NOT NULL,
  CHECK (ends_at > starts_at),
  UNIQUE (employee_id, starts_at)             -- the database also stops double-booking
);

CREATE INDEX shift_schedule_idx ON shift (schedule_id);
