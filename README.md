# RideWear

RideWear is a Flutter + NestJS app that recommends what to wear for outdoor activities by combining **weather**, **route/activity exposure**, the user’s **wardrobe**, and **personal comfort evidence**.

**Current MVP focus: Motorcycle.** Hiking, cycling, alpine skiing, snowboarding, and cross-country skiing are planned activity modules — they are **not** fully implemented recommendation engines today.

**Status on `dev` (verify against [PROJECT_PLAN.md](PROJECT_PLAN.md)):** M1–M2.7 foundations + **M3 Motorcycle Recommendation Engine v1** exist. Saved routes, wardrobe, auth/profile, nb/en localization, and motorcycle garment configuration foundations are in place. Map/place-search route building is **not** on `dev` yet (routes still use manual coordinates).

This README is the Windows-first developer onboarding guide. Authoritative product/architecture docs:

| Doc | Role |
|-----|------|
| [PROJECT_PLAN.md](PROJECT_PLAN.md) | Product vision, milestones, MVP scope |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical architecture & domain |
| [SECURITY.md](SECURITY.md) | Authz, secrets, trust boundaries |
| [PRIVACY_ARCHITECTURE.md](PRIVACY_ARCHITECTURE.md) | Location minimization & privacy |
| [RIDEWEAR_CONTEXT.md](RIDEWEAR_CONTEXT.md) | Compact agent/developer context |
| [DEVELOPMENT_NOTES.md](DEVELOPMENT_NOTES.md) | Implementation notes / debt |
| [.cursor/rules/ridewear-git-workflow.mdc](.cursor/rules/ridewear-git-workflow.mdc) | Git workflow for humans & Cursor |

---

## Quick start (experienced developers)

**Windows 11 + PowerShell.** Requires Node.js LTS, Flutter, Android Studio + emulator.

```powershell
git clone https://github.com/Arildb88/Motorcycle_clothing.git
cd Motorcycle_clothing
git checkout dev
git pull origin dev

https://nodejs.org/en/download
føl
# Terminal A — API
cd apps\api
npm install
npm run setup:env
npx prisma generate
npx prisma migrate dev
npm run start:dev
# Expect: API listening on http://localhost:3000/api

# Terminal B — health check
Invoke-RestMethod http://localhost:3000/api/health

# Terminal C — Flutter (start an Android emulator first)
cd apps\mobile
flutter pub get
flutter run
# Default API URL for emulator: http://10.0.2.2:3000/api
```

Helper scripts (from repo root): `scripts\start-api.bat` and `scripts\start-android.bat`.

---

## 1. Product (developer summary)

RideWear turns:

`weather + route/activity + wardrobe + personal comfort evidence → clothing recommendation`

into an explainable mobile experience. Motorcycle is the first complete recommendation activity (`motorcycle_v1` / M3). Other activities may appear in the UI as “coming next” without fake engines.

---

## 2. Current architecture

```
Flutter app (apps/mobile)
        │  HTTPS/HTTP + JWT
        ▼
NestJS REST API (apps/api)     ← business & security boundary
        │
        ▼
Prisma ORM
        │
        ▼
PostgreSQL 16 (local development)  ← DATABASE_URL and DIRECT_URL
```

| Layer | Stack |
|-------|--------|
| Mobile | Flutter / Dart (`apps/mobile`) |
| API | NestJS / TypeScript (`apps/api`) |
| ORM | Prisma |
| Local DB | PostgreSQL 16 (`docker-compose.yml` service `postgres`) |
| Hosted DB | Supabase PostgreSQL is an operator step after local migrate. Do not put that URL in git. |

**Rules**

- Flutter talks to the **NestJS API only**. Do not bypass the API for business or security logic.
- Do not put DB credentials, OAuth client secrets, or Strava secrets in the Flutter app.
- Local development uses the `postgres:16` service in `docker-compose.yml`. `DATABASE_URL` and `DIRECT_URL` are the same unpooled local URL. Do not point the API at a transaction pooler.

---

## 3. Repository structure

