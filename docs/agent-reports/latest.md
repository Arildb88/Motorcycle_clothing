# Multi-activity platform, geo, weather, and monetization research

## Task

Planning and research only: shared RideWear platform versus activity-specific logic, Norway-first geo data, weather quality and a validation method, cycling / alpine-snowboard / cross-country plans, and a restrained ad strategy. No production feature, SDK, dependency, or schema change.

## Commit / PR

- Branch: `feature/multi-activity-research` from `dev_test` (`8bc74b5`)
- Research commit: `b57dc0a` — docs: research multi-activity platform, geo, weather, and ads
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/24 into `dev_test` only. Not merged to `dev` or `main`.

## Files changed

- `docs/product/RIDEWEAR_PLATFORM_PLAN.md`
- `docs/architecture/GEO_DATA_STRATEGY.md`
- `docs/research/WEATHER_DATA_QUALITY.md`
- `docs/product/CYCLING_PLAN.md`
- `docs/product/ALPINE_SNOWBOARD_PLAN.md`
- `docs/product/CROSS_COUNTRY_SKIING_PLAN.md`
- `docs/business/ADS_MONETIZATION_STRATEGY.md`
- `docs/agent-reports/latest.md`

## Tests / build

No documentation linter or docs test script exists in the repository. None was installed, and no test result is claimed. Application `npm test` / `npm run build` were not run because no application code changed.

## Architecture / config

No architecture, config, dependency, schema, or provider change was made. The documents recommend, for later review, keeping one Flutter app and one NestJS API, adding elevation as a port, passing ground height into MET, and leaving ads off.

## Manual testing recommended

None for this change. The documents are for reading. When implementation is later authorized, the weather document’s station comparison is the first empirical check, before any paid feed.

## Remaining issues

- Open-Meteo’s live euro price was not on the static pricing page fetched on 2026-10-01. Do not budget from secondary €29 / €99 claims until Stripe is checked.
- Sporet GPS tracks are not licensed for RideWear. OSM nordic and downhill coverage is incomplete.
- HeiGIT’s standard Directions quota is 2,000 requests/day. A busier app cannot assume the hosted free tier.
- MET is not sent an `altitude` today. Whether height changes a clothing tier is unmeasured.
- No accuracy scores were produced. Paid sources are not declared better.
- Hiking stays a reserved activity and was not planned here.
- Another implementation task was not started.
