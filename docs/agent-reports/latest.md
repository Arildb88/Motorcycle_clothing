# WEATHER-VALIDATION-001 weather validation harness

## Task

`WEATHER-VALIDATION-001`, generation 14, authorized by the automatic final control update on `dev_test` commit `a5b366bab5773f1b374485b96a30d090997ca3b6`. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/weather-validation-001-harness`
- Implementation: `81aa48a2b6ac9bf9b0a6cf7aa5a019c040e06847`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/47 into `dev_test` only. Not merged to `dev` or `main`.

## Implementation

`apps/api/src/weather/validation/` shapes paired weather rows and computes the measurements in `docs/research/WEATHER_DATA_QUALITY.md` §11 from readings the caller already has.

- Latitude and longitude are truncated toward zero to 4 decimals. Elevation is rounded to integer metres. A row that misses its declared lead bucket (`h1`, `h6`, or `next_morning`) is dropped. `next_morning` uses Europe/Oslo civil time.
- Providers for one case must be fetched inside 15 minutes. Elevation-matched error requires `elevation_sent` and the same integer height.
- Station observations join only at that same coordinate and height. Route and resort observations join only within 5 km and 50 m.
- Temperature MAE and mean bias require 2 m temperatures. Wind MAE requires 10 m wind. Precipitation occurrence uses the motorcycle 0.3 mm cut and 1-hour amounts. Probability is not substituted for amount.
- Warmth-tier disagreements use `motorcycleExposureC` and `warmthDemandFromExposureC` with personal bias 0. The stop-rule comparison counts only cases where the baseline and the candidate are both eligible.
- Coverage counts an empty series or HTTP failure as a miss. Latency p50 and p95 use supplied successful durations. A five-call route batch is the sum of five successes.
- Provider-versus-MET temperature difference is labeled disagreement, not accuracy. A stratum is reportable for the stop rule only at 30 or more overlapping observation-paired rows.
- Every report sets `empiricalTrial: false` and `adoption: withheld`, including when fixture numbers meet every stop-rule clause.

Section 12 of `docs/research/WEATHER_DATA_QUALITY.md` records these measurements. No empirical score was added.

## Final control state

Promotion is automatic. The first queued unconsumed item is authorized. This run does not execute it.

- `WEATHER-VALIDATION-001` completed and appended once to `consumed.md`
- `MVP-SMOKE-001` is `active`
- `active_id: MVP-SMOKE-001`
- `promotion: automatic` unchanged
- `handoff_generation: 15`
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `MVP-SMOKE-001`, Generation 15, Handoff-From `WEATHER-VALIDATION-001`, Authorization `authorized`, Promoted `2026-10-02T13:12:57Z`

## Checks

Node 22, in `apps/api`:

- `npx jest src/weather/validation/harness.spec.ts --runInBand --no-coverage` — 18 tests passed
- `npx tsc -p tsconfig.build.json --noEmit` — passed
- `npx eslint src/weather/validation/**/*.ts` — passed

Live MET, Frost, Open-Meteo, and WeatherKit were not called. The full API suite and Flutter checks were not required for this harness.

## Architecture / config

No new dependency, provider, paid service, schema change, or secret. `WeatherService` and `WEATHER_PROVIDER` are unchanged. Recommendation ranking is unchanged. `dev` and `main` were not modified.

## Remaining

- The harness does not run a live trial and does not adopt a provider.
- Frost element ids and station metadata are still an open question. The caller must supply the observation.
- Price, commercial terms, monetization fit, and the frozen engine commit are caller inputs. The harness does not look them up.
- `MVP-SMOKE-001` is authorized for a later run.