```
Motorcycle_clothing/
├── apps/
│   ├── api/                 # NestJS API, Prisma schema & migrations
│   │   ├── prisma/          # schema.prisma, migrations/, migrations_sqlite/ (archive)
│   │   ├── src/             # auth, wardrobe, routes, weather, recommend, …
│   │   ├── .env.example     # copy → .env (never commit .env)
│   │   └── package.json
│   └── mobile/              # Flutter client (Android + iOS)
│       ├── lib/
│       ├── android/
│       └── ios/
├── scripts/                 # start-api / start-android / smoke-api helpers
├── docs/                    # historical notes (e.g. PLAN.md)
├── .cursor/rules/           # Cursor/AI workflow rules
├── .github/workflows/       # API CI
├── PROJECT_PLAN.md
├── ARCHITECTURE.md
├── SECURITY.md
├── PRIVACY_ARCHITECTURE.md
├── RIDEWEAR_CONTEXT.md
└── docker-compose.yml       # local Postgres 16, plus optional Redis/API
```

Generated folders you can ignore: `node_modules/`, `build/`, `.dart_tool/`, `apps/api/dist/`, Prisma client under `node_modules/.prisma/`.

---

## 4. Required software (Windows 11)

| Tool | Notes |
|------|--------|
| Git | Clone + branching |
| Node.js + npm | **CI uses Node 22**; LTS is fine. Nest CLI is **local** via npm scripts — no global Nest install needed |
| Flutter SDK | Includes Dart |
| Android Studio | Android SDK + emulator |
| JDK 17 | Used by the Android Gradle toolchain (`JavaVersion.VERSION_17` in the app Gradle file) |
| PowerShell | Commands below are PowerShell-friendly |

### Fresh Windows setup (do this before cloning/running the app)

1. **Install Node.js LTS** from the official Node.js installer. npm is included. Close/reopen your terminal or IDE after installation so PATH refreshes.
2. **Install Flutter SDK** and add `<flutter-sdk>\bin` to your user PATH. Close/reopen the terminal/IDE.
3. **Install Android Studio** with the Android SDK and Android Emulator.
4. In Android Studio open **SDK Manager → SDK Tools** and install **Android SDK Command-line Tools (latest)**.
5. In the same **SDK Manager → SDK Tools** screen, note that **NDK (Side by side) → Installed** only means that *an* NDK version is installed; it does **not** guarantee RideWear's required version is present. Check **Show Package Details** at the bottom-right, expand **NDK (Side by side)**, select **28.2.13676358**, then click **Apply → OK** and let Android Studio finish. RideWear's Android build currently requires this exact NDK version. Verify it in PowerShell with `Test-Path "$env:LOCALAPPDATA\\Android\\Sdk\\ndk\\28.2.13676358"` — it should return `True`.
6. Create an Android Virtual Device in **Device Manager** and start it before running the Flutter app.
7. Run `flutter doctor`. Resolve Android-toolchain errors before continuing. With newer Android CLI versions, `flutter doctor --android-licenses` may report that `--licenses` is no longer needed; that message is informational.
8. If Android builds fail with Kotlin errors such as `Could not close incremental caches`, add the following to `apps/mobile/android/gradle.properties`, then run `flutter clean`, `flutter pub get`, and `flutter run` again:

```properties
kotlin.incremental=false
kotlin.compiler.execution.strategy=in-process
```

Expected NDK location with the default Windows Android SDK path:

```text
C:\Users\<your-user>\AppData\Local\Android\sdk\ndk\28.2.13676358
```

### Verify installs

```powershell
git --version
node --version
npm --version
flutter --version
flutter doctor
flutter devices
```

`flutter doctor` should report **No issues found** (or at minimum a healthy Android toolchain), and `flutter devices` should list your running Android emulator before you try the mobile app.

> **Note:** `npm WARN deprecated ...` during `npm install` and Flutter messages such as `packages have newer versions incompatible with dependency constraints` are warnings, not installation failures. Do not force-upgrade dependencies during first-time setup.
>
> **Java / `gradlew` on Windows:** Flutter/Android Studio can use Android Studio's bundled JDK even when PowerShell has no `JAVA_HOME`. If you run `apps/mobile/android/gradlew` directly and get `JAVA_HOME is not set and no 'java' command could be found in your PATH`, configure `JAVA_HOME`/PATH to a compatible JDK (the project currently targets Java 17), or use the normal Flutter commands instead.

---

## 5. Clone and branch workflow

```powershell
git clone https://github.com/Arildb88/Motorcycle_clothing.git
cd Motorcycle_clothing
git checkout dev
git pull origin dev
```

| Branch | Meaning |
|--------|---------|
| `main` | Stable, owner-controlled. **Do not push or merge here.** |
| `dev` | Integration branch. Open PRs **to `dev`**. |
| `feature/*`, `fix/*`, `docs/*`, … | Day-to-day work, branched from latest `dev` |

