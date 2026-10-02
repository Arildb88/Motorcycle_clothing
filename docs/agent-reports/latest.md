# MVP-SMOKE-001 readiness pass

## Task

`MVP-SMOKE-001`, generation 15, authorized by the automatic final control update on `dev_test` commit `add9dde8e06099c096777f07ab0850291663eced`. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/mvp-smoke-001`
- Implementation: readiness record on this branch. No application code change.
- PR: opened against `dev_test` only. Not merged to `dev` or `main`.

## Implementation

No product code, dependency, schema, or provider change. The authorized paths were exercised with the existing deterministic suites and the repository smoke script. Concrete regressions inside the current architecture were not found.

Happy paths that passed:

- Auth: `POST /api/auth/register` returned an access token. `GET /api/auth/providers` showed email enabled. Facebook and Microsoft were not configured. The smoke script's demo Facebook OAuth call succeeded only because `ALLOW_DEMO_OAUTH` was set for that local process.
- Profile: `GET /api/users/me` returned the new user. The smoke script's `PATCH /api/users/me` set `defaultActivity` to hiking.
- Wardrobe: create a base layer, seed demo garments, keep a personal garment when demo garments are deleted.
- Route planning: create a saved commute, then `POST /api/routes/:id/plan` with `planningMode=departure`. With routing unconfigured, the plan used the saved waypoints and the 30-minute duration hint. That is the null-routing fallback, not a live routing result.
- Motorcycle recommendation: smoke `GET /api/recommend` returned `effectiveTempC` under `WEATHER_PROVIDER=mock`.
- Cycling: saved route plus `GET /api/recommend?intensity=steady` returned engine `cycling_v1` and intensity `steady`.
- Alpine skiing: saved route plus recommend returned engine `alpine_v1`, discipline `alpine_skiing`, and exposure mode `lift` when the query omitted exposure. That matches the engine default.
- Snowboarding: saved route plus `exposure=lift` returned engine `alpine_v1` and discipline `snowboarding`.
- Cross-country: saved route plus `intensity=easy&style=classic` returned engine `xc_v1`, style `classic`, and intensity `easy`.
- Ads-off default: `AppConfig.adsEnabled` is the `ADS_ENABLED` compile flag and defaults to false. `ad_placement_policy_test.dart` expects a disabled flag to refuse every surface.

## Final control state

Promotion is automatic. No queued unconsumed item remains, so this close is idle and authorizes nothing.

- `MVP-SMOKE-001` completed and appended once to `consumed.md`
- `active_id: none`
- `promotion: automatic` unchanged
- `handoff_generation: 15` unchanged
- `handoff_state: idle`
- `paused: false`
- `next-task.md`: idle, Generation 15, Handoff-From `none`, Authorization `none`

## Checks

Node v22.14.0, in `apps/api`:

- `npx prisma generate` — passed
- `npm test -- --runInBand --no-coverage` — 31 suites, 213 tests passed
- `npm run build` — passed
- `SMOKE_SKIP_UNIT=1 SMOKE_SKIP_BUILD=1 bash scripts/smoke-api.sh` — passed against local PostgreSQL 16 after applying `20261002120000_postgres_baseline`. Unit tests and the build had just passed, so the smoke run followed the CI split and covered migrate plus HTTP.

Flutter 3.47.6 (Dart 3.13.5), in `apps/mobile`:

- `flutter test` — 78 tests passed
- `flutter analyze` — no issues

Additional local HTTP exercise, same mock weather and no routing key: register, profile read, cycling, alpine skiing, snowboarding, cross-country recommend, and route plan. Each returned HTTP 200 or 201 as recorded above. Weather responses came from the mock provider. Live MET was not called for those recommends.

## Architecture / config

No new dependency, provider, paid service, schema change, or secret. `WEATHER_PROVIDER` stayed `mock` for the HTTP exercise. Routing was left unconfigured. `dev` and `main` were not modified.

## Remaining

Manual or live-service checks that this run did not perform:

- A device or emulator pass through the Flutter screens.
- Live MET weather. This run used the mock provider and does not claim live forecast accuracy.
- A recorded Kartverket elevation result. The adapter may contact the network and swallows failures. No elevation success was asserted.
- OpenRouteService directions. The plan response is the saved-waypoint fallback.
- Configured Facebook, Microsoft, or other non-demo OAuth.
- Hosted Supabase or a production deploy.
- A device build with the ad SDK. The automated check is the placement policy and the default-off flag, not a rendered ad.

Known MVP limit, left unchanged: a saved `hiking` route is accepted, and `GET /api/recommend` for that route uses `motorcycle_v1`. Hiking has no separate engine. Adding one would be a new feature.

No further queued task is authorized.
