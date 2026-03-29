# RevenueCat Implementation (Removed)

This document describes the RevenueCat monetization implementation that was previously part of this project. It is kept as reference for potential future re-implementation.

## Packages Used

- `react-native-purchases` v9.6.9
- `react-native-purchases-ui` v9.6.9

## Architecture Overview

The implementation used a **two-layer gating system**:

1. **Layer 1 — RevenueCat entitlement check** (`hasPro`): Verified if the user had an active "Stroberi Pro" subscription via RevenueCat.
2. **Layer 2 — Per-feature toggle** (WatermelonDB `localStorage`): Each pro feature (Budgeting, Trips, Advanced Analytics) had an independent boolean toggle that users could enable/disable.

A global kill switch `PAYWALL_ENABLED` (set to `false`) bypassed Layer 1 entirely, making all features free.

## Configuration (`lib/revenuecat.ts`)

```typescript
PAYWALL_ENABLED = false; // Kill switch — when false, all pro features are free

// API Keys
// iOS Production: 'appl_fbvsRPQfxEsOcPxpzJiKKSSiMRI'
// Test/Android:   'test_ieuCBpObewjgluTnXzljsGPGFoA'

// Entitlement IDs
// Production: 'Stoberi Pro Prod'
// Development: 'Stroberi Pro'

// Offering: 'default'
// Packages: 'Monthly', 'Yearly' (prod) / 'monthly', 'yearly' (dev)
```

## Core Hook (`hooks/useRevenueCat.ts`)

### `useRevenueCat()`

Main hook returning:

| Property | Type | Description |
|----------|------|-------------|
| `hasPro` | `boolean` | Whether user has active pro entitlement (always `true` when paywall disabled) |
| `customerInfo` | `CustomerInfo \| null` | RevenueCat customer info |
| `offerings` | `PurchasesOfferings \| null` | Available offerings/packages |
| `isLoading` | `boolean` | Initial loading state |
| `isPaywallLoading` | `boolean` | Paywall presentation loading |
| `isRestoring` | `boolean` | Restore purchases loading |
| `error` | `string \| null` | Error message |
| `presentPaywall` | `() => Promise` | Shows native RevenueCat paywall |
| `purchasePackage` | `(id) => Promise` | Purchases a specific package |
| `restorePurchases` | `() => Promise` | Restores previous purchases |
| `openCustomerCenter` | `() => Promise` | Opens RevenueCat customer center |
| `refreshOfferings` | `() => Promise` | Refreshes available offerings |

### `useRevenueCatBootstrap()`

Called once in `app/_layout.tsx` at app startup. Configured the SDK via a singleton promise pattern:

```typescript
Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
Purchases.configure({ apiKey: REVENUECAT_API_KEY });
```

## Feature Flags

Each gated feature had its own hook wrapping `useFeatureFlag`:

| Hook | Storage Key | Feature |
|------|-------------|---------|
| `useBudgetingEnabled` | `budgeting_enabled` | Budgets tab and budget features |
| `useTripsEnabled` | `trips_enabled` | Trips tab and trip tracking |
| `useAdvancedAnalyticsEnabled` | `advanced_analytics_enabled` | Analytics tab with deep insights |

These hooks still exist and are **not RevenueCat-dependent** — they simply read/write boolean flags to WatermelonDB localStorage.

## Settings Screen Integration (`app/(tabs)/settings.tsx`)

The settings screen had a "Stroberi Pro" section that:

- Showed subscription status (active/locked) with Crown icons
- Displayed "Upgrade / View Plans" button for non-pro users
- Feature toggles (Budgeting, Trips, Advanced Analytics) gated behind `hasPro`
  - If `!hasPro`, toggling would trigger the paywall instead
  - If `hasPro`, toggles worked normally
- "Manage Subscription" and "Restore Purchases" links for pro users
- Locked/disabled feature toggle previews for non-pro users (grayed out with Crown icons)

## Tab Visibility (`app/(tabs)/_layout.tsx`)

Tabs were conditionally shown/hidden based on feature flag state:

```typescript
// Analytics tab
href: advancedAnalyticsEnabled ? '/(tabs)/analytics' : null

// Trips tab
href: tripsEnabled ? '/(tabs)/trips' : null

// Budgets tab
href: budgetingEnabled ? '/(tabs)/budgets' : null
```

This logic remains unchanged — it depends on feature flags, not RevenueCat directly.

## Other Consumers

| File | Usage |
|------|-------|
| `components/home/ActiveTripCard.tsx` | `useTripsEnabled` — hides card if trips disabled |
| `components/home/BudgetAlertCard.tsx` | `useBudgetingEnabled` — hides card if budgeting disabled |
| `app/create-transaction.tsx` | `useTripsEnabled` — hides trip selector if trips disabled |

These components use feature flag hooks only (not RevenueCat directly) and remain unchanged.

## Paywall Flow

1. User attempts to toggle a pro feature while `!hasPro`
2. `handlePaywall()` is called
3. `RevenueCatUI.presentPaywallIfNeeded()` shows the native paywall
4. On purchase/restore, `customerInfo` is refreshed
5. If entitlement is now active, success message is shown
6. User can then toggle the feature on

## Notes

- The paywall was **disabled** (`PAYWALL_ENABLED = false`) at the time of removal, meaning all features were already free
- The `useFeatureFlag` hook and individual feature flag hooks (`useBudgetingEnabled`, etc.) are **retained** as they provide useful per-feature toggle functionality independent of monetization
- No RevenueCat configuration existed in `app.json` or `eas.json`
