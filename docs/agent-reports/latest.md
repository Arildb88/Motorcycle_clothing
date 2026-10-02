# PostgreSQL Prisma foundation

## Task

`DB-POSTGRES-001`. Switch Prisma from SQLite to PostgreSQL 16 and add one reviewed baseline. Authorized by `f9774f4cb443f15a652e64ca00d271af908dc2c0`.

## Entry check

Trigger commit `f9774f4cb443f15a652e64ca00d271af908dc2c0` (`chore(agent): start PostgreSQL queue`, GitHub user `Arildb88`) changed only `docs/agent-control/next-task.md`.

- `paused` was `false`.
- Type was `IMPLEMENTATION`. ID was `DB-POSTGRES-001`.
- That ID had no row in `consumed.md`.
- It was the only Queue item with status `active`.
- `active_id` was `DB-POSTGRES-001`.
- No item was `blocked`.
- `next-task.md` matched that item's promotable body except `Promoted: 2026-10-02T08:30:00Z`.

The entry check succeeded.

## Completed work

- Prisma datasource is `postgresql` with `directUrl = env("DIRECT_URL")`. Models, including `Garment.isDemo`, were not edited.
- SQLite history is archived at `apps/api/prisma/migrations_sqlite/`. Prisma Migrate does not apply it.
- One baseline, `apps/api/prisma/migrations/20261002120000_postgres_baseline/migration.sql`, was generated with `prisma migrate diff --from-empty --to-schema-datamodel` and was not hand-edited.
- Baseline review: no `PRAGMA`, `DATETIME`, or `REAL`. `Garment.isDemo` is `BOOLEAN NOT NULL DEFAULT false` inside `CREATE TABLE "Garment"`. Foreign keys, unique indexes, and secondary indexes from the migration plan are present. `AuthProvider`, `Profile`, `ComfortSettings`, and `RideFeedback` are not created. `ActivityPlan.routeId` and `ActivityLog.planId` / `routeId` use `ON DELETE SET NULL`. Other foreign keys cascade.
- Local development, Docker Compose, `scripts/smoke-api.sh`, and `api-ci` use Postgres 16. `DATABASE_URL` and `DIRECT_URL` are the same unpooled local database. The compose `api` service uses hostname `postgres`.
- README, QUICKSTART, and the SECURITY local-stage row describe local Postgres. `DIRECT_URL` is listed as API-only.
- The Dockerfile still runs `prisma migrate deploy` before the server. The image build sets local placeholder URLs so `prisma generate` can read the datasource. Runtime `DIRECT_URL` comes from the container environment.

## Commit / PR

- Branch: `feature/sqlite-to-supabase-postgres` from `dev_test` at `f9774f4cb443f15a652e64ca00d271af908dc2c0`.
- Implementation commit: `ea2f350b9ae00bb5e5ef041fc2a523ffc52c0087` — feat(api): switch Prisma to PostgreSQL 16
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/30
- Merge: fast-forward into `dev_test` only. `dev` and `main` are not modified.

## Files changed

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20261002120000_postgres_baseline/migration.sql`
- `apps/api/prisma/migrations/migration_lock.toml`
- `apps/api/prisma/migrations_sqlite/` (archived SQLite history)
- `apps/api/.env.example`
- `apps/api/.env.test`
- `apps/api/Dockerfile`
- `docker-compose.yml`
- `scripts/smoke-api.sh`
- `.github/workflows/api-ci.yml`
- `README.md`
- `QUICKSTART.md`
- `SECURITY.md`
- `docs/agent-control/task-queue.md`
- `docs/agent-control/consumed.md`
- `docs/agent-control/next-task.md`
- `docs/agent-reports/latest.md`

## Tests / checks actually run

1. Read the generated baseline against the section 4 checklist.
2. `docker compose up -d postgres` (Postgres 16), then from `apps/api`: `npx prisma migrate deploy` and `npx prisma generate` on an empty database. Deploy applied `20261002120000_postgres_baseline`. `\dt` showed the baseline tables plus `_prisma_migrations`. `Garment.isDemo` is `boolean NOT NULL DEFAULT false`.
3. `npm test` in `apps/api`: 21 suites, 136 tests passed.
4. `npm run build` in `apps/api` passed.
5. `scripts/smoke-api.sh` once with `SMOKE_SKIP_UNIT=1` and `SMOKE_SKIP_BUILD=1` against local Postgres. Passed, including demo wardrobe `isDemo` and personal-garment retention.
6. GitHub `api-ci` on `ea2f350b9ae00bb5e5ef041fc2a523ffc52c0087`: push run `36987602907` and pull-request run `36987636137` both succeeded.

## Tests intentionally not repeated

No Flutter test, Flutter analyze, or mobile build. The provider switch does not change the client. No second smoke with unit tests and build enabled, because those already passed. No hosted Supabase connection and no `migrate deploy` against it.

## Architecture / config

Prisma stays the only database client. No package upgrade, `@supabase/supabase-js`, Data API, RLS policy, Prisma 7, `prisma.config.ts`, or `@prisma/adapter-pg`. JSON columns stay text. No SQLite file was copied. `promotion` stays `automatic`, as set by `Arildb88` in `6741f5fae397374c8acc4445de92836aeb1afb16`. This run did not change that flag.

## Fallback

Docker was not installed at the start of the run. Docker and the `postgres:16` image were installed locally so `docker compose up -d postgres` could run. The hosted Supabase project was not used.

## Manual validation needed

An operator confirms `public` has no application tables, then runs `prisma migrate deploy` against the hosted session or direct URL. That URL stays outside git. CI does not apply the baseline to Supabase. After apply, `\dt` in `public` should show the baseline tables and `_prisma_migrations`, and `Garment` should have `isDemo`.

## Queue

`DB-POSTGRES-001` is `completed` and appended to `consumed.md`. `active_id` is `DB-SUPABASE-002`. That item was the first queued, unconsumed item and is now `active`. `next-task.md` is its promotable body with `Promoted: 2026-10-02T09:07:00Z`. It was not implemented in this run.

## Remaining issues

- Hosted Supabase apply is still a manual operator step.
- `DB-SUPABASE-002` is active and was not started.
- Later queued items were not promoted.
