# WEATHER-PROVIDER-RESEARCH-002 weather-provider comparison protocol

## Task

`WEATHER-PROVIDER-RESEARCH-002`, generation 9, automatic handoff from `XC-SKI-001` on `dev_test` range `a4e4c249cc48aca14b526633eb0cdd99163a1b4d..052af2cce0cc20119380e1b05571c7a4dc9899a6`. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/weather-provider-research-002`
- Implementation: `3bb5f5b72cd7c951896011374396c6f3d9d20037`
- PR: pending into `dev_test` only. Not merged to `dev` or `main`.

## Implementation

Research and documentation only. `docs/research/WEATHER_DATA_QUALITY.md` now has a pre-registered comparison protocol.

- Every scored row uses the same coordinate truncated to 4 decimals, the same ground elevation in whole metres, and the same valid time.
- Lead buckets are 1 hour, 6 hours, and next morning in Europe/Oslo. Providers for one case are fetched inside 15 minutes.
- MET Locationforecast is the baseline. Error is temperature MAE and bias, 10 m wind MAE, precipitation occurrence at the existing 0.3 mm motorcycle threshold, and motorcycle demand-tier mismatches against an observation.
- Coverage, server-side latency, and cost are separate columns. Cost uses only an official price.
- Eligible candidates on 2026-10-02: Open-Meteo, because the licence, call caps, and `elevation` parameter are on the vendor's pages, and Apple WeatherKit, because the USD call ladder is published. WeatherKit has no documented caller elevation, so those rows stay out of the elevation-matched score.
- Meteomatics has no official list price. meteoblue documents `asl` and credits, but the fetched pricing page did not bind €2,400 per year to one call volume. Both stay out of the trial set.
- Open-Meteo's official pricing page still has no euro or dollar amount. The free tier remains non-commercial. No provider is ranked. No score was produced.

The live recommend path already sends MET `altitude` when a sample has a height. The note no longer says that call is latitude and longitude only.

## Final control state

Promotion is automatic. This branch completes `WEATHER-PROVIDER-RESEARCH-002` and authorizes the next queued item.

- `WEATHER-PROVIDER-RESEARCH-002` completed and appended once to `consumed.md`
- `ADS-001` active
- `active_id: ADS-001`
- `promotion: automatic` unchanged
- `handoff_generation: 10` (generation 9 plus 1)
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `ADS-001`, Generation 10, Handoff-From `WEATHER-PROVIDER-RESEARCH-002`, Authorization `authorized`
- This run does not implement `ADS-001`

## Checks

No production code changed. No API tests, Flutter tests, build, or live forecast calls were run. The task asks for research documentation and says to minimize tests.

Official pages re-read on 2026-10-02: MET terms, Open-Meteo terms, pricing, and forecast docs, Apple WeatherKit, Meteomatics pricing, and meteoblue forecast overview and pricing. No API key was created and no checkout was opened.

## Architecture / config

No new dependency, provider, paid service, schema change, or `WEATHER_PROVIDER` default. No secrets. `dev` and `main` were not modified.

## Remaining

- The protocol is not a trial. There are no error numbers.
- Frost element ids are still unread. A later authorized trial has to read the catalogue before joining observations.
- Open-Meteo euro price, WeatherKit elevation, and a meteoblue volume-bound price remain unverified.
- Station density above 1,000 m in southern Norway is unknown.
