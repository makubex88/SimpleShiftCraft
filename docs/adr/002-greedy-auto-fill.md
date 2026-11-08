# ADR 002: Greedy auto-fill instead of a solver

- **Status:** Accepted
- **Date:** 2026-11-04

## Context

Managers want a good draft schedule in one click. A constraint solver (OR-Tools or an ILP) could find an "optimal" plan, but managers need to **trust and adjust** the draft, not just accept it.

## Decision

Use a simple greedy pass in `autoFill()`:

1. Walk the slots Monday → Sunday, AM before PM.
2. Remove anyone who is unavailable, already working that day, would go over max hours, or would be clopening.
3. Give the slot to whoever has the fewest hours so far (tie: lowest hourly rate).
4. If nobody is left, leave the slot open and raise a coverage warning instead of breaking a rule.

## Consequences

- **Explainable:** every choice can be described in one sentence.
- **Fast:** O(slots × staff), instant for a restaurant-sized team.
- **Safe by default:** it never creates an error-level issue. It prefers an open slot over harming staff.
- Not cost-optimal. The function signature `autoFill(plan) → { shifts, issues }` lets a solver replace it later without touching the API or UI.
