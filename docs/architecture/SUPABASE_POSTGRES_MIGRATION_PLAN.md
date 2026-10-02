# SQLite to Supabase PostgreSQL migration plan

Planning document only. It does not change the Prisma provider, schema, migrations, dependencies, or any running database.

**Status (2026-10-02).** `DB-POSTGRES-001` completed the provider switch and the local Postgres 16 baseline. Section 1 remains the pre-switch record. The first hosted apply is still manual. Follow [`docs/operations/SUPABASE_FIRST_DEPLOY.md`](../operations/SUPABASE_FIRST_DEPLOY.md). Do not connect to the hosted database from an agent or from CI.

Access date: 2026-10-02.

Labels: **Fact**, **Recommendation**, **Assumption**, **Open question**.

Authorized boundary: Flutter -> NestJS API -> Prisma -> PostgreSQL (Supabase). Prisma stays the only database client. Do not add `@supabase/supabase-js`, a Data API client, or direct Flutter database access.

## 1. Current state

**Fact.** `apps/api/prisma/schema.prisma` uses Prisma Client JS and a SQLite datasource:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

There is no `directUrl`, no `relationMode`, and no `previewFeatures`. Installed versions, from `apps/api/package-lock.json`, are `prisma` 5.22.0 and `@prisma/client` 5.22.0 (`package.json` range `^5.22.0`). `PrismaService` extends `PrismaClient` and only calls `$connect` / `$disconnect`. Application code has no `$queryRaw`, `$executeRaw`, or SQLite `PRAGMA`.

**Fact.** `apps/api/prisma/migrations/migration_lock.toml` locks the migration history to `provider = "sqlite"`. Nine migrations exist, in order:

| Folder | What it does |
|---|---|
| `20260826184523_init` | Creates `User`, `AuthProvider`, `Profile`, `ComfortSettings`, `Route`, `RideFeedback`, `WeatherCache` |
| `20260911084843_m1_domain_foundations` | Drops `ComfortSettings`, `Profile`, `RideFeedback`. Creates the current activity/wardrobe core (`UserProfile`, `MotorcycleProfile`, `Garment`, `Place`, `ActivityPlan`, `WeatherSnapshot`, `Recommendation`, `RecommendationItem`, `ActivityLog`, `ActivityFeedback`, `BodyAreaFeedback`, `PersonalOffset`) |
| `20260911090001_m25_profile_auth_connections` | Drops `AuthProvider`. Creates `AuthIdentity`, `ConnectedAccount`, `OAuthState`. Rebuilds `UserProfile` through SQLite table copy |
| `20260911100000_saved_routes_waypoints` | Adds route description/activity/kind/category/favorite/last-used columns and `RouteWaypoint` |
| `20260911110000_garment_components_config` | Adds garment material/vents/heated columns and `GarmentComponent` |
| `20260911120000_preferred_language` | Adds `UserProfile.preferredLanguage` |
| `20260914180000_ride_planning_foundation` | Adds `Route.preferencesJson` and `ActivityPlan` planning columns |
| `20260914190000_user_unit_preferences` | Adds distance, speed, and wind display units on `UserProfile` |
| `20261001190000_password_reset_tokens` | Creates `PasswordResetToken` |
| `20261002100000_garment_is_demo` | `ALTER TABLE "Garment" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false` |

**Fact.** The live schema has these models and no Prisma enums. Identifiers are quoted by Prisma. Primary keys are `String @id @default(cuid())` (client-generated, not database sequences). `@updatedAt` is client-maintained. JSON payloads are `String` columns, not the Prisma `Json` type.

