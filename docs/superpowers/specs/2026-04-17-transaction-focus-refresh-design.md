# Transaction Data Refresh on App Focus

**Date:** 2026-04-17  
**Feature:** Automatically refresh transactions data when the app regains focus

## Overview

When a user closes the app and returns, navigates between tabs, or switches away to another app and returns, the transactions data should silently re-query from the local WatermelonDB database. This ensures the data is fresh without any visible loading indicators or disruption to the UI.

## Requirements

- **Scope:** Refresh transactions data on all screens
- **Trigger:** App transitions from background to foreground
- **User Experience:** Silent background refresh with no loading indicators
- **State Preservation:** Filter selections and scroll positions remain intact
- **Data Source:** Local WatermelonDB database (no remote API calls)

## Architecture

### High-Level Flow

```
App goes to foreground
  ↓
AppState listener triggers
  ↓
useAppFocusRefresh hook queries transactions DB
  ↓
WatermelonDB observable emits fresh data
  ↓
All subscribed screens (via withObservables) automatically re-render
```

### Components

#### 1. Custom Hook: `useAppFocusRefresh`

**Location:** `hooks/useAppFocusRefresh.ts`

**Purpose:** Listen to app state changes and trigger a transactions data refresh when the app comes to foreground.

**Implementation:**
- Use React Native's `AppState` API to listen for app state changes
- Track the previous app state to avoid duplicate refreshes when multiple state transitions occur
- On transition to `'active'` state, trigger a database query to force fresh data
- Clean up the event listener on unmount

**Signature:**
```typescript
export function useAppFocusRefresh(database: Database): void
```

**Behavior:**
- Called once at app startup in the root layout
- Attaches a listener that runs on every app state change
- Only triggers the refresh when the app transitions to the foreground (`'active'` state)
- Does not disrupt current UI state (filters, scroll position remain unchanged)

#### 2. Refresh Mechanism

When the app gains focus:
1. Access the transactions table from the database
2. Call `.query().fetch()` to force a fresh read from the local database
3. The WatermelonDB observable that screens subscribe to will automatically emit the updated data
4. No explicit cache invalidation is needed—WatermelonDB handles reactivity

#### 3. Integration Point

**Location:** `app/_layout.tsx` (RootLayout component)

Call `useAppFocusRefresh(database)` in the root layout to ensure it's active for the entire app lifecycle.

## Data Flow Details

### Current Architecture (No Changes)

The transactions data flows through WatermelonDB's reactive system:
1. `TransactionsList` component wraps with `withObservables` HOC
2. HOC subscribes to the transactions observable from `buildTransactionsBaseQuery()`
3. When data changes in the database, the observable emits, and `TransactionsList` re-renders

### With Focus Refresh

The flow remains the same, but we add a trigger:
1. App regains focus
2. `useAppFocusRefresh` forces a database query
3. Observable re-fires with fresh data
4. `TransactionsList` and all other subscribed screens re-render automatically

### State Preservation

- **Filters:** Stored in React state on each screen (`dateFilter`, `selectedCategories`, `transactionType`)—not affected by database refresh
- **Scroll Position:** Managed by the list component's `scrollRef`—not affected by observable updates
- **Query State:** The WatermelonDB query will return the same filtered results (filters are applied client-side after the query)

## Implementation Strategy

1. Create `hooks/useAppFocusRefresh.ts` with the AppState listener logic
2. Import and call the hook in `app/_layout.tsx` at the root level
3. Pass the database instance (already available via `useDatabase()`) to the hook
4. Test on both iOS and Android to ensure AppState handling works correctly

## Edge Cases & Considerations

- **App Not Running:** If the app is completely killed and reopened, WatermelonDB will load the latest data from its local storage automatically—no special handling needed
- **Tab Switching (iOS):** On iOS, switching between tabs doesn't trigger an `AppState` change; the app stays active. This is expected behavior
- **Multiple Rapid Focus Events:** The hook should use a flag to debounce or track the last refresh to avoid querying multiple times in quick succession if AppState fires multiple events
- **Database Availability:** Assumes the database is initialized and available when the hook runs (it will be, since it's in the root layout)

## Testing

- Verify that closing the app and reopening refreshes transactions data
- Verify that navigating to another app and returning refreshes data
- Verify that no loading indicators appear during refresh
- Verify that filter selections and scroll positions are preserved
- Test on both iOS and Android

## Future Considerations

- If remote sync is added later, this hook could be extended to also trigger a server sync
- Could add a debounce timer to prevent excessive queries if needed
