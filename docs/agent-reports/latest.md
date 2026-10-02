# Altitude-aware route weather foundation

## Task

Server-side ground elevation for the existing motorcycle recommendation flow: road geometry, route weather samples and ETA, ground altitude, then MET Locationforecast at that height. Provider-independent so later activities can reuse the elevation port.

## Selected elevation source

Kartverket open Høydedata, `GET https://ws.geonorge.no/hoydedata/v1/punkt`.

Why: `docs/architecture/GEO_DATA_STRATEGY.md` and `docs/research/WEATHER_DATA_QUALITY.md` already identify this as the Norway-first open elevation API. It needs no key and no new dependency (the API client already uses axios). Open-Meteo’s free elevation tier is non-commercial and is not used. HeiGIT elevation shares the small directions quota and is not used.

## Licensing / attribution / config

- License: Kartverket open data, CC BY 4.0.
- Attribution: `© Kartverket` on `weather.elevation` when at least one sample height is returned.
- `ELEVATION_PROVIDER=kartverket` (default). Any other value, including `off`, uses the null adapter.
- Optional `ELEVATION_BASE_URL`. No API key.
- Coordinates are sent as `koordsys=4258` (geographic lat/lon). `punkter` is `[[lon, lat], ...]` with at most 50 points per request. MET receives `altitude` as whole metres.

## Commit / PR

- Branch: `feature/altitude-aware-route-weather` from `dev_test` (`9cc3aae`)
- Implementation commit: `02b59f6523acdcd263837c4153239cb55ca05bc7` — feat: add ground altitude to route weather
- Report commit that CI passed: `8b2abcc8471fd6fbf1d83f128cf31a11f878ffa5`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/25
- CI: `api-ci` succeeded on that head (pull_request run 36975353586, job `test` SUCCESS). The implementation push run 36975306751 also succeeded.
- Merge: fast-forward into `dev_test` only. `dev` and `main` are unchanged. The `dev_test` tip is the commit that adds this CI and merge record.

## Files changed

- `apps/api/src/elevation/elevation.port.ts`
- `apps/api/src/elevation/elevation.module.ts`
- `apps/api/src/elevation/kartverket-elevation.adapter.ts`
- `apps/api/src/elevation/kartverket-elevation.adapter.spec.ts`
- `apps/api/src/elevation/null-elevation.adapter.ts`
- `apps/api/src/elevation/lookup-sample-altitudes.ts`
- `apps/api/src/weather/met-request.ts`
- `apps/api/src/weather/met-request.spec.ts`
- `apps/api/src/weather/weather.service.ts`
- `apps/api/src/weather/weather.service.spec.ts`
- `apps/api/src/recommend/recommend.module.ts`
- `apps/api/src/recommend/recommend.service.ts`
- `apps/api/src/recommend/weather.types.ts`
- `apps/api/.env.example`
- `docs/agent-reports/latest.md`

## Tests / build

- Focused tests: Kartverket batching/caching/fallback, sample-altitude fallback, MET URL and cache key, ETA timeseries selection, weather service altitude propagation. Passed.
- `npm test`: 20 suites, 128 tests passed.
- `npm run build`: passed.
- `scripts/smoke-api.sh` (`SMOKE_SKIP_UNIT=1`, `SMOKE_SKIP_BUILD=1`): passed, including `GET /api/recommend`.
- GitHub `api-ci` on PR #25: success (run 36975353586).

## Architecture / config

New server-side `ElevationPort`. Recommendation code does not import Kartverket. Weather samples (already at most five) are the only coordinates sent for elevation. Dense road geometry stays ephemeral and is not stored. No schema migration, no new dependency, no routing-provider change. In-memory elevation cache holds at most 500 successful heights and does not store failures. Weather cache keys gain `@<metres>m` only when a height is present, so existing lat/lon cache entries still match.

## Fallback

If the provider is not `kartverket`, the request fails, the response is not 2xx, or the body length does not match, sample heights stay null. MET is then called with lat/lon only, and the recommendation still returns. A MET failure still falls back to the existing mock point.

## Manual testing recommended

- With `ELEVATION_PROVIDER=kartverket` and `WEATHER_PROVIDER=met`, recommend a route that climbs and confirm `weather.points[].groundElevationM` and `weather.elevation.attribution` (`© Kartverket`).
- Set `ELEVATION_PROVIDER=off` and confirm the same route still returns a recommendation without `groundElevationM`.
- Confirm a MET request for a known height includes `altitude=<whole metres>` and still follows the sample ETA.

## Remaining issues

- Heights are not compared with a surveyed station in this change. The weather research document’s station check is still outstanding.
- The elevation cache is process-local only.
- Cycling, alpine/snowboard, and cross-country do not call this port yet.
