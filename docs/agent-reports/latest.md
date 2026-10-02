# INTEGRATION-001 activity foundation integration pass

## Task

`INTEGRATION-001`, generation 11, from-idle authorization on `dev_test` commit `95da14fe70e7506e6f68823c1299f234e0d6d69e`. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/integration-001-regression-pass`
- Implementation: `539f1de27e62201a51de285041a26eca407c200f`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/44 into `dev_test` only. Not merged to `dev` or `main`.

## Implementation

No product feature was added. The pass checked the completed cycling, alpine/snowboard, cross-country, route/weather/elevation, recommendation, and mobile ad-policy foundations together.

- `apps/api/src/recommend/activity-foundations.integration.spec.ts` runs one `RecommendService` through motorcycle, cycling, alpine skiing, snowboarding, and cross-country. Personal offsets are read only for motorcycle. Road routing is drive, then cycling, and is not called for alpine or cross-country. Each weather request keeps that activity's elevation, including a missing cross-country height and an alpine summit that is not given the base height.
- Activity types with engines are asserted in `apps/api/src/domain/enums.spec.ts`.
- Planner analysis was reading `name`, which the engines do not send. It now uses the existing `kitLine` helper (`garmentName` / `genericLabel`). The result screen still has no ad slot.
- `apps/mobile/lib/l10n/app_localizations_nb.dart` was regenerated from `app_nb.arb`. The committed generated file had drifted from that source. Two Flutter expectations now match the shipped Norwegian strings.

## Final control state

Promotion is automatic. The first queued unconsumed item is authorized. This run does not execute it.

- `INTEGRATION-001` completed and appended once to `consumed.md`
- `MOBILE-ACTIVITIES-001` is `active`
- `active_id: MOBILE-ACTIVITIES-001`
- `promotion: automatic` unchanged
- `handoff_generation: 12`
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `MOBILE-ACTIVITIES-001`, Generation 12, Handoff-From `INTEGRATION-001`, Authorization `authorized`, Promoted `2026-10-02T12:37:11Z`

## Checks

API, in `apps/api`:

- `npx prisma generate` — Prisma Client 5.22.0
- `npx jest --no-coverage` — 29 suites, 191 tests passed
- `npx tsc --noEmit -p tsconfig.build.json` — passed
- `npm run build` — passed
- `npx eslint src/recommend/activity-foundations.integration.spec.ts` — passed
- `npx eslint "src/**/*.ts" "test/**/*.ts"` — 413 pre-existing problems (398 errors, 15 warnings) across the existing tree. This pass did not rewrite those files. There is no separate `typecheck` script; `tsc --noEmit` and `nest build` are the typecheck.

Flutter, in `apps/mobile`, Flutter 3.47.5 / Dart 3.13.4:

- `flutter analyze` — no issues
- `flutter test` — 68 tests passed

Live MET, Kartverket, and OpenRouteService were not required. Provider failures in existing mocked tests stayed on the mock path.

## Architecture / config

No new dependency, provider, paid service, schema change, or secret. `dev` and `main` were not modified.

## Remaining

- Repository-wide API eslint still fails on pre-existing files. Cleaning that is a broad formatting change and was not part of this task.
- Mobile activity selection still exposes motorcycle, hiking, and cycling only. Connecting alpine and cross-country in the planning UI is `MOBILE-ACTIVITIES-001`.
- Ads stay off unless `ADS_ENABLED` is set. The recommendation result screen does not request a slot.
