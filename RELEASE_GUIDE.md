# Release Guide (Expo + EAS)

This guide covers how to bump app versioning and deploy a new build to Apple App Store and Google Play using Expo + EAS for this repo.

## Current project config

- App config: `app.json`
- EAS config: `eas.json`
- NPM app version: `package.json`

Current release-relevant values in this repo:

- `expo.version`: `1.0.14`
- `ios.buildNumber`: `33`
- `android.versionCode`: `37`
- `runtimeVersion`: `1.0.0`
- `eas.json -> build.production.autoIncrement`: `true`
- `eas.json -> cli.appVersionSource`: `local`

Because `appVersionSource` is `local`, version changes live in git-tracked files (`app.json`/`package.json`).

## 1. Prerequisites (one-time)

1. Install and authenticate:
   - `npm i -g eas-cli`
   - `eas login`
2. Ensure app is configured for EAS:
   - `eas build:configure`
3. Ensure store credentials are configured:
   - iOS (App Store Connect): `eas credentials`
   - Android (Play Console service account): `eas credentials`

## 2. Upgrade app version

### 2.1 Update semantic version

Bump both:

- `app.json` -> `expo.version`
- `package.json` -> `version`

Example: `1.0.14` -> `1.0.15`

### 2.2 Build numbers

- `ios.buildNumber` and `android.versionCode` must always increase for store releases.
- In this repo, `build.production.autoIncrement` is `true`, so EAS increments them for production builds.
- After build, check and commit any version changes written locally.

### 2.3 Runtime version (important for OTA compatibility)

`runtimeVersion` controls which binaries can receive OTA updates.

- If release includes native changes (new Expo SDK/native modules/prebuild changes), bump `runtimeVersion`.
- If release is JS-only and you want existing installs to receive OTA updates, keep compatible runtime policy.

## 3. Pre-release checks

Run quality checks before building:

```bash
yarn lint
yarn check:types
```

Optional local sanity:

```bash
yarn start
```

Commit release prep changes before building:

```bash
git add app.json package.json
git commit -m "chore: bump app version to 1.0.15"
```

## 4. Build production binaries

Build both platforms:

```bash
eas build --platform all --profile production
```

Or per platform:

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

Notes:

- iOS output is an `.ipa`.
- Android store output is an `.aab`.
- With `autoIncrement: true`, EAS should bump `ios.buildNumber` / `android.versionCode`.

## 5. Submit to stores

Submit latest successful builds:

```bash
eas submit --platform ios --latest
eas submit --platform android --latest
```

If you want build + submit in one step:

```bash
eas build --platform all --profile production --auto-submit
```

If you prefer fully scripted submits, add a `submit` section in `eas.json` and then pass `--profile <name>`.

## 6. Store console release steps

After submission:

1. App Store Connect:
   - Open the new build under your app version.
   - Fill release notes/metadata.
   - Submit for review.
2. Google Play Console:
   - Promote uploaded AAB in production track (or staged rollout).
   - Fill release notes.
   - Start rollout.

## 7. Post-release checklist

1. Verify live store versions.
2. Tag release in git:
   - `git tag v1.0.15`
   - `git push origin v1.0.15`
3. If EAS auto-increment changed local files, commit and push:
   - `git add app.json`
   - `git commit -m "chore: sync build numbers after release"`

## OTA update flow (without store submission)

For JS-only hotfixes compatible with current runtime:

```bash
eas update --branch production --message "fix: <short description>"
```

This does not create a new store binary.
