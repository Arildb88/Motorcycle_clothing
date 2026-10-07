# REAL-DATA-ONLY-001

## Task

`REAL-DATA-ONLY-001`, generation 46, authorized from `COMMUTE-ROUNDTRIP-001`. This run did not write a claim commit. The validated `next-task.md` token stayed the ownership record until this branch's final control state.

- Branch: `fix/real-data-only-001`
- Implementation commit: `503c31d5db12e6c6072867208c9d2dca2706d24c`
- PR: into `dev_test` only. Not merged to `dev` or `main`.

## Result

Runtime weather is MET. `WEATHER_PROVIDER` unset or `met` is the only accepted provider. `mock` and any other name stop before a forecast is built and return a configuration error. There is no synthetic weather fallback for timeouts, empty payloads, missing temperature, wind, or precipitation amount, or a requested time outside the MET series.

A usable point records `source: met` and `forecastValidAt` from the MET step. The configured label `met` is not that proof. Explicit zero temperature, wind, or precipitation amount is kept. Current locationforecast compact responses omit `probability_of_precipitation`. That omission is stored as null and is not turned into 0. Rain decisions use the precipitation amount MET did send, and a missing probability does not count as dry or wet. Temperature, wind, and precipitation amount are still required.

Weather cache keys use the `wx2` namespace. Older `met:` and `series:met:` rows, including synthetic points stored under those keys, are not read. Unrelated user data and historical snapshots are not rewritten.

The running app no longer uses `NullRoutingAdapter` or a fake place/route service. An unconfigured or failed OpenRouteService result is `routing.available: false`. It is not stored as a straight-line route or presented as a provider arrival. A rider-entered duration can still build the schedule. Manual coordinates remain available. Test doubles stay inside tests.

Unavailable and partial forecasts do not produce a clothing recommendation. Norwegian and English copy names the failed commute leg and offers retry. The home rain chip is hidden when MET did not send a probability.

## Local environment

An existing local `.env` that still says `WEATHER_PROVIDER=mock` must be changed to `WEATHER_PROVIDER=met`. `MET_USER_AGENT` must name the app and include a contact address or `http(s)://` URL. The `.env.example` value that contains `example.com` is a placeholder and is rejected. Values containing `(dev)`, `(staging)`, `(test)`, or `(smoke)` are rejected, including the compose placeholder `MotorcycleClothingApp/0.1 (staging)`. Do not commit the contact address or provider keys. Restart the API after editing `.env`. This run did not overwrite a local secrets file.

## Checks

- API production build: passed (`npm run build` in `apps/api`)
- Production typecheck: passed
- Focused API tests passed: weather service, altitude-aware weather, MET cache keys, departure comparison, alpine/cycling/xc recommend, motorcycle/cycling/alpine engines, commute domain, commute plan, routes service, provider plan, and ORS adapter
- `flutter analyze`: no issues found
- `flutter test test/ride_analysis_result_test.dart test/commute_roundtrip_test.dart test/ux_polish_test.dart`: passed
- Live MET: one `GET https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.91&lon=10.75` with the repository User-Agent returned HTTP 200 in 0.52s. The payload had 84 timeseries steps. The first step included air temperature, wind speed, and precipitation amount. None of the 84 steps included `probability_of_precipitation`. Numeric forecast values are not copied here.
- Live ORS: not verified. This environment has no `ORS_API_KEY`, no alternate routing key, and no `apps/api/.env`. No ORS request was sent.
- `scripts/smoke-api.sh` was not run. This environment has no Docker and no local Postgres, so the script could not migrate or start the API. The live MET request above is the provider check. It was not replaced with a mock.

## Place search notes for PLACE-SEARCH-AVAILABILITY-001

This run did not change place search and did not reproduce the Arendal selection failure.

- `GET /location/places` returns provider id and labels only. Coordinates stay off that response.
- `POST /location/places/resolve` returns label, latitude, and longitude.
- `PlaceSearchField._select` catches `LocationProviderException` and also a generic failure that shows the localized search-failed text.
- A 200 ms focus-loss timer still hides suggestions.
- Directions failures log HTTP status, including 401/403 as authentication, and distinguish timeout from other network failures. Logs do not include the key or coordinates.

## Final control state

`REAL-DATA-ONLY-001` is completed and appended once to `consumed.md`. `active_id` is `PLACE-SEARCH-AVAILABILITY-001`. `handoff_state` is `authorized`. `handoff_generation` is 47. `promotion` stays `automatic`. `next-task.md` authorizes `PLACE-SEARCH-AVAILABILITY-001` with `Handoff-From: REAL-DATA-ONLY-001`. This run does not execute that ID.
