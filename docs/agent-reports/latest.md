# Route weather sampling along road geometry and ETA

## Task

Route weather sampling using real route geometry and ETA. Recommendation weather points are taken along the road-following line from the existing HeiGIT routing preview, and each point has an estimated arrival time from route progress and the provider duration.

Saved-waypoint sampling with the route duration hint remains the fallback when the road line or provider duration is missing. Dense geometry is not stored.

## Commit / PR

- Branch: `feature/route-weather-sampling` from `dev_test` (`15709ea`)
- Commit: `173d34c` — feat(weather): sample forecasts along road geometry and ETA
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/23 into `dev_test` only. Not merged to `dev` or `main`.

## Files changed

- `apps/api/src/routing/route-weather-sampling.ts` — sample positions and ETAs along a polyline; fallback stays on saved vertices
- `apps/api/src/routing/route-weather-sampling.spec.ts`
- `apps/api/src/recommend/motorcycle/route-travel.ts` — one travel segment per weather sample when a road line is used
- `apps/api/src/recommend/recommend.service.ts` — `/recommend` uses the road line, provider duration, and departure time
- `apps/api/src/recommend/recommend.module.ts` — imports the existing routing module
- `apps/api/src/weather/weather.service.ts` — fetches the chosen samples without collapsing them; MET selects the timeseries hour nearest the ETA
- `apps/api/src/weather/met-timeseries.ts` and `met-timeseries.spec.ts`
- `apps/api/src/recommend/weather.types.ts` — optional `forecastAt` on a weather point
- Export wiring in `routing/index.ts` and `recommend/motorcycle/index.ts` / `pipeline.ts`

## Tests / build

- `apps/api`: `npm test` — 113 passed (17 suites), including geometry sampling, ETA progression, short-route endpoints, waypoint fallback, and MET hour selection
- `apps/api`: `npm run build` — succeeded
- `scripts/smoke-api.sh` — passed, including `GET /api/recommend` with routing unconfigured (waypoint fallback)
- Flutter was not changed, so `flutter analyze` / `flutter test` were not run

## Architecture / config

- No schema change, dependency change, new provider, or new paid service
- Routing storage is unchanged: `analyzePlanRoute` still strips dense geometry before it is saved
- `/recommend` calls the existing OpenRouteService preview only when `ROUTING_PROVIDER=ors` and `ORS_API_KEY` are set
- Provider duration replaces `typicalDurationMin` for the ride length only when that preview succeeds
- Weather cache keys gain an hour suffix when a sample has an ETA, using the existing `WeatherCache.cacheKey` string
- Up to 5 samples. Road lines shorter than 8 km use the endpoints only. Fallback does not invent coordinates between saved waypoints

## Manual testing recommended

- With ORS configured, open a saved route longer than a short hop and request `/recommend?departureAt=<ISO>`. Confirm weather points sit on the road (not only the saved waypoints) and `forecastAt` moves from departure to arrival.
- Repeat with a departure several hours later and confirm MET-backed samples can differ by hour. Mock weather stays coordinate-based.
- Stop the routing provider (or unset `ORS_API_KEY`) and confirm `/recommend` still returns a kit from the saved waypoints.
- Create an activity plan and confirm `routeAnalysisJson` still stores waypoint endpoints, not the dense road line.

## Remaining issues

- ETA is distance progress times the provider duration. It does not use live traffic or per-leg ORS segment times.
- Mock weather does not change with the clock; only MET forecast selection and `forecastAt` carry the ETA.
- A single overview speed is applied to every sample segment. Step-level speed limits are still not used.
- `/weather/point` still uses the previous start/mid/end collapse. Only `/recommend` uses the geometry samples.
