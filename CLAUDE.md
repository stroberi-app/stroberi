# Claude Project Instructions

## Source of Truth

- Follow `AGENTS.md` as the primary project guide.
- If guidance conflicts, prefer explicit user instructions, then this file, then `AGENTS.md`.

## Working Defaults

- Use `yarn` commands only.
- Keep changes small and scoped to the requested task.
- Preserve local-first privacy guarantees (no cloud storage for transaction data).
- Keep TypeScript strict-safe and avoid introducing `any`-heavy code.

## Validation Before Completion

- Run relevant checks for touched areas.
- Baseline checks for code changes:
  - `yarn lint`
  - `yarn check:types`
- For testable logic changes, run related jest tests (or `yarn test --watchAll=false`).

## Database Changes

- Do not change Watermelon schema without corresponding migration updates.
- Keep `database/schema.ts`, `database/migrations.ts`, and affected models aligned.

## Release Safety

- Do not bump `app.json`/`package.json` versions or build numbers unless the task is explicitly about release.
- Use `RELEASE_GUIDE.md` for release-related tasks.
