# Stroberi
<img src="./assets/images/logo-round.png" alt="Stroberi logo" width="100"/>

Stroberi is a privacy-first personal expense tracker built with Expo + React Native. All data lives on the device in SQLite, so you can stay on top of your spending without handing your information to anyone else.

## Highlights

- Capture expenses with amounts, notes, and categories in just a few taps
- Custom categories, default currency, and quick stats to reflect the way you spend
- Local SQLite storage plus CSV import/export for easy backups and migrations
- Modern Tamagui UI layer with dark mode, smooth animations, and native-feeling gestures

## Tech stack

- Expo Router + React Native 0.76
- TypeScript everywhere
- SQLite (via `expo-sqlite`) for on-device persistence
- Tamagui, Bottom Sheet, FlashList, Skia, and Zeego for the interface
- Yarn 4 workspace with Biome for linting/formatting and Jest for tests

## Getting started

Prerequisites:

- Node.js 18+ (Expo SDK 52 requirement)
- Yarn 4 (`corepack enable` is recommended)
- Xcode (macOS) and/or Android Studio if you plan to run the native projects

Install dependencies:

```bash
yarn install
```

Start Metro + Expo Dev Tools:

```bash
yarn start
```

From the Expo CLI you can launch:

- `yarn ios` – build/run the iOS app locally
- `yarn android` – build/run the Android app locally

## Developer tooling

- `yarn lint` runs Biome lint rules on app code
- `yarn format` applies Biome formatting
- `yarn check:types` performs a no-emit `tsc` pass

## Project layout

- `app/` – Expo Router entry points and screens
- `components/` – shared UI primitives
- `data/` & `database/` – WatermelonDB/SQLite models, migrations, and seeds
- `hooks/` & `lib/` – shared hooks, utilities, and platform helpers
- `assets/` – icons, fonts, and branding

## Native directories

Generate native ios and android directories

```bash
npx expo prebuild
```

This will sync the native projects with `app.json` and the plugin configuration in `eas.json`.
