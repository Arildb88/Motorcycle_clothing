# DEPARTURE-COMPARE-001

## Task

`DEPARTURE-COMPARE-001`, generation 32, authorized by the automatic final control update that completed `UX-POLISH-001`. The parent tip held that token at generation 31 with `UX-POLISH-001` active. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/departure-compare-001`
- Implementation commit: `3cf1b110f45852a925521eb2895a478a470136fd`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/62 into `dev_test` only. Not merged to `dev` or `main`.

## Result

Route activities can compare a few nearby departure times. The chosen departure stays labeled. Nothing is ranked as best.

- Motorcycle, cycling, and cross-country reuse the route samples already built for the recommendation. Only the sample clock moves.
- Two to four nearby hours are shown. A past hour is omitted unless it is the chosen departure.
- Each row shows temperature, rain probability, precipitation, and wind, plus the forecast time those figures apply to.
- A time outside the published forecast stays unavailable. Missing sample times are listed. Mock weather does not pretend the hours differ.
- One MET locationforecast covers every departure at a place. The existing per-hour cache is filled for in-range samples so the chosen departure is not fetched again.
- Alpine and snowboard stay site forecasts and do not show the comparison.

## Checks

API, focused:

- `departure-compare`, `met-timeseries`, `weather.service`, and `alpine-recommend` — 23 tests passed
- `nest build` passed

Flutter, in `apps/mobile`:

- `flutter analyze` — no issues
- `flutter test test/ride_analysis_result_test.dart` — 7 tests passed

Android, iOS, and a live MET call were not run.

## Architecture / config

Flutter -> NestJS -> provider stays the same. Secrets stay server-side. No new provider, dependency, schema migration, or paid service. `dev` and `main` were not modified.

## Final control state

Promotion is automatic. The first queued unconsumed item is authorized. This run does not execute it.

- `DEPARTURE-COMPARE-001` completed and appended once to `consumed.md`
- `RECOMMENDATION-EXPLAIN-001` is active
- `active_id: RECOMMENDATION-EXPLAIN-001`
- `promotion: automatic` unchanged
- `handoff_generation: 33`
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `RECOMMENDATION-EXPLAIN-001`, Generation 33, Handoff-From `DEPARTURE-COMPARE-001`, Authorization `authorized`

## Remaining

A device pass of the comparison block was not run. `RECOMMENDATION-EXPLAIN-001` is authorized for a later run. This run stops after merge.
