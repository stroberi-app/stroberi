---
name: stroberi-development
description: Use when contributing code, tests, or refactors in the Stroberi Expo React Native app and you need project-specific architecture, data, and validation rules.
---

# Stroberi Development

## Overview

Stroberi is a local-first expense tracker (Expo + React Native + WatermelonDB). Keep privacy guarantees, conversion correctness, and schema safety intact while implementing changes.

## Working Checklist

1. Confirm the change scope and touched modules (`app`, `components`, `features`, `database`, `hooks`, `lib`).
2. Reuse existing patterns (Tamagui components, sheet flows, hook-driven state) before introducing new abstractions.
3. Keep business logic in `features/`, `database/actions/`, or `lib/` instead of large screen/components blocks.
4. For schema-impacting work, update `database/schema.ts`, `database/migrations.ts`, and affected models together.
5. Run validation before completion:
   - `yarn lint`
   - `yarn check:types`
   - Related tests for touched logic (`yarn test --watchAll=false` if needed)

## Core Rules

- Use `yarn` for package/script operations.
- Preserve local-only data behavior for transactions.
- Keep feature-flag compatibility for:
  - `budgeting_enabled`
  - `trips_enabled`
  - `advanced_analytics_enabled`
- Keep currency conversion and `allowMissingRate` behavior stable when editing create/update/import flows.

## When Not to Use

- Pure release/version bump tasks: use `stroberi-release`.
- Non-code documentation-only tasks that do not affect workflow behavior.