```powershell
git checkout dev
git pull origin dev
git checkout -b docs/my-change   # or feature/... / fix/...
# ... work, test ...
git push -u origin HEAD
# Open PR: your-branch → dev
```

---

## 6. Backend setup (`apps/api`)

From PowerShell:

```powershell
docker compose up -d postgres
cd apps\api
npm install
npm run setup:env          # copies .env.example → .env if missing
npx prisma migrate deploy  # apply the PostgreSQL baseline to local Postgres
npm run prisma:generate    # Prisma schema → generated Client
npm run start:dev          # Nest watch mode
```

`npx prisma migrate dev` stays the command for a later schema change, and only against this local database. Do not run it against a hosted Supabase project.

Equivalent npm scripts:

| Script | What it does |
|--------|----------------|
| `npm run setup:env` | Create `.env` from `.env.example` if absent |
| `npm run prisma:generate` | `prisma generate` |
| `npm run prisma:migrate` | `setup:env` + `prisma migrate dev` |
| `npm run start:dev` | `nest start --watch` |
| `npm run dev` | `setup:env` + `nest start --watch` |
| `npm run build` | `nest build` |
| `npm test` | Jest unit tests |
| `npm run test:smoke` | Runs `scripts/smoke-api.sh` (bash; Git Bash/WSL on Windows) |

Or double-click / run `scripts\start-api.bat` from the repo root (install + migrate + `start:dev`).

**Success message:**

```text
API listening on http://localhost:3000/api
```

**Health check:**

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Expected shape includes `"status": "ok"` (and service/env/weatherProvider fields).

Leave the API process running while using the Flutter app.

### After `git pull` (schema changes)

Keep these three consistent:

1. **Prisma schema** (`apps/api/prisma/schema.prisma`)
2. **Generated Prisma Client** (`npx prisma generate` / `npm run prisma:generate`)
3. **Migrated local Postgres** (`docker compose up -d postgres`, then `npx prisma migrate deploy`)

| Symptom | Safe fix (try in order) |
|---------|-------------------------|
| Many TS errors for missing Prisma models/fields | `npm run prisma:generate` |
| `P2021` / table such as `UserProfile` does not exist | Start Postgres, then `npx prisma migrate deploy` |
| Still broken after migrate | Inspect `npx prisma migrate status`. Do not drop the local database as the first step. |

`apps/api/prisma/migrations_sqlite/` is the archived SQLite history. Prisma Migrate does not apply it. Do not commit a Supabase URL or password.

---

## 7. Environment variables

Source of truth: [`apps/api/.env.example`](apps/api/.env.example).

```powershell
cd apps\api
npm run setup:env
# or: Copy-Item .env.example .env
```

Never commit `.env`. Never put server secrets in Flutter.

### Required for basic local development

| Variable | Purpose | Local default (example file) |
|----------|---------|------------------------------|
| `DATABASE_URL` | Prisma runtime URL for local Postgres 16 | `postgresql://motorcycle:motorcycle@localhost:5432/motorcycle` |
| `DIRECT_URL` | Prisma Migrate URL. Same local database as `DATABASE_URL` | same as `DATABASE_URL` |
| `PORT` | HTTP port | `3000` |
| `JWT_SECRET` | JWT signing | dev placeholder — change for shared envs |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `MET_USER_AGENT` | Contact string if using MET Norway | example UA |
| `WEATHER_PROVIDER` | `mock` (default) or MET provider | `mock` |
| `NODE_ENV` | Node environment | `development` |
| `OAUTH_REDIRECT_URI` | Mobile deep link for OAuth | `ridewear://oauth/callback` |
| `TOKEN_ENCRYPTION_KEY` | Encrypts Strava tokens at rest | dev placeholder |
| `ALLOW_DEMO_OAUTH` | Allow `demo:` OAuth tokens in non-prod | `true` |

With `WEATHER_PROVIDER=mock`, no external weather key is required.

### Optional integrations (leave empty to disable)

| Variable | Purpose |
|----------|---------|
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | Facebook Login (identity) |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` / `MICROSOFT_TENANT_ID` | Microsoft identity |
| `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` / `STRAVA_REDIRECT_URI` | Strava **connected service** (not login) |

When IdP app IDs are empty, those buttons stay disabled in the UI. With `ALLOW_DEMO_OAUTH=true` in non-production, the API can accept demo OAuth tokens for local testing (see auth module / smoke script). **Do not enable demo OAuth in production.**

### Flutter dart-defines (optional overrides)

| Define | Default | Purpose |
|--------|---------|---------|
| `API_BASE_URL` | `http://10.0.2.2:3000/api` | Nest API base (Android emulator → host) |
| `ADS_ENABLED` | `false` | AdMob banners |
| `ADMOB_BANNER_ID` | Google test banner id | Test ads only unless you replace it |

