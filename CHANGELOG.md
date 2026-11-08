# Changelog

Shipped in small, usable steps. Each release was one reviewed pull request.

## v0.4: Auto-fill and budget (2026-11-04)
- One-click **Auto-fill** builds a draft with no errors (greedy, see ADR 002).
- Live labor-cost meter against the weekly budget. Going over budget is a warning, not an error.
- **Publish** is blocked (HTTP 409) while errors remain. A published week can't be edited.

## v0.3: Week grid (2026-11-04)
- React week grid: click a cell to cycle Off → AM → PM.
- Issues panel with plain-English messages. Cells with errors are outlined in red.
- Coverage row shows staffed/needed for every slot.

## v0.2: API (2026-11-04)
- GraphQL `schedule(id)` query for reads, REST commands for writes (ADR 001).
- `ShiftRepository` interface with Postgres and in-memory implementations.
- API smoke tests. CI runs lint, typecheck and tests on every PR.

## v0.1: Rules first (2026-11-04)
- SQL schema and seed data for one restaurant, five staff and one week.
- `findIssues()` with five rules: availability, clopening, max hours, coverage and budget.
- Unit tests for every rule, written before any UI.
