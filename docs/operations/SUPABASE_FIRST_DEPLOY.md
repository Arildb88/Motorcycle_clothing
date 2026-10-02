# First manual Supabase deployment

Operator runbook for the first hosted apply of the PostgreSQL baseline. This does not connect to Supabase, and CI must not either.

Prisma remains the only database client. Do not add `@supabase/supabase-js`, the Data API, a service-role key, or an anon key.

`scripts/check-supabase-readiness.sh` is a static check. It does not connect to a database and does not read `.env`.

## Environment variable roles

| Variable | Reader | Local Docker and CI | Hosted runtime | Hosted Migrate |
|---|---|---|---|---|
| `DATABASE_URL` | Prisma Client in the NestJS process | Unpooled Postgres 16, port 5432. Same value as `DIRECT_URL`. See `apps/api/.env.example`. | Session pooler, port 5432, `sslmode=require` | Not used for Migrate when `DIRECT_URL` is set |
| `DIRECT_URL` | Prisma Migrate (`migrate deploy`) and introspection | Same URL as `DATABASE_URL` | Not the API pool | Port 5432 session pooler until IPv6 or the IPv4 add-on is confirmed. After that confirmation, the direct host. `sslmode=require` |

The API container runs `prisma migrate deploy` before the server, so the container environment needs both variables. `DIRECT_URL` must be a migration-capable URL even though the Nest process uses `DATABASE_URL`.

Committed files keep the local Docker URLs only. A hosted URL, project ref, or password stays in the operator shell or the deployment host. Never put either variable in Flutter.

The local `motorcycle` password is a published Docker default. Do not reuse it for Supabase. Do not connect the app as the platform `postgres` superuser.

## Pooled runtime and direct migration

NestJS is one long-lived process. Prisma pools inside that process. Use a session-capable connection.

| Mode | Host shape | Port | Use on RideWear |
|---|---|---|---|
| Session pooler | `*.pooler.supabase.com` | 5432 | `DATABASE_URL`. Also `DIRECT_URL` until the operator confirms IPv6 or the IPv4 add-on |
| Direct | `db.[project-id].supabase.co` | 5432 | `DIRECT_URL` only after that confirmation |
| Transaction pooler | `*.pooler.supabase.com` | 6543 | Do not use |

Session-pooler user is `prisma.[project-ref]`. Direct-host user is the dedicated `prisma` role. Database name is `postgres`. Add `sslmode=require` on both hosted URLs. The local Docker URL has no `sslmode`.

Do not use port 6543. Do not add `pgbouncer=true`. Do not set `connection_limit=1`. Those are serverless settings. This API is not serverless. Port 6543 breaks Migrate advisory locks, and it breaks Prisma prepared statements if `DIRECT_URL` is missing and Migrate falls back to `DATABASE_URL`.

Until the operator confirms IPv6 or the IPv4 add-on, do not point `DIRECT_URL` at `db.[project-id].supabase.co`. An IPv4-only laptop or GitHub runner cannot open that host. CI still uses local Postgres and never receives a hosted URL.

## Migration commands

The reviewed script is `apps/api/prisma/migrations/20261002120000_postgres_baseline/migration.sql`. `apps/api/prisma/migrations/migration_lock.toml` is `postgresql`. The SQLite history in `apps/api/prisma/migrations_sqlite/` is not applied.

Local apply, from a clean tree, against Docker only:

```bash
docker compose up -d postgres
cd apps/api
npx prisma migrate deploy
```

Hosted apply, after the preflight below, from `apps/api`, with `DATABASE_URL` and `DIRECT_URL` set in the shell:

```bash
npx prisma migrate deploy
```

Do not run `prisma migrate dev` against Supabase. It needs a shadow database this project does not have. Do not run `prisma db push` against Supabase. Future schema changes are created with `prisma migrate dev` against local Docker, committed as new migration folders, and applied to the host only with `npx prisma migrate deploy`.

`npm run prisma:migrate` is the local `migrate dev` wrapper. It is not the hosted command.

## Empty-public preflight

Stop before the first hosted `npx prisma migrate deploy` unless every line below is true:

- The Data API is off for this project.
- No application data has been written to the hosted database. If any user data exists, stop and write a separate data-migration task. Do not load a SQLite file.
- The operator has run the read-only query below and it returned zero rows.