---

## 8. Database (PostgreSQL 16 + Prisma)

- Schema: `apps/api/prisma/schema.prisma` (`provider = "postgresql"`, `directUrl = env("DIRECT_URL")`)
- Applied migrations: `apps/api/prisma/migrations/` (one PostgreSQL baseline)
- Archived SQLite history, not applied: `apps/api/prisma/migrations_sqlite/`
- Local database: Postgres 16 from `docker compose up -d postgres`
- Host-side API uses `localhost`. The compose `api` service uses hostname `postgres`. Both `DATABASE_URL` and `DIRECT_URL` are set. Neither is a Supabase URL.

Normal sequence after pulling schema/migration changes:

```powershell
docker compose up -d postgres
cd apps\api
npm install
npm run setup:env
npx prisma migrate deploy
npm run prisma:generate
npm run start:dev
```

---

## 9. Flutter / mobile setup (`apps/mobile`)

```powershell
cd apps\mobile
flutter pub get
flutter doctor
flutter devices
flutter run
```

Or: `scripts\start-android.bat` (checks API health, then `flutter run` with the emulator API URL).

Pick a device explicitly:

```powershell
flutter devices
flutter run -d <device-id>
```

### Android emulator → host API networking

Inside the Android emulator, `localhost` is the **emulator itself**, not your Windows host.

The emulator reaches the host at **`10.0.2.2`**.

RideWear’s default (`AppConfig.apiBaseUrl`) is already:

```text
http://10.0.2.2:3000/api
```

So for Android emulator + local Nest, you normally **should not** switch the URL to `localhost`.

Override only when needed:

```powershell
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api
```

iOS simulator (macOS) typically uses `http://127.0.0.1:3000/api` instead.

---

## 10. First-run checklist

1. **Terminal A:** start API (`npm run start:dev` in `apps/api`) until you see the listening message.
2. **Health:** `Invoke-RestMethod http://localhost:3000/api/health` → `status: ok`.
3. Start an **Android emulator** in Android Studio.
4. **Terminal B:** `cd apps\mobile` → `flutter pub get` → `flutter run`.
5. **Register** a local account (email + password ≥ 8 characters + display name) or log in.
6. Confirm shell tabs load: activity home / **Today**, **Wardrobe**, **Routes**, **Profile**.
7. **Wardrobe:** add garments; optional **seed demo** wardrobe action exists in the UI (`POST /wardrobe/actions/seed-demo`).
8. **Routes:** create a saved motorcycle route. On current `dev`, waypoints are entered as **manual latitude/longitude** (map/place search is not merged yet — temporary limitation).
9. Exercise motorcycle recommendation from a route/plan flow when available in the UI (M3 engine on API).

---

## 11. Local demo data

There is **no** automatic Prisma seed on first migrate for a full demo user.

- **Demo wardrobe:** authenticated `POST /api/wardrobe/actions/seed-demo` (exposed from the wardrobe screen).
- **Users:** create via Register in the app (or auth API).
- **Routes:** create manually in the Routes UI.
- **Weather:** `WEATHER_PROVIDER=mock` returns deterministic local weather without MET credentials.

---

## 12. Testing and validation

### API (`apps/api`)

```powershell
cd apps\api
npm test
npm run build
```

Smoke (bash — use Git Bash or WSL):

```bash
cd apps/api
npm run test:smoke
# or: bash ../../scripts/smoke-api.sh
```

CI (`.github/workflows/api-ci.yml`): `npm ci` → `npx prisma generate` → `npm test` → `npm run build` → smoke script. **Node 22.**

### Flutter (`apps/mobile`)

```powershell
cd apps\mobile
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```

### Pre-PR checklist

- [ ] Branched from latest `dev`; PR targets **`dev`**
- [ ] `apps/api`: `npm test` and `npm run build`
- [ ] `apps/mobile`: `flutter analyze`, `flutter test`, and (when UI/native touched) `flutter build apk --debug`
- [ ] No secrets or `.env` committed
- [ ] Read architecture docs if the change touches auth, location, or recommendations

---

## 13. Troubleshooting

