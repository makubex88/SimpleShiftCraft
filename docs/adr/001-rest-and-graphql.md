# ADR 001: REST for writes, GraphQL for reads

- **Status:** Accepted
- **Date:** 2026-11-04

## Context

The week screen needs a lot of related data at once: staff, availability, shifts, coverage rules, cost and issues. Changes, on the other hand, are small, separate commands: set a cell, auto-fill, publish.

## Decision

- **Reads use GraphQL.** One `schedule(id)` query returns everything the screen shows, and the client picks the fields. That replaces four or five REST calls.
- **Writes use REST.** The commands are simple and easy to call from other systems:
  - `PUT /api/schedules/:id/assignments` sets one grid cell. It's **idempotent**, so a retried request can't create a second shift.
  - `POST …/auto-fill` and `POST …/publish`. Publishing returns `409 Conflict` with the list of errors when any remain.
- Both layers call the same `ScheduleService`, so the rules exist in one place only.

## Consequences

- Two transport layers to maintain, but each is about 50 lines because they hold no logic.
- Errors map cleanly: validation → 400, not found → 404, rule conflict → 409.
- If the screen later needs live updates, a GraphQL subscription fits naturally.