| Model | Relations and constraints that must survive |
|---|---|
| `User` | Optional unique `email`. Owns every user-scoped row below |
| `PasswordResetToken` | FK `userId` cascade. Unique `tokenHash`. Index on `userId` |
| `AuthIdentity` | FK `userId` cascade. Unique `(provider, providerSubjectId)`. Index on `userId` |
| `UserProfile` | FK `userId` cascade. Unique `userId` |
| `MotorcycleProfile` | FK `userId` cascade. Unique `userId` |
| `Garment` | FK `userId` cascade. Index `(userId, category)`. `isDemo Boolean @default(false)` |
| `GarmentComponent` | FK `garmentId` cascade. Index on `garmentId` |
| `Place` | FK `userId` cascade |
| `Route` | FK `userId` cascade. Indexes `(userId, isFavorite)` and `(userId, activityType)` |
| `RouteWaypoint` | FK `routeId` cascade. Index `(routeId, sortOrder)` |
| `ActivityPlan` | FK `userId` cascade. Optional FK `routeId` `onDelete: SetNull` |
| `WeatherSnapshot` | Unique `planId`. FK cascade |
| `Recommendation` | Unique `planId`. FK cascade |
| `RecommendationItem` | FK `recommendationId` cascade |
| `ActivityLog` | Unique optional `planId`. FK `userId` cascade. Optional `planId` and `routeId` `onDelete: SetNull` |
| `ActivityFeedback` | Unique `activityLogId`. FK cascade |
| `BodyAreaFeedback` | Unique `(feedbackId, zone)`. FK cascade |
| `PersonalOffset` | Unique `(userId, activityType, zone)`. FK cascade |
| `ConnectedAccount` | FK `userId` cascade. Unique `(provider, providerAccountId)` and `(userId, provider)` |
| `OAuthState` | Unique `state`. `userId` is an optional string with no foreign key |
| `WeatherCache` | Unique `cacheKey` |

Tables that appear only in old SQLite migrations and are already gone from the schema: `AuthProvider`, `Profile`, `ComfortSettings`, `RideFeedback`. A PostgreSQL baseline must not recreate them.

**Fact.** Runtime configuration today:

- `apps/api/.env.example` and `apps/api/.env.test` set `DATABASE_URL` to `file:./dev.db` and `file:./test.db`.
- `scripts/smoke-api.sh` defaults `DATABASE_URL` to `file:./smoke.db`, deletes that SQLite file, then runs `npx prisma migrate deploy`.
- `.github/workflows/api-ci.yml` runs `prisma generate`, `npm test`, `npm run build`, and the smoke script. It has no Postgres service. The smoke step is the only CI step that applies migrations. `npm test` uses mocked `PrismaService` objects.
- `apps/api/Dockerfile` runs `npx prisma migrate deploy` before `node dist/main.js`.
- `docker-compose.yml` already publishes `postgres:16` as `postgresql://motorcycle:motorcycle@postgres:5432/motorcycle` for the `api` service. That URL does not match the SQLite schema, so the compose API path is not a working database today. README calls this compose file a staging-style experiment, not the default local path.
- `.env` is gitignored. No Supabase URL, password, anon key, or service-role key is in the repository.

**Fact.** Auth data is application data in Prisma, not Supabase Auth. `User.passwordHash` is a bcrypt string. Password reset stores only a SHA-256 hex digest in `PasswordResetToken.tokenHash`, with expiry and `usedAt`. `ConnectedAccount` stores encrypted provider tokens (`accessTokenEnc`, `refreshTokenEnc`). Account deletion is `prisma.user.delete`, which relies on the cascade foreign keys above. Email is lowercased in `AuthService` before lookup and insert. There is no raw SQL.

**Assumption.** The already-created Supabase project has an empty application schema. This plan does not connect to it and does not invent a data copy from local SQLite. Local `*.db` files are disposable development data.

## 2. Compatibility findings

**Fact.** The SQLite migration SQL cannot be replayed on PostgreSQL. Replaying it would also try to create tables the current schema no longer has, then drop them. Specific incompatibilities:

- `migration_lock.toml` is `sqlite`. Prisma Migrate will not apply that history to a `postgresql` datasource.
- `PRAGMA foreign_keys` and `PRAGMA defer_foreign_keys` in `20260911084843_m1_domain_foundations` and `20260911090001_m25_profile_auth_connections`. PostgreSQL rejects `PRAGMA`.
- The `new_UserProfile` copy/drop/rename block in `20260911090001_m25_profile_auth_connections` is the SQLite table-rebuild pattern.
- SQLite type names `DATETIME` and `REAL` are used throughout the history. Prisma's PostgreSQL mapping for the same schema fields is `TIMESTAMP(3)` and `DOUBLE PRECISION`.
- Several migrations are valid-looking `ALTER TABLE ... ADD COLUMN` statements, including `Garment.isDemo`. They are still not safe to replay, because they depend on the earlier SQLite-only migrations and on the SQLite provider lock.

