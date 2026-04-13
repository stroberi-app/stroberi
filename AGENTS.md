# Repository Guidelines

## Project Snapshot

- Stroberi is a privacy-first personal expense tracker built with Expo + React Native.
- Financial data is local-only (SQLite/WatermelonDB). Avoid changes that introduce cloud persistence for user transaction data.
- Main runtime stack: Expo Router, React Native 0.76, TypeScript strict mode, Tamagui.

## Project Structure

- `app/`: Expo Router screens and navigation.
- `app/(tabs)/`: Tab screens (`index`, `transactions`, `analytics`, `budgets`, `trips`, `settings`).
- `components/`: Reusable UI and sheets.
- `features/`: Feature-focused modules (`import`, `transactions`).
- `database/`: WatermelonDB schema, migrations, models, and DB actions.
- `hooks/`: Shared hooks for feature flags, analytics, export, recurring tasks.
- `lib/`: Pure utilities (analytics, forecasting, budget logic, formatting, conversion helpers).
- `data/`: Static datasets (currencies, default categories, emojis).

## Setup and Commands

- Install dependencies: `yarn install`
- Start dev server: `yarn start`
- Run iOS app: `yarn ios`
- Run Android app: `yarn android`
- Lint: `yarn lint`
- Format: `yarn format`
- Type-check: `yarn check:types`
- Jest (watch mode): `yarn test`
- Jest (single run): `yarn test --watchAll=false`

## Engineering Rules

- Use `yarn` for all package and script operations.
- Keep TypeScript strict-safe; avoid `any` unless there is no practical alternative.
- Prefer focused feature-level changes over broad cross-cutting rewrites.
- Keep business logic in `features/`, `database/actions/`, or `lib/`; avoid putting it directly in presentation components.
- Reuse existing components and hooks before adding new abstractions.
- Preserve current UX patterns (bottom sheets, tamagui primitives, existing spacing and naming conventions).

## Database and Persistence

- Any schema change must keep these in sync:
  - `database/schema.ts` version and table definition
  - `database/migrations.ts` migration path
  - affected Watermelon model files in `database/*-model.ts`
- Keep indexed queries aligned with `schema.ts` indexes when changing transaction/category filtering paths.
- Do not bypass database action helpers for write operations; keep write logic centralized in `database/actions/`.

## Currency and Transaction Behavior

- Transactions support mixed currencies and base-currency normalization.
- When changing create/update/import flows, preserve conversion handling and `allowMissingRate` behavior.
- Expense/income amount semantics must remain consistent across:
  - create transaction route params
  - import parsing/validation
  - analytics aggregation utilities

## Feature Flags and Pro Features

- Feature toggles use local storage keys in `lib/storageKeys.ts`.
- Preserve backward compatibility of existing keys:
  - `budgeting_enabled`
  - `trips_enabled`
  - `advanced_analytics_enabled`
- Gated features should degrade gracefully when disabled.

## Quality Gate Before Merge

- Run at least:
  - `yarn lint`
  - `yarn check:types`
- For logic-heavy changes, add or update tests near the touched module (for example `lib/*.test.ts`, `features/import/*.test.ts`, `database/*.test.ts`).
- Do not ship failing tests or type errors.

## Release Notes

- Release workflow details are in `RELEASE_GUIDE.md`.
- Do not bump versions/build numbers unless the task is explicitly release-related.
