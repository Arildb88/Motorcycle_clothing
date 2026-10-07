# RideWear release checklist

Human steps before a beta or store build. This pass does not deploy, publish, rotate credentials, or change providers.

Validated on 2026-10-06 from `dev_test` at generation 42 (`RELEASE-READINESS-001`). Flutter 3.47.6 (Dart 3.13.5) on Linux. API on Node 22. Local PostgreSQL 16 only.

## What already passed

| Check | Result |
| --- | --- |
| `flutter analyze` | No issues found |
| `flutter test` | 154 tests passed |
| `npm test` in `apps/api` | 334 tests passed |
| `npm run build` | Nest production build passed |
| `npx prisma generate` and `npx prisma validate` | Prisma 5.22.0, schema valid |
| `npx prisma migrate deploy` on local Postgres 16 | Both committed migrations applied |
| `npx prisma migrate diff` from migrations to `schema.prisma` | No difference |
| `scripts/check-supabase-readiness.sh` | Passed. No hosted connection |
| `scripts/smoke-api.sh` | Passed against local Postgres, MET weather, and demo OAuth |
| Android release build | Not run. This machine has no Android SDK |
| iOS / TestFlight | Not run. This machine is Linux, not macOS |

No product code changed in this pass. No schema, dependency, or provider change.

## Secrets

Committed files do not contain a keystore, private key, or hosted database URL. `apps/api/.env.example` and `apps/api/.env.test` keep the published local Docker URL and placeholder secrets. `.env` and `*.keystore` are gitignored.

Keep these on the API host only: `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `ORS_API_KEY`, SMTP passwords, and both database URLs. Do not put them in Flutter. Production refuses a missing, short, or example `JWT_SECRET`. Unexpected API errors return `Internal server error` and log only the error name. `devResetToken` is omitted when `NODE_ENV` is `production`. Demo OAuth tokens are rejected in production.

## Configuration the operator must set

Follow [SUPABASE_FIRST_DEPLOY.md](SUPABASE_FIRST_DEPLOY.md) for the hosted database. CI and this checklist do not apply migrations to Supabase.

| Setting | Expectation for a beta |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Hosted session pooler, port 5432, `sslmode=require`. Not port 6543 |
| `DIRECT_URL` | Migration-capable URL from the Supabase runbook. Same document decides session pooler versus direct host |
| `JWT_SECRET` | Unique, at least 32 characters, not an example from the repo |
| `TOKEN_ENCRYPTION_KEY` | Required before any Strava token is stored. 64 hex characters or a passphrase |
| `CORS_ORIGINS` | Browser origins only. Native Flutter sends no Origin |
| `SMTP_HOST`, `MAIL_FROM`, `PASSWORD_RESET_PUBLIC_URL` | Required for password-reset email. Without SMTP, production still hides the reset token and does not send mail |
| `WEATHER_PROVIDER` | `met`. `mock` and unknown names are configuration errors. Set `MET_USER_AGENT` to an app name plus a real contact address. Change an existing local `.env` that still says `mock`; do not commit secrets |
| `ROUTING_PROVIDER` and `ORS_API_KEY` | `ors` plus a server-side key. An empty key makes road routing unavailable and place search reports that it is not configured. It does not estimate a straight-line route. Place selection uses Pelias autocomplete coordinates; HeiGIT does not serve `/pelias/v1/place`. |
| `ELEVATION_PROVIDER` | `kartverket` (default, no key) or `off` |
| Resort and trail providers | Fnugg and Kartverket Turrutebasen need no key. Do not send Fnugg weather |
| `FACEBOOK_*`, `MICROSOFT_*` | Leave empty. Do not enable those logins from this checklist |
| `ALLOW_DEMO_OAUTH` | Do not rely on it. Production rejects `demo:` tokens |
| `ADS_ENABLED` | Leave unset or false. See ads below |

The API image runs `prisma migrate deploy` before listen. The container needs both database URLs.

## Ads

`ADS_ENABLED` defaults to false. The ad SDK initializes only when that flag is true. Eligible surfaces stay the activity home after primary content, the saved-routes list, and the wardrobe list. Profile, auth, and the recommendation result stay empty. Ads do not affect ranking.

The Android manifest still carries Google's sample AdMob application id. Leave it until a human AdMob account exists. Do not turn ads on, and do not ship a store build that uses the sample id as if it were production.

## Android signing and distribution

`apps/mobile/android/app/build.gradle.kts` signs `release` with the debug keystore so a local release run works. That is not a Play upload key.

Before distribution:

1. Create an upload keystore outside git. Do not commit the keystore or its passwords.
2. Point the release `signingConfig` at that keystore on the build machine.
3. On a machine with the Android SDK, build with an HTTPS API URL. Cleartext is disabled:

   `flutter build appbundle --dart-define=API_BASE_URL=https://<api-host>/api`

4. Application id: `no.motorcycleclothing.motorcycle_clothing`.
5. Play Console listing, privacy policy, and upload stay with the owner. This pass did not upload.

The default `API_BASE_URL` is the Android emulator address `http://10.0.2.2:3000/api`. A device build must override it.

## Later iOS / TestFlight

Do this on macOS. It was not validated here.

- Bundle id: `no.motorcycleclothing.motorcycleClothing`.
- The Xcode project has no `DEVELOPMENT_TEAM`.
- Add signing, the `ridewear` URL scheme check, and TestFlight upload as a separate human step.
- Do not treat this Linux pass as an iOS build or test result.

## Dependency note

`npm audit` reports 20 moderate findings, all under Jest and its test tooling (`js-yaml`, `sprintf-js`, and Jest packages). No critical or high finding. Production dependencies were not changed. Prisma stays 5.22.0. Eight Flutter packages have newer versions outside the current constraints. Do not upgrade them as part of a release cut unless a later task says so.

## Still human-owned

- `dev` and `main` stay untouched. `dev` to `main` is an owner merge.
- Hosted Supabase apply, backups, and a tested restore.
- Android SDK build, upload keystore, and Play Console.
- macOS build and TestFlight.
- Live MET, OpenRouteService, Fnugg, and Kartverket accounts and quotas. This pass did not call them.
- A real `MET_USER_AGENT` contact address.
- Microsoft and Facebook login stay off. See `docs/research/SOCIAL_AUTH_LOGIN_PLAN.md`.