**Fact.** The Prisma schema itself is portable without model edits:

- `String`, `Boolean`, `Int`, `Float`, and `DateTime` all have PostgreSQL mappings. Booleans are already declared as `Boolean`, not integers.
- `onDelete: Cascade` and `onDelete: SetNull` are supported.
- `cuid()` does not need PostgreSQL sequences or extensions.
- Text defaults such as `'["motorcycle"]'`, `'{}'`, and `'[]'` stay text defaults. Do not convert those columns to `jsonb` in the provider switch. The application reads and writes them as strings.
- No code depends on SQLite date functions or on SQLite's loose typing.

**Fact.** PostgreSQL unique indexes treat `NULL` as distinct, which matches the current optional `User.email` behavior. The API already stores emails in lowercase, so the unique index does not need a case-insensitive operator class for the current writers.

**Recommendation.** Keep every model field, including `Garment.isDemo`, unchanged in the provider switch. A later task that wants native enums or `jsonb` is a separate schema change.

## 3. Target architecture and config

**Fact.** Supabase's Prisma guide, read 2026-10-02, describes two different setups. The "server-based" setup uses one session connection for both the app and migrations. The "serverless" setup uses transaction mode on port 6543 with `?pgbouncer=true` for the app, and a separate port-5432 URL for migrations. The same guide's project setup (`prisma.config.ts`, `@prisma/adapter-pg`, `prisma migrate diff --to-schema`) targets a newer Prisma than 5.22.0.

**Fact.** Prisma 5.22 reads the datasource from `schema.prisma`, not `prisma.config.ts`. `url` is the Prisma Client runtime URL. `directUrl` is what Migrate and introspection use. If `directUrl` is omitted, Migrate uses `url`. `directUrl` has been valid since Prisma 4.10 and is the correct 5.22 mechanism. The 5.22 diff flag that renders SQL from the datamodel is `--to-schema-datamodel`, not the newer `--to-schema`.

**Fact.** Supabase's connection guide, read 2026-10-02:

| Mode | Endpoint | Use |
|---|---|---|
| Direct | `db.[project-id].supabase.co:5432` | Migrations, `pg_dump`, long-lived backends. IPv6 unless the project has the IPv4 add-on |
| Shared pooler, session | `*.pooler.supabase.com:5432` | Persistent backends on IPv4-only networks. Holds a session, so prepared statements and advisory locks work |
| Shared pooler, transaction | `*.pooler.supabase.com:6543` | Serverless and edge. Not a migration connection |

**Recommendation.** NestJS is one long-lived Node process. Prisma already pools connections inside that process. Use session-capable PostgreSQL, not transaction pooling.

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

| Environment | `DATABASE_URL` (runtime) | `DIRECT_URL` (Migrate) |
|---|---|---|
| Local Docker and CI | Same unpooled Postgres URL, for example `postgresql://motorcycle:motorcycle@localhost:5432/motorcycle` | Same value as `DATABASE_URL` |
| Hosted Supabase, IPv4-only | Session pooler, port 5432, user `prisma.[project-ref]` | Same session URL |
| Hosted Supabase, once IPv6 or the IPv4 add-on is confirmed | Session pooler, port 5432 | Direct host `db.[project-id].supabase.co:5432` |

Do not point this API at port 6543. Do not add `pgbouncer=true`. Do not set `connection_limit=1`. Those are serverless workarounds and would disable named prepared statements. Do not add `prisma.config.ts` or `@prisma/adapter-pg` as part of the provider switch. That would be a Prisma major-version change.

Remote Supabase URLs should include `sslmode=require`. The local Docker URL should not.

