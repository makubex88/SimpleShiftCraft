# Contributing

## Workflow

1. Open or pick an issue. Unclear problems start as a short discussion, not code.
2. Branch from `main` (`feat/…`, `fix/…`).
3. Keep PRs small, reviewable in about 15 minutes. Split big changes into steps that each ship something usable.
4. Run `npm run lint && npm run typecheck && npm test` before pushing. CI runs the same.

## Where code goes

- **A new scheduling rule** goes in `api/src/domain/scheduler.ts`, plus a test in `scheduler.test.ts`. Keep it a pure function, with no database or HTTP.
- **A new use case** goes in `api/src/service.ts`. REST and GraphQL should only parse input and call the service.
- **A schema change** is a new numbered file in `api/migrations/`. Never edit an old migration.

## Code review

What we look for, in order:

1. **Correct:** does it do what the issue asks? Is there a test that would fail without it?
2. **Clear:** could a new teammate follow it? Names over comments, comments for *why*.
3. **User-facing text:** messages name the person, day and time ("Liam closes Tue 23:00…"), not error codes.
4. **Small:** anything that can be a follow-up PR should be.

Review comments are suggestions unless marked **blocking**. Ask questions ("what happens if…?") rather than give orders, and pair up when a thread passes three replies.
