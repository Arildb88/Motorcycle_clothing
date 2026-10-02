# Supabase deployment readiness

## Task

`DB-SUPABASE-002`. Prepare the PostgreSQL setup for a first manual Supabase deployment. Authorized by `41d2aa40c618c88d226b2a49222dfa8f56dbe5a3`.

## Entry check

Trigger commit `41d2aa40c618c88d226b2a49222dfa8f56dbe5a3` (`chore(agent): retrigger active queue task`, GitHub user `Arildb88`) changed only `docs/agent-control/next-task.md` (`Promoted`).

- `paused` was `false`.
- Type was `IMPLEMENTATION`. ID was `DB-SUPABASE-002`.
- That ID had no row in `consumed.md`.
- It was the only Queue item with status `active`.
- `active_id` was `DB-SUPABASE-002`.
- No item was `blocked`.
- `next-task.md` matched that item's promotable body except `Promoted: 2026-10-02T09:12:00Z`.

The entry check succeeded.

## Completed work

- Operator runbook: `docs/operations/SUPABASE_FIRST_DEPLOY.md`. It documents `DATABASE_URL` versus `DIRECT_URL`, session pooler versus the direct migration host, the migrate commands, the empty-public preflight, rollback, and the operator steps.
- Static check: `scripts/check-supabase-readiness.sh`. It checks the Prisma datasource, the PostgreSQL migration lock, the baseline SQL shape, and that committed database URLs stay on local Postgres 16. It does not open a network connection, a database, or `.env`.
- `README.md`, `SECURITY.md`, `ARCHITECTURE.md`, and the migration plan now point at that runbook. Stale "local SQLite now" lines in `ARCHITECTURE.md` match the PostgreSQL provider switch from `DB-POSTGRES-001`.
- `.env.example` comments state the two variable roles. The Dockerfile comment states that startup `migrate deploy` needs `DIRECT_URL` on port 5432.

## Commit / PR

- Branch: `feature/supabase-deployment-readiness` from `dev_test` at `41d2aa40c618c88d226b2a49222dfa8f56dbe5a3`.
- Implementation commit: `d3ffce5b17760458fb633a7f0d7ce957992834ff` — docs(api): document Supabase first-deploy readiness
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/31
- Merge target: `dev_test` only. `dev` and `main` are not modified.

## Files changed

- `docs/operations/SUPABASE_FIRST_DEPLOY.md`
- `scripts/check-supabase-readiness.sh`
- `docs/architecture/SUPABASE_POSTGRES_MIGRATION_PLAN.md`
- `ARCHITECTURE.md`
- `SECURITY.md`
- `README.md`
- `apps/api/.env.example`
- `apps/api/Dockerfile`
- `docs/agent-control/task-queue.md`
- `docs/agent-control/consumed.md`
- `docs/agent-control/next-task.md`
- `docs/agent-reports/latest.md`

## Tests / checks actually run

1. `bash -n scripts/check-supabase-readiness.sh`
2. `scripts/check-supabase-readiness.sh --self-test` passed. That run checks URL rejection for a hosted host, port 6543, and `pgbouncer`, then checks the repository tree.

## Tests intentionally not repeated

No `npm test`, `npm run build`, `scripts/smoke-api.sh`, or GitHub `api-ci`. `DB-POSTGRES-001` already ran those against local Postgres 16, and this task does not change schema, application code, or that workflow. No Flutter test, Flutter analyze, or mobile build. No `prisma migrate deploy`. No connection to the hosted Supabase database.

## Architecture / config

No schema, dependency, provider, package, or Data API change. Prisma stays the only database client. Hosted credentials are not in git. `promotion` stays `automatic`, as set by `Arildb88`. This run did not change that flag.

## Fallback

None. The required check is static and did not need Docker, Postgres, or the hosted project.

## Manual validation needed

An operator follows `docs/operations/SUPABASE_FIRST_DEPLOY.md`: turn the Data API off, create the `prisma` role with an uncommitted password, confirm IPv6 or the IPv4 add-on before using the direct host, run the empty-public query, then `npx prisma migrate deploy` with URLs that stay outside git. After apply, `public` should show the baseline tables and `_prisma_migrations`, and `Garment.isDemo` should be boolean, not null, default false.

## Queue

`DB-SUPABASE-002` is `completed` and appended to `consumed.md`. `active_id` is `GEO-ELEVATION-002`. That item was the first queued, unconsumed item and is now `active`. `next-task.md` is its promotable body with `Promoted: 2026-10-02T09:14:47Z`. It was not implemented in this run.

## Remaining issues

- Hosted Supabase apply is still a manual operator step.
- `GEO-ELEVATION-002` is active and was not started.
- Later queued items were not promoted.
