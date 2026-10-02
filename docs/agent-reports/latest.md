# WARDROBE-SHARING-001

## Task

`WARDROBE-SHARING-001`, generation 26, authorized by the automatic final control update that completed `ALPINE-SNOWBOARD-UNIFY-001`. The parent tip was generation 25, `handoff_state: authorized`, `active_id: ALPINE-SNOWBOARD-UNIFY-001`. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/wardrobe-sharing-001`
- Implementation commit: `89d11e52a7ca074f05ac245d3aa8b5fd171155f3`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/57 into `dev_test` only. Not merged to `dev` or `main`.

## Result

Motorcycle clothes stay in their own wardrobe. A motorcycle garment cannot be tagged for another activity, and a non-motorcycle garment cannot be used by a motorcycle recommendation. Sharing is not a checkbox that can turn that boundary off.

Cycling, alpine and snowboard, and cross-country skiing can share personal clothes in a combination the user chooses. Alpine skiing and snowboarding are one wardrobe category. One garment record stores that membership. Sharing two or more categories makes a personal garment available to the others without copying it. One checked category, or none, leaves those wardrobes separate.

Demo clothes follow the selected activity. Seeding and removal are idempotent for that category. A shared personal wardrobe does not pull another activity's demo set into the list or the recommendation. Replacing demo clothes does not delete personal garments. Hiking has no wardrobe and is not a sharing choice.

Recommendations use only garments available to the selected activity. Existing engines are unchanged. A personal garment shared into an activity is presented to that engine with the activity's tags in memory only.

## Checks

API, in `apps/api`:

- `npx prisma validate` — schema valid
- `npx prisma generate` — Prisma Client 5.22.0
- `npx prisma migrate deploy` on empty local PostgreSQL 16 — applied `20261002120000_postgres_baseline` and `20261002195500_wardrobe_category_sharing`
- `npx prisma migrate diff --from-migrations --to-schema-datamodel --exit-code` — no difference
- `npm test` — 35 suites, 246 tests passed

Flutter 3.47.6 / Dart 3.13.5, in `apps/mobile`:

- `flutter analyze` — no issues
- `flutter test` — 119 tests passed

Android, iOS, and live providers were not run.

## Architecture / config

Flutter -> NestJS -> provider stays the same. Secrets stay server-side. No new provider, dependency, or paid service. `dev` and `main` were not modified.

Persistence is one additive `UserProfile.sharedWardrobeCategoriesJson` column, default `[]`. Existing garments keep their activity tags. Motorcycle garments are not rewritten as generic clothes.

## Final control state

Promotion is automatic. The first queued unconsumed item is authorized. This run does not execute it.

- `WARDROBE-SHARING-001` completed and appended once to `consumed.md`
- `TEST-COVERAGE-001` is active
- `active_id: TEST-COVERAGE-001`
- `promotion: automatic` unchanged
- `handoff_generation: 27`
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `TEST-COVERAGE-001`, Generation 27, Handoff-From `WARDROBE-SHARING-001`, Authorization `authorized`

## Remaining

Device and live-provider checks were not run. `TEST-COVERAGE-001` is authorized for a later run. This run stops after merge.
