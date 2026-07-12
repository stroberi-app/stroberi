# Release Guide (Expo + EAS)

This guide covers versioning, native project synchronization, production builds, and submission to Apple App Store and Google Play.

## Source of truth

- App and native release versions: `app.json`
- Package version: `package.json`
- EAS profiles: `eas.json`
- `eas.json -> cli.appVersionSource`: `local`
- `eas.json -> build.production.autoIncrement`: `false`

Versions are bumped explicitly before prebuild so the generated iOS and Android projects contain the exact store versions being released.

## 1. Prerequisites

```bash
yarn dlx eas-cli@latest login
yarn dlx eas-cli@latest whoami
```

Ensure store credentials are configured when required:

```bash
yarn dlx eas-cli@latest credentials
```

## 2. Bump release versions

Update all of the following before every store release:

- `app.json -> expo.version`
- `package.json -> version`
- `app.json -> expo.ios.buildNumber` (increment)
- `app.json -> expo.android.versionCode` (increment)

For a native release, also update `app.json -> expo.runtimeVersion` to the new app version. This prevents OTA updates built for a new native runtime from reaching incompatible binaries.

Example values for release `1.3.0`:

- `expo.version`: `1.3.0`
- `package.json -> version`: `1.3.0`
- `ios.buildNumber`: `56`
- `android.versionCode`: `47`
- `runtimeVersion`: `1.3.0`

Because production `autoIncrement` is disabled, these explicit values are used unchanged by EAS and remain reproducible in git.

## 3. Synchronize native projects

After changing `app.json`, regenerate the checked-in native projects:

```bash
yarn expo prebuild --clean
```

`--clean` recreates `ios/` and `android/` from Expo config and config plugins. Review the resulting native diff before building. Do not hand-edit generated native version fields; change `app.json` and run prebuild again.

The WatermelonDB prebuild plugin may uncomment an explicit `simdjson` pod even though React Native autolinking already declares it. If CocoaPods reports multiple `simdjson` sources, comment out the explicit `pod 'simdjson'` line in `ios/Podfile`, retain the explanatory comment, and rerun:

```bash
cd ios && pod install --repo-update
```

Confirm the resolved Expo config and generated native versions:

```bash
yarn expo config --type public
rg 'MARKETING_VERSION|CURRENT_PROJECT_VERSION' ios/Stroberi.xcodeproj/project.pbxproj
rg 'versionCode|versionName' android/app/build.gradle
```

## 4. Pre-release checks

```bash
yarn lint
yarn check:types
```

Review all release changes:

```bash
git diff -- app.json package.json eas.json ios android RELEASE_GUIDE.md
git status --short
```

Commit release preparation before starting remote builds so the EAS build has a traceable source revision.

## 5. Build production binaries

Build both store binaries with the production profile:

```bash
yarn dlx eas-cli@latest build --platform all --profile production
```

The outputs are an iOS `.ipa` and Android `.aab`. Record both EAS build URLs/IDs and verify both builds finish successfully before submission.

## 6. Submit production builds

Submit each latest successful production build with the production submit profile:

```bash
yarn dlx eas-cli@latest submit --platform ios --latest --profile production
yarn dlx eas-cli@latest submit --platform android --latest --profile production
```

The Android submit profile currently targets the Play Console `internal` track. Promotion to production is performed in Play Console after validation. The iOS profile uses the configured App Store Connect app ID.

## 7. Store console steps

1. App Store Connect: select the uploaded build for the app version, complete metadata/release notes, and submit for review.
2. Google Play Console: validate the internal-track upload, promote it to production (or a staged rollout), add release notes, and start rollout.

## 8. Post-release

1. Verify the live store versions.
2. Tag the exact release commit, for example `v1.3.0`, and push the tag.
3. Keep `app.json`, `package.json`, generated native projects, `eas.json`, and this guide committed together.

## OTA updates without store submission

For a JS-only update compatible with the current native runtime:

```bash
yarn dlx eas-cli@latest update --branch production --message "fix: <short description>"
```

Do not use OTA for changes requiring a new Expo SDK, native module, config plugin output, permissions, entitlements, or other native project changes.
