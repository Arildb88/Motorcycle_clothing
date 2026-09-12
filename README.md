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
SQLite (local development)     ← DATABASE_URL=file:./dev.db
```

| Layer | Stack |
|-------|--------|
| Mobile | Flutter / Dart (`apps/mobile`) |
| API | NestJS / TypeScript (`apps/api`) |
| ORM | Prisma |
| Local DB | SQLite |
| Future production DB | Portable PostgreSQL / Supabase Postgres (**not required** for local dev) |

**Rules**

- Flutter talks to the **NestJS API only**. Do not bypass the API for business or security logic.
- Do not put DB credentials, OAuth client secrets, or Strava secrets in the Flutter app.
- Optional `docker-compose.yml` Postgres/Redis is for staging-style experiments — **not** the default local path.

---

## 3. Repository structure

```
Motorcycle_clothing/
├── apps/
│   ├── api/                 # NestJS API, Prisma schema & migrations
│   │   ├── prisma/          # schema.prisma, migrations/, local *.db (gitignored)
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
└── docker-compose.yml       # optional Postgres/Redis/API (not required locally)
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

### Verify installs

```powershell
git --version
node --version
npm --version
flutter --version
flutter doctor
```

`flutter doctor` should be healthy for the **Android toolchain** before you try the emulator app.

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
cd apps\api
npm install
npm run setup:env          # copies .env.example → .env if missing
npx prisma generate        # Prisma schema → generated Client
npx prisma migrate dev     # apply migrations to local SQLite
npm run start:dev          # Nest watch mode
```

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
3. **Migrated SQLite DB** (`npx prisma migrate dev`)

| Symptom | Safe fix (try in order) |
|---------|-------------------------|
| Many TS errors for missing Prisma models/fields | `npm run prisma:generate` |
| `P2021` / table such as `UserProfile` does not exist | `npx prisma migrate dev` (or `npm run prisma:migrate`) |
| Still broken after migrate | Inspect migration status; **do not** delete `dev.db` as the first step |

Local DB files (`*.db`) are gitignored — do not commit them.

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
| `DATABASE_URL` | Prisma SQLite URL | `file:./dev.db` |
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

## 8. Database (SQLite + Prisma)

- Schema: `apps/api/prisma/schema.prisma`
- Migrations: `apps/api/prisma/migrations/`
- Local file DB via `DATABASE_URL=file:./dev.db` (under the Prisma working directory; gitignored)

Normal sequence after pulling schema/migration changes:

```powershell
cd apps\api
npm install
npm run prisma:generate
npx prisma migrate dev
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
| Prisma `P2021` missing table (e.g. `UserProfile`) | `npx prisma migrate dev` — **do not** delete `dev.db` first |
| `DATABASE_URL` / env missing | `npm run setup:env` in `apps/api` |
| Port 3000 in use | Stop the other process, or set `PORT=3001` in `.env` and point Flutter `API_BASE_URL` at that port |
| `flutter_secure_storage` / Android SDK 37 | Current `dev` bumps the plugin for SDK 37 lookup — pull latest `dev` rather than renaming SDK folders |
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
| Production DB | Still SQLite locally; Supabase/Postgres migration **not** done |
| OAuth | Facebook/Microsoft optional and config-gated; email/password works locally |
| iOS | Supported by Flutter project; this README’s primary path is **Android emulator on Windows** |

---

## 17. Related docs

- [QUICKSTART.md](QUICKSTART.md) — older Windows spike guide (paths/branches may be stale; prefer this README)
- [DEVELOPMENT_NOTES.md](DEVELOPMENT_NOTES.md) — milestone implementation notes
- [docs/PLAN.md](docs/PLAN.md) — historical scaffold plan