| Problem | What to do |
|---------|------------|
| `flutter` not found | Install Flutter SDK; add `flutter\bin` to PATH; reopen PowerShell; `flutter doctor` |
| No Android device | Android Studio → Virtual Device Manager → start emulator; `flutter devices` |
| Login failed / API unreachable | Ensure Nest is running; `Invoke-RestMethod http://localhost:3000/api/health`; emulator must use `10.0.2.2`, not `localhost` |
| Prisma Client TS errors after pull | `cd apps\api` → `npm run prisma:generate` |
| Prisma `P2021` missing table (e.g. `UserProfile`) | `docker compose up -d postgres`, then `npx prisma migrate deploy` |
| `DATABASE_URL` / env missing | `npm run setup:env` in `apps/api` |
| Port 3000 in use | Stop the other process, or set `PORT=3001` in `.env` and point Flutter `API_BASE_URL` at that port |
| `flutter_secure_storage` / Android SDK 37 | Current `dev` bumps the plugin for SDK 37 lookup — pull latest `dev` rather than renaming SDK folders |
| Kotlin incremental-cache build failure (`Could not close incremental caches`) | In `apps/mobile/android/gradle.properties`, set `kotlin.incremental=false` and `kotlin.compiler.execution.strategy=in-process`; then `flutter clean`, `flutter pub get`, `flutter run` |
| Direct `gradlew` says `JAVA_HOME is not set` | Flutter may still build via Android Studio's bundled JDK. Configure `JAVA_HOME`/PATH to a compatible JDK if direct Gradle commands are needed |
| Kotlin / `flutter_web_auth_2` warnings | Often non-blocking; fix only if the build fails |
| Duplicate Android emulator path warning | An `emulator` backup/copy can confuse the SDK; investigate before deleting |
| “RideWear isn’t responding” on first launch | First emulator/Gradle run can be slow; persistent ANR should be reported, not ignored |

---

## 14. Git contribution workflow (mandatory)

1. `git checkout dev && git pull origin dev`
2. `git checkout -b feature/my-feature` (or `fix/` / `docs/`)
3. Implement; run tests above
4. Commit; push branch
5. Open PR **into `dev`**
6. Do **not** merge to `main`; `dev → main` is owner-controlled

Cursor/AI agents: read `.cursor/rules/ridewear-git-workflow.mdc`, `PROJECT_PLAN.md`, `ARCHITECTURE.md`, `SECURITY.md`, `PRIVACY_ARCHITECTURE.md`, and `RIDEWEAR_CONTEXT.md` before architectural or implementation work. Never auto-start the next milestone.

---

## 15. Architectural guardrails

- Do not add a new framework, database, state-management library, or auth provider “just because.”
- Do not silently change architecture; explain conflicts against the source-of-truth docs.
- Do not bypass NestJS for business/security logic.
- Scope all user-owned resources to the authenticated user.
- Treat saved route coordinates as sensitive location data (see privacy doc).
- Do not log secrets, tokens, or precise location unnecessarily.
- Recommendation ranking must stay independent of advertising.
- Keep activity-specific exposure models separate; **shared wardrobe** stays cross-activity.

Details: [ARCHITECTURE.md](ARCHITECTURE.md), [SECURITY.md](SECURITY.md), [PRIVACY_ARCHITECTURE.md](PRIVACY_ARCHITECTURE.md).

---

## 16. Known current limitations (on `dev`)

Verify against code before assuming otherwise:

| Area | Current state |
|------|----------------|
| Recommendation engines | **Motorcycle M3 only**; hiking/cycling may appear in activity UI without full engines |
| Route builder | Manual lat/lon waypoints — **no** Google Maps / place-search builder on `dev` yet |
| Weather | Defaults to **mock**; MET Norway via `WEATHER_PROVIDER` when configured |
| Personalization | Feedback foundations exist; full M5 personalization is not complete |
| Ads | Disabled by default (`ADS_ENABLED=false`) |
| Production DB | Local API uses Postgres 16. Applying the baseline to hosted Supabase is a manual operator step and is not done by CI. |
| OAuth | Facebook/Microsoft optional and config-gated; email/password works locally |
| iOS | Supported by Flutter project; this README’s primary path is **Android emulator on Windows** |

---

## 17. Related docs

- [QUICKSTART.md](QUICKSTART.md) — older Windows spike guide (paths/branches may be stale; prefer this README)
- [DEVELOPMENT_NOTES.md](DEVELOPMENT_NOTES.md) — milestone implementation notes
- [docs/PLAN.md](docs/PLAN.md) — historical scaffold plan