Run the query with `psql` as the operator, using the session or direct URL. Do not run it from CI.

```sql
SELECT c.relname AS relation, c.relkind
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
ORDER BY c.relkind, c.relname;
```

Zero rows means `public` has no table, partitioned table, view, materialized view, or sequence. Supabase-managed schemas (`auth`, `storage`, extensions) are not a reason to stop and are not dropped.

If the query returns any row, stop. Do not reset the project. Do not drop those objects from this runbook.

## Rollback and recovery

Prisma has no down migration.

- If the hosted apply has not run, leave the hosted database untouched. Restoring the previous git revision returns the API to the prior source tree. Local Docker data is disposable.
- If `migrate deploy` was applied to an empty `public` schema and must be undone before any user data exists, drop only the relations this baseline created, in the order below, plus `_prisma_migrations`. Do not use the Supabase project reset. Do not drop `auth`, `storage`, or extension schemas. If a `DROP` fails because an unexpected object depends on it, stop.

```sql
DROP TABLE IF EXISTS "BodyAreaFeedback";
DROP TABLE IF EXISTS "ActivityFeedback";
DROP TABLE IF EXISTS "RecommendationItem";
DROP TABLE IF EXISTS "Recommendation";
DROP TABLE IF EXISTS "WeatherSnapshot";
DROP TABLE IF EXISTS "ActivityLog";
DROP TABLE IF EXISTS "ActivityPlan";
DROP TABLE IF EXISTS "RouteWaypoint";
DROP TABLE IF EXISTS "Route";
DROP TABLE IF EXISTS "Place";
DROP TABLE IF EXISTS "GarmentComponent";
DROP TABLE IF EXISTS "Garment";
DROP TABLE IF EXISTS "PersonalOffset";
DROP TABLE IF EXISTS "ConnectedAccount";
DROP TABLE IF EXISTS "OAuthState";
DROP TABLE IF EXISTS "PasswordResetToken";
DROP TABLE IF EXISTS "AuthIdentity";
DROP TABLE IF EXISTS "UserProfile";
DROP TABLE IF EXISTS "MotorcycleProfile";
DROP TABLE IF EXISTS "WeatherCache";
DROP TABLE IF EXISTS "User";
DROP TABLE IF EXISTS "_prisma_migrations";
```

- After real user data exists, recovery is a Supabase backup restore. It is not a reload of a developer SQLite file. `SECURITY.md` requires a tested restore before production. This runbook does not create that backup drill.

## Operator steps

1. Run `scripts/check-supabase-readiness.sh` from the repository root. It does not connect to a database. Fix any failure before using a hosted URL.
2. In the Supabase dashboard, turn the Data API off. Do not create an anon key or a service-role key for the app.
3. In the Supabase SQL editor, create the dedicated role. Generate the password outside git and store it only in the host environment. Replace `<generated-password>`.

```sql
create user "prisma" with password '<generated-password>' bypassrls;
grant "prisma" to "postgres";
grant usage, create on schema public to prisma;
grant all on all tables in schema public to prisma;
grant all on all routines in schema public to prisma;
grant all on all sequences in schema public to prisma;
alter default privileges for role postgres in schema public grant all on tables to prisma;
alter default privileges for role postgres in schema public grant all on routines to prisma;
alter default privileges for role postgres in schema public grant all on sequences to prisma;
```

`bypassrls` matches the current NestJS ownership model. Do not enable Row Level Security for this role while NestJS is the only database client. `createdb` does not make `prisma migrate dev` work on Supabase.

4. Confirm whether the API host has IPv6 or the project has the IPv4 add-on. Until one of those is true, set both `DATABASE_URL` and `DIRECT_URL` to the session pooler on port 5432. After it is true, keep `DATABASE_URL` on the session pooler and set `DIRECT_URL` to the direct host. Copy the hostname from the dashboard. Do not guess a region, and do not commit it.
5. Run the empty-public preflight. Zero rows are required.
6. From `apps/api`, run `npx prisma migrate deploy`.
7. Confirm the apply. `\dt` in `public` shows the baseline tables and `_prisma_migrations`. `Garment.isDemo` is boolean, not null, default false:

```sql
SELECT data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Garment'
  AND column_name = 'isDemo';
```

8. Start the API with `DATABASE_URL` set to the session pooler and `DIRECT_URL` set to the migration URL from step 4. Do not point either variable at port 6543.
