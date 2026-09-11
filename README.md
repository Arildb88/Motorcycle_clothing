# Motorcycle Clothing / RideWear

Cross-platform app (Android + iPhone) that recommends outdoor clothing from weather, route exposure, wardrobe, and personal feedback.

## Source of truth (read these first)

- **[PROJECT_PLAN.md](PROJECT_PLAN.md)** — product vision, MVP scope, roadmap, risks  
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — technical architecture, schema, adapters, engine  
- [QUICKSTART.md](QUICKSTART.md) — how to run the current spike on Windows  
- [docs/PLAN.md](docs/PLAN.md) — historical motorcycle scaffold plan (superseded for direction)

## Start here (Windows)

**Idiot-proof guide:** [QUICKSTART.md](QUICKSTART.md)

```bash
# Terminal 1 — API
./scripts/start-api.sh

# Terminal 2 — Android (emulator must already be running)
./scripts/start-android.sh
```

## Structure

```
apps/api      NestJS API (auth, routes, weather, recommendations, feedback)
apps/mobile   Flutter app (Android + iOS)
PROJECT_PLAN.md   Product + MVP roadmap (source of truth) — M1/M2 done
ARCHITECTURE.md   Technical architecture (source of truth)
DEVELOPMENT_NOTES.md  M1/M2 implementation notes / debt
docs/PLAN.md      Older motorcycle-first plan (historical)
scripts/      Smoke tests + start helpers
docker-compose.yml  Optional Postgres/Redis/API stack
```

> **Note:** M1/M2 delivered domain foundations + wardrobe. `/api/recommend` is still a **baseline spike shim** until M3. Ads off; email auth only in the UI.

## Features (MVP)

- Email register/login plus Facebook & Microsoft OAuth (demo tokens in test when app IDs are unset)
- Profile + comfort-zone sliders (gloves, layers, wool, rain)
- Routes with a default **normal commute**
- Weather via mock provider locally, or MET Norway (`WEATHER_PROVIDER=met`)
- Clothing recommendation + post-ride feedback learning
- Small AdMob banner on secondary tabs / below home content (test ad unit IDs)

## API (local / test)

```bash
cd apps/api
npm install
npm run setup:env          # copies .env.example → .env (required once)
npx prisma migrate dev
npm run start:dev
```

Or in one go after `npm install`:

```bash
npm run prisma:migrate && npm run start:dev
```

> If you see `Environment variable not found: DATABASE_URL`, run `npm run setup:env` (or `cp .env.example .env`) and retry. `.env` is gitignored on purpose.

Health: `GET http://localhost:3000/api/health`

Smoke test:

```bash
chmod +x scripts/smoke-api.sh
./scripts/smoke-api.sh
```

### Weather

| `WEATHER_PROVIDER` | Behavior |
|--------------------|----------|
| `mock` (default) | Deterministic fake temps for offline/CI |
| `met` | Live MET Norway Locationforecast (yr.no data) |

Set `MET_USER_AGENT` to a unique contact string when using `met`.

### OAuth

Set `FACEBOOK_APP_ID` / Microsoft client IDs for real providers.  
In development, Facebook/Microsoft buttons send `demo:<id>` tokens the API accepts.

## Flutter app

Requires Flutter SDK + Android Studio (and Xcode for iOS).

```bash
cd apps/mobile
flutter pub get

# Android emulator (API on host :3000)
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api

# iOS simulator
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:3000/api
```

Open the project in Android Studio via `apps/mobile` or the `android/` folder.

## Environments

| Env | How |
|-----|-----|
| Local | SQLite + `WEATHER_PROVIDER=mock`, AdMob test IDs |
| Test/staging | `.env.test` / docker-compose, test OAuth apps, AdMob test IDs |
| Production | Postgres, `WEATHER_PROVIDER=met`, real AdMob + OAuth app IDs |

## Docs

See [docs/PLAN.md](docs/PLAN.md) for the full product plan.
