# Motorcycle Clothing / RideWear

Cross-platform app (Android + iPhone) that recommends motorcycle clothing from route weather and your personal comfort zone.

## Structure

```
apps/api      NestJS API (auth, routes, weather, recommendations, feedback)
apps/mobile   Flutter app (Android + iOS)
docs/PLAN.md  Product & technical plan
scripts/      Smoke tests
docker-compose.yml  Optional Postgres/Redis/API stack
```

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
cp .env.example .env   # or use the committed .env for local mock weather
npm install
npx prisma migrate dev
npm run start:dev
```

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
