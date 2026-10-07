# Authorized RideWear Task
## Type: BUG_FIX
## ID: REAL-DATA-ONLY-001
## Generation: 46
## Handoff-From: COMMUTE-ROUNDTRIP-001
## Authorization: authorized
## Promoted: 2026-10-07T20:25:08Z
## Task: Real provider data only in app runtime; remove silent simulated fallbacks

Arild explicitly authorized this change on 2026-10-07: no mock data in the running app; use real data so actual provider problems can be diagnosed.

Requirements:
- Make MET the default runtime weather provider. Remove runtime mockWeather paths, implicit non-met -> mock selection, and catch/empty-payload fallback to synthetic weather from WeatherService and all normal app flows.
- Update .env.example, compose/runtime examples and startup docs to real MET configuration. An existing WEATHER_PROVIDER=mock or unknown provider must produce an actionable explicit configuration error, never simulated data. Explain how existing local .env must be changed; do not overwrite secrets.
- Keep test doubles only inside isolated tests, never selectable as a normal app provider. Do not call live services from every unit test.
- Provider failure, empty/invalid forecast, out-of-range requested time and missing required measurements must return explicit weather-unavailable/partial status. Never invent 0 temperature/rain/wind for missing values or dress the rider using fabricated conditions. Preserve valid zero readings.
- Recommendations depending on unavailable weather must not masquerade as a complete valid recommendation. Display readable nb/en retry/error states, including which commute leg is unavailable. Do not substitute another time/location's forecast.
- Track actual source/forecast valid time on usable results; configuration label "met" is not proof of successful retrieval.
- Remove/reject legacy cached synthetic weather (including synthetic points previously stored under met keys) using a cache format/namespace change or another bounded safe invalidation. Never flush unrelated user data or rewrite historical snapshots; preserve past records without claiming they were real.
- Inspect normal location/routing service creation for fake autocomplete/geometry and NullRoutingAdapter estimates. Normal app route/search analysis must use configured real ORS; provider/configuration failures must be explicit, not fake places, straight-line simulated road routes or assumed travel times presented as provider results. Keep deliberate manual coordinates available if already supported, with honest limits. Test-only fakes remain isolated.
- User says ORS is configured locally. Do not copy the key from chat, print secrets or assume the shown abbreviated value is the full key. Diagnose provider authentication/status/timeouts via sanitized logs. Existing PLACE-SEARCH-AVAILABILITY-001 handles detailed search fixes; avoid duplication and record findings for it.
- Real MET needs identifying contact User-Agent; use existing valid project/contact configuration. No new provider, credentials, dependency, schema migration, paid service or deployment.

Quota-conscious verification:
- Run API production build once and focused tests proving no synthetic fallback on missing/invalid config, MET timeout/empty/missing fields/out-of-range, cache version isolation, and honest route-provider failures.
- Flutter analyze once and focused tests for changed unavailable/partial states. No full suites, repeated builds or native builds unless a concrete regression warrants them.
- One real provider smoke check when existing authorized credentials/network permit; report precisely whether live MET/ORS was verified. Missing credentials/network must not be hidden by mocks. Follow blocker rules for required unavailable checks.
- Dedicated fix branch from latest dev_test; PR to dev_test only, merge after required checks pass. Keep dev/main untouched. Follow queue completion/blocker rules, update docs/agent-reports/latest.md and stop after this ID.
