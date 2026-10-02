# SQLite to Supabase PostgreSQL migration plan

## Task

Research and migration analysis only. Produce the smallest safe plan for moving NestJS/Prisma from local SQLite to the existing Supabase PostgreSQL project. No provider switch, schema change, connection, or package change was made.

## Findings

The live datasource is SQLite (`apps/api/prisma/schema.prisma`, `migration_lock.toml` provider `sqlite`). Prisma is 5.22.0. Nine migrations build the current models. Two of them use `PRAGMA` and one rebuilds `UserProfile` with SQLite's copy/drop/rename pattern, so the history cannot be replayed on PostgreSQL. The schema models themselves are portable: strings, booleans, ints, floats, datetimes, cascades, and `cuid()` ids. JSON payloads are `String` columns, not `Json`. There is no raw SQL.

`Garment.isDemo` is already `Boolean @default(false)`. A PostgreSQL baseline should create that column with the table. Do not replay `20261002100000_garment_is_demo`, and do not backfill. Client write protection stays in the API.

Supabase is the host. NestJS stays the only database client. For Prisma 5.22, declare `url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")` in `schema.prisma`. Do not copy the current Supabase quickstart's Prisma 7 pieces (`prisma.config.ts`, `@prisma/adapter-pg`, `--to-schema`). This API is long-lived, so use a session connection (pooler port 5432, or direct port 5432 when IPv6 or the IPv4 add-on is confirmed). Do not use transaction mode port 6543.

Local development and CI should use the existing Postgres 16 compose pattern, with both URLs set to that database. Supabase credentials stay in the host environment and are never committed. Assume the hosted database is empty. Do not load disposable SQLite files into it.

The exact sequence, SQL review checks, operator role, rollback, and verification order are in `docs/architecture/SUPABASE_POSTGRES_MIGRATION_PLAN.md`.

## Next implementation recommendation

One later task, only after a new `next-task.md` authorizes it:

1. Change the Prisma datasource to `postgresql` and add `directUrl`. Do not edit models.
2. Archive `prisma/migrations` to `prisma/migrations_sqlite` and add one baseline from `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`.
3. Point local env examples, Docker, smoke, and `api-ci` at Postgres 16 with `DATABASE_URL` and `DIRECT_URL`. Do not commit a Supabase URL.
4. Verify by reading the baseline SQL, `migrate deploy` on empty local Postgres, `npm test`, `npm run build`, and one smoke run. No Flutter tests.
5. The operator runs `migrate deploy` against Supabase only after those checks pass and after confirming `public` is empty.

Do not start that work from this report.

## Commit / PR

- Branch: `feature/supabase-postgres-migration-plan` from `dev_test` (`069e29c663eb1af51d20f10657f035a0df73166f`)
- Plan commit: `08c48276fe04b9c87dcc02dd4567a48f15a064bb` — docs: plan SQLite to Supabase PostgreSQL migration
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/27
- Merge: fast-forward into `dev_test` only. `dev` and `main` are unchanged. The `dev_test` tip is the commit that adds this PR and merge record.
- Required checks: none. This task is documentation-only and forbids the test suites. `api-ci` does not run for `docs/` changes.

## Files changed

- `docs/architecture/SUPABASE_POSTGRES_MIGRATION_PLAN.md`
- `docs/agent-reports/latest.md`

## Tests / build / smoke

Not run. `next-task.md` forbids `npm test`, `flutter test`, `flutter analyze`, builds, and smoke for this analysis. No production code changed, so there is no new behavior to verify. `api-ci` path filters do not include `docs/`, so this documentation PR does not start that workflow.

## Architecture / config

No datasource, schema, migration, dependency, or secret change. Decision recorded for the later task: Prisma 5.22 `directUrl`, session pooler for hosted runtime, local Postgres 16 for development and CI, one PostgreSQL baseline, SQLite history archived and not applied.

## Fallback

The current SQLite app remains the running path. If this document is wrong about an empty Supabase project, the later task stops before `migrate deploy` instead of copying local databases or resetting the project.

## Manual validation recommended

None for this document. Before a later hosted apply, the operator checks IPv4 versus IPv6, that the Data API can stay off, and that `public` has no application tables.

## Remaining issues

- PostgreSQL is not implemented.
- Local instructions and CI still describe and use SQLite.
- `docker-compose.yml` already sets a Postgres `DATABASE_URL` that does not match the SQLite schema.
- Hosted region, IPv4 add-on, and existing `public` objects are unknown and were not queried.
