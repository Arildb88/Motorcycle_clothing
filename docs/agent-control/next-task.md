# Authorized RideWear Task

## Type: RESEARCH / MIGRATION ANALYSIS ONLY

## Task: Plan SQLite -> Supabase PostgreSQL migration

Prepare the safest minimal migration plan for moving the existing RideWear NestJS/Prisma persistence layer from local SQLite to the already-created Supabase PostgreSQL project.

Read first:
- `docs/agent-control/guardrails.md`
- `docs/agent-reports/latest.md`
- current `apps/api/prisma/schema.prisma`
- all existing Prisma migrations and relevant API database configuration

### Architecture that must remain

Flutter -> NestJS API -> Prisma -> PostgreSQL (Supabase)

Do not introduce direct Flutter-to-Supabase database access.
Do not add `@supabase/supabase-js` merely for database access.
Prisma/NestJS remain the application database boundary.

### Investigation

Produce a concrete evidence-based plan covering:
- current Prisma models, relations, indexes, constraints and migration history
- SQLite-specific schema/migration SQL that needs PostgreSQL treatment
- recommended PostgreSQL Prisma datasource/config changes
- correct roles of `DATABASE_URL` and, if appropriate for the installed Prisma version/setup, `DIRECT_URL`
- Supabase pooled vs direct connection usage for runtime and migrations
- how local development should work after migration
- how to create a clean PostgreSQL baseline without replaying incompatible SQLite SQL
- treatment of the new `Garment.isDemo` field
- auth/password-reset/user data implications
- existing data migration considerations (assume Supabase is currently empty; do not invent a need to migrate disposable local dev data)
- rollback/recovery approach
- secret handling: what belongs in local/host environment only and must never be committed
- exact minimal implementation sequence for a later authorized task
- focused verification needed after conversion

### Cursor-capacity rule

Do not rerun broad test suites merely to reconfirm the already-green current `dev_test` state.

This is analysis-only. Do not run `npm test`, `flutter test`, `flutter analyze`, full builds, or smoke tests unless a specific investigation step truly requires execution. Prefer static inspection of schema, migrations, config and existing recent test/report evidence.

For the later implementation plan, recommend targeted tests/checks first and only the minimum broader verification needed for database-sensitive changes. Avoid duplicate tests that provide no new evidence.

### Deliverable

Create/update:
`docs/architecture/SUPABASE_POSTGRES_MIGRATION_PLAN.md`

The document must include:
1. Current state
2. Compatibility findings
3. Target architecture/config
4. Migration/baseline strategy
5. Secrets/environment strategy
6. Local development strategy
7. Implementation sequence
8. Minimal verification strategy
9. Rollback/recovery
10. Risks/open questions

Update `docs/agent-reports/latest.md` with a concise summary of findings and the exact next implementation recommendation.

### Explicitly out of scope

- No Prisma datasource/provider change yet.
- No schema or migration changes.
- No connection to the user's Supabase database.
- No database credentials/secrets.
- No Supabase CLI setup.
- No package/dependency changes.
- No production code changes.
- No Data API/client SDK.
- No auth redesign.
- No Flutter changes.
- Do not modify `dev` or `main`.

### Completion

Work from latest `dev_test` on a focused `feature/*` branch.
Because this is documentation/research only, do not spend capacity on unrelated tests.
Open/merge successful documentation work only to `dev_test` according to guardrails.
Update the report, then STOP. Do not begin the PostgreSQL implementation.