**Recommendation.** Turn off the Supabase Data API for this project if it is enabled. Prisma is the only database client. Leave Row Level Security off while the NestJS role is the only database role. `SECURITY.md` already says RLS matters only if a client talks to Supabase directly. A leaked `DATABASE_URL` is full database access and stays server-side. Do not create anon or service-role keys in the app to "compensate".

## 4. Migration and baseline strategy

**Recommendation.** Create one PostgreSQL baseline from the current datamodel. Do not run the nine SQLite migrations against Supabase or against local Postgres.

Later implementation steps, in order:

1. Change only the `datasource` block, as in section 3. Leave every model, including `Garment.isDemo`, as it is.
2. Move `apps/api/prisma/migrations/` to `apps/api/prisma/migrations_sqlite/`. Prisma Migrate only reads `prisma/migrations`, so the archive is history for reviewers and is not applied. Git history also keeps the old SQL.
3. With the provider already set to `postgresql`, generate the baseline without a database connection:

   ```bash
   mkdir -p prisma/migrations/20261002120000_postgres_baseline
   npx prisma migrate diff \
     --from-empty \
     --to-schema-datamodel prisma/schema.prisma \
     --script > prisma/migrations/20261002120000_postgres_baseline/migration.sql
   ```

   Run that from `apps/api`. Prisma 5.22 writes `migration_lock.toml` with `provider = "postgresql"` when the new migration directory is created with Migrate. If the lock file is still missing after the diff, write that one line. Do not hand-edit the generated SQL except to reject it and regenerate if the checks below fail.
4. Review the generated script before applying it. It must:
   - contain no `PRAGMA`, `DATETIME`, or `REAL`
   - create `Garment.isDemo` as `BOOLEAN NOT NULL DEFAULT false` inside the `Garment` table, not as a follow-up SQLite alter
   - include the foreign keys, unique indexes, and secondary indexes in section 1
   - not create `AuthProvider`, `Profile`, `ComfortSettings`, or `RideFeedback`
5. Apply it with `npx prisma migrate deploy` using `DIRECT_URL`. First target is local Docker Postgres. Supabase is a later, explicit deploy of that same reviewed SQL, and only after the operator confirms the public schema has no application tables.
6. Do not run `prisma migrate dev` or `prisma db push` against Supabase. `migrate dev` needs a shadow database, and Supabase does not give a second database for that. Future schema changes are created against local Docker Postgres, committed as new migration folders, and applied to Supabase only with `migrate deploy`.
7. Do not copy `dev.db`, `test.db`, or `smoke.db` into Postgres. Supabase starts empty. Local SQLite files can be left on disk and ignored. They are not a source of users, password hashes, reset tokens, or encrypted connected-account tokens.

`Garment.isDemo` needs no backfill and no extra database constraint. The API already refuses client writes: create and update DTOs omit the field, the validation pipe forbids unknown properties, only `seedDemo` sets `true`, and `DELETE /api/wardrobe/actions/demo` deletes `where: { userId, isDemo: true }`. Those rules stay in NestJS. Do not add a trigger.

If `migrate deploy` against Supabase finds existing objects, stop. Do not reset the project and do not drop schemas other than tables this baseline created.

## 5. Secrets and environment strategy

**Fact.** `SECURITY.md` already forbids `DATABASE_URL` in Flutter and treats a Supabase service-role key as API-only if it is ever used. This architecture does not need that key.

**Recommendation.** The human operator, not the implementation agent, creates the database role in the Supabase SQL editor and stores the password outside git. The current Supabase Prisma guide uses a dedicated role with `bypassrls` and grants on `public`. Use that pattern so the app is not the platform `postgres` superuser. `createdb` on that role is not sufficient to make `migrate dev` work on Supabase, so do not rely on it. Placeholder, not a command to run from CI:

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

Never commit, and never put in Flutter:

- the Supabase database password or the `prisma` role password
- a real `DATABASE_URL` or `DIRECT_URL` (they contain the password)
- the project connection strings copied from the dashboard
- the anon key, service-role key, or Supabase JWT secret

