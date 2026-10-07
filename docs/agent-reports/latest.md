# SHARED-GARMENT-CATALOG-001

## Task

`SHARED-GARMENT-CATALOG-001`, generation 43, authorized from idle by `b0c5f98a09a8c186276c8b75e9f384cf5176e2bc`. This run did not write a claim commit. The validated `next-task.md` token stayed the ownership record until this branch's final control state.

- Branch: `feature/shared-garment-catalog-001`
- Implementation commit: `d9e3d138bf824e09fdb24d6678df0e26c8eb8d26`
- Migration: `apps/api/prisma/migrations/20261007180000_garment_catalogue`
- PR: against `dev_test` only. Not merged to `dev` or `main`.

## Result

Searchable curated brand and model choices, plus "Other / write yourself". A personal garment name is kept and is not published. Catalogue identity is normalized brand + model + category + activity scope + heated flag + liner key + material key. Case and whitespace fold. Distinct models, generations, liners, heated variants, and motorcycle versus other activities stay separate. A name-only match is exact, category-scoped, and variant-scoped, and only against one curated name.

Warmth, wind, and water use the existing 1–5 scale. Five or more explicit contributions drop one lowest and one highest occurrence, then the mean of the rest is stored as a fraction and copied with half-up rounding. Below five, the existing preset or category default remains. Community values are estimates and the number shown is a contribution count, not a count of people. Breathability is unchanged.

Defaults apply only while creating a garment, and only for tiers the client did not set. The server looks up the catalogue even when the client did not fetch a preview. An explicit tier wins. Rename, edit, read, and recommendation do not refresh an existing garment. Deleting it and adding the same product again uses the current defaults.

Only an explicit rating is counted. Demo garments, seeds, copied defaults, and creating a garment do not add a count. A repeated submission id is ignored for 10 minutes in that API process. That is not unique-person deduplication. Out-of-range values are rejected. Histogram writes are one `INSERT ... ON CONFLICT` that adds the new counts. Trimming is not fraud resistance.

The additive table stores product identity and the fifteen score counts. It has no user id, garment id, free-text name, note, or contribution timestamp.

## Checks

- `npm test`: 350 passed
- `npm run build`: passed
- `npx prisma generate` and `npx prisma validate`: passed
- `npx prisma migrate deploy`: 3 migrations applied on local Postgres 16, including `20261007180000_garment_catalogue`
- `npx prisma migrate diff`: no difference
- Conflict increment on that database: two inserts of the same identity left one row and `warmth3 = 2`, then the row was deleted
- `flutter analyze`: no issues found
- `flutter test test/garment_catalogue_test.dart`: 6 passed
- Android and iOS were not run

## Limitations

Trimming one high and one low score does not identify distinct people and does not stop misuse. The submission guard is process-local and expires. Curated brands and models are a list of names, not verified manufacturer measurements. No backfill from existing wardrobes was done.

## Final control state

`SHARED-GARMENT-CATALOG-001` is completed and appended once to `consumed.md`. `active_id` is `none`. `handoff_state` is `idle`. `handoff_generation` is 43. `promotion` stays `automatic`. `next-task.md` is the idle body with `Authorization: none`. No other ID is authorized.