Those values belong only in the host environment that runs the API and `migrate deploy` (local uncommitted `.env`, or the deployment host). `.env.example` may name `DATABASE_URL` and `DIRECT_URL` with obvious placeholders such as `postgresql://USER:PASSWORD@HOST:5432/postgres`. It must not contain a real host, project ref, or password.

The Docker credentials `motorcycle` / `motorcycle` are already public in `docker-compose.yml`. They are local defaults. Do not reuse them for Supabase.

No new secret is required for auth. Password hashes, reset-token hashes, and encrypted connected-account tokens stay columns written by NestJS. Because the hosted database starts empty, none of those values move.

## 6. Local development strategy

**Recommendation.** After the switch, local development uses the existing `postgres:16` service in `docker-compose.yml`. It does not use the shared Supabase project, and it cannot keep using `file:./dev.db`.

Host-side API (from `apps/api`, talking to published port 5432):

```text
DATABASE_URL="postgresql://motorcycle:motorcycle@localhost:5432/motorcycle"
DIRECT_URL="postgresql://motorcycle:motorcycle@localhost:5432/motorcycle"
```

The `api` service on the compose network keeps the hostname `postgres` instead of `localhost`, and must receive both variables. `setup:env` may still copy `.env.example` to `.env` when `.env` is missing. The example file's database URLs become those local Postgres URLs, not a Supabase URL.

Normal local sequence for the later task's documentation:

```bash
docker compose up -d postgres
cd apps/api
npm run setup:env
npx prisma migrate deploy
npm run prisma:generate
npm run start:dev
```

`prisma migrate dev` remains the command for a future schema change, and only against this local database. `prisma:migrate` in `package.json` can stay that wrapper.

Jest unit tests do not open a database. `.env.test` should still document Postgres URLs so a future integration test is not pointed at a SQLite file, but `npm test` does not need Postgres running.

`scripts/smoke-api.sh` must stop deleting `prisma/smoke.db` and must default both URLs at the local Postgres database. Smoke registers a random email, so leftover rows do not collide. CI should start from an empty Postgres service instead of deleting a file. A second local database name is unnecessary for the first cut.

## 7. Implementation sequence

One later authorized task, and nothing from this document until `next-task.md` says so:

1. Branch from the latest `dev_test` as `feature/sqlite-to-supabase-postgres` (or the name that task assigns). Do not touch `dev` or `main`.
2. Edit the `datasource` block only.
3. Archive `prisma/migrations` to `prisma/migrations_sqlite` and add the single PostgreSQL baseline from section 4. Commit the generated SQL after the review checks.
4. Point `.env.example`, `.env.test`, `docker-compose.yml` `api.environment`, and `scripts/smoke-api.sh` at local Postgres with both `DATABASE_URL` and `DIRECT_URL`. Do not put a Supabase URL in any committed file.
5. Add a `postgres:16` service to `.github/workflows/api-ci.yml` for the smoke step, with the same local credentials and both variables. `prisma generate` must see both variables if 5.22 still requires datasource env vars at generate time. A dummy local URL is enough for generate. Do not add Supabase secrets to GitHub.
6. Update the database sections of `README.md`, `QUICKSTART.md`, and the local-stage row in `SECURITY.md` so they describe Postgres instead of `file:./dev.db`. Do not redesign auth, Flutter, providers, or models.
7. Confirm the Dockerfile still runs `migrate deploy` before the server. The container env must include `DIRECT_URL`.
8. Run the verification in section 8. Open a PR to `dev_test` only.
9. Applying the baseline to the real Supabase project is an operator step with the uncommitted URLs, after CI and local `migrate deploy` have passed. It is `prisma migrate deploy` against the session or direct URL. It is not part of CI.

Out of that task: package upgrades, `@supabase/supabase-js`, Data API, RLS policies, Prisma 7, `jsonb` or enum conversions, copying SQLite files, and any Flutter change.

## 8. Minimal verification strategy

Do not rerun Flutter. The provider switch does not change the client.

Targeted checks, in this order:

1. Read the generated baseline SQL against the checklist in section 4. This is the check that proves the SQLite history was not replayed.
2. `docker compose up -d postgres`, then from `apps/api`: `npx prisma migrate deploy` and `npx prisma generate`. Deploy must succeed on an empty Postgres 16 database.
3. `npm test` in `apps/api`. These tests mock Prisma. They confirm the client still generates and the suite still compiles. They do not prove SQL.
4. `npm run build`.
5. `scripts/smoke-api.sh` once, against the local Postgres database. That script already registers a user, writes a route, seeds the demo wardrobe, checks `isDemo: true`, creates a personal garment, and checks that `DELETE /api/wardrobe/actions/demo` leaves the personal garment. One smoke run covers migrate plus the auth, wardrobe, and route writes that matter. Skip a second smoke with unit tests and build enabled when steps 3 and 4 already passed (`SMOKE_SKIP_UNIT=1`, `SMOKE_SKIP_BUILD=1`), matching current CI.
6. The pull-request `api-ci` run is the required repeat of generate, unit tests, build, and smoke on GitHub's Postgres service. Do not add a second workflow that does the same steps.

No Flutter analyze, Flutter test, or full mobile build. No connection to Supabase in CI. A manual `migrate deploy` to Supabase, by the operator, is the only hosted check, and only after the PR checks are green. Confirm `\dt` in `public` shows the baseline tables and `_prisma_migrations`, and that `Garment` has `isDemo`.

## 9. Rollback and recovery

**Recommendation.** Prisma has no down migrations. Rollback is source control plus, only if needed, dropping objects this baseline created.

- Before any hosted apply, `dev_test` still builds and migrates SQLite. Reverting the implementation commit restores `provider = "sqlite"`, the old `prisma/migrations` tree, and `file:` URLs. Local `*.db` files do not have to be deleted for that rollback.
- If `migrate deploy` has been applied only to empty local or empty Supabase databases, drop the tables the baseline created and the `_prisma_migrations` table in `public`, then redeploy or stop. Do not run a full project reset that touches Supabase-managed schemas (`auth`, `storage`, extensions).
- After real user data exists, recovery is a Supabase backup restore. It is not a reload of a developer SQLite file. `SECURITY.md` already requires a tested restore before production. The first implementation does not create that backup drill.
- Do not keep dual writes to SQLite and Postgres.

## 10. Risks and open questions

**Open question.** Whether this Supabase project has the IPv4 add-on, or whether the API host has IPv6, is unknown. Until the operator confirms one of those, both hosted URLs should be the session pooler on port 5432. Direct `db.[project-id].supabase.co` from an IPv4-only GitHub runner or laptop will fail.

**Open question.** Whether the Data API is currently enabled, and whether any tables already exist in `public`, was not inspected. The operator confirms both before the first hosted `migrate deploy`.

**Open question.** The exact pooler hostname and region come from the dashboard connection panel. They must not be guessed or committed.

**Risk.** Following the current Supabase quickstart literally would upgrade Prisma and add a driver adapter. That is a larger change than the provider switch and is rejected for the implementation task.

**Risk.** `docker-compose.yml` already advertises a Postgres URL while the schema is SQLite. After the switch that URL becomes the local default. Until the switch lands, compose is still not a working API database.

**Risk.** `prisma generate` in CI currently runs without `DATABASE_URL` set in the workflow. Adding `directUrl = env("DIRECT_URL")` may make generate require both variables. The implementation task sets them to the CI Postgres URL before generate rather than discovering that on a red build with no context.

**Risk.** A `DATABASE_URL` pointed at port 6543 will break `migrate deploy` (advisory locks and prepared statements) if `DIRECT_URL` is missing or copied from it. The schema split in section 3 is what prevents that.

**Risk.** Enabling RLS in the dashboard without a policy, while connecting as a role that does not bypass RLS, makes every Prisma query return empty or fail. The dedicated `prisma` role uses `bypassrls` because NestJS, not RLS, enforces `userId` scope. Revisit RLS only if a client is ever allowed to connect.

**Assumption.** No production data lives in Supabase yet. If that assumption is wrong, stop before `migrate deploy` and write a separate data-migration task. Do not infer a SQLite-to-Postgres copy from local developer files.
