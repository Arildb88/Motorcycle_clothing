# Pre-approved task queue

`docs/agent-control/next-task.md` is the only active authorization. This file is the ordered list of later tasks that Arild has already approved. `docs/agent-control/consumed.md` records IDs that have already completed.

Cursor must not add a product or implementation task to this file.

## Control

```text
paused: false
active_id: DB-SUPABASE-002
promotion: automatic
```

- `paused` is `true` or `false`.
- `active_id` is `none` or exactly one task ID.
- `promotion` stays `manual` until a human installs the automation change below and then sets `automatic` with their own push. Cursor must not change `promotion`.

## Who may enqueue

Only a commit pushed to `dev_test` by GitHub user `Arildb88` may add or edit a queued task. ChatGPT may draft the text. The draft is not authorized until that push is on `dev_test`.

Cursor must not append a task, rewrite a queued body, or assign a new ID.

## States

`queued`, `active`, `completed`, `blocked`.

At most one item is `active`. At most one item is `blocked`. An item is never both. `active_id` matches that item, or is `none` when every item is `queued` or `completed`.

## Promotion

The only promotable item is the first `queued` item in the Queue section below.

Promotion is valid only when all of the following are true:

1. `paused` is `false`.
2. `promotion` is `manual` or `automatic`. The actor differs by mode, below.
3. No item is `active` or `blocked`, and `active_id` is `none`.
4. The chosen ID has no row in `consumed.md`.
5. Status for that one item becomes `active`, and `active_id` becomes that ID. No other item changes.
6. `next-task.md` is replaced with that item's promotable body. The only edit inside the body is the `Promoted:` value, set to the UTC time of the push.

Manual mode, which is the mode in force now:

- GitHub user `Arildb88` performs the promotion and pushes it to `dev_test`.
- Cursor does not perform it. A Cursor merge is committed by `cursoragent` and merged by `app/cursor`. Those pushes are not pushes by `Arildb88`, so they do not start this automation. An agent-written next task would sit on `dev_test` without running, which is a latent authorization. Do not write it.

Automatic mode is not installed. Do not use it, and do not set `promotion: automatic` from an agent run. The required automation edit is specified under "Automatic promotion is not enabled".

## Agent entry check

On every run, before any edit, read this file, `consumed.md`, `guardrails.md`, and `next-task.md`.

Stop with no repository writes when any of these is true:

- `paused` is `true`.
- `next-task.md` has `Type: NONE`, or its ID is `none`, or it has no ID.
- The ID already has a row in `consumed.md`.
- The ID is not exactly one Queue item with status `active`.
- `active_id` is not that same ID.
- Another item is `active` or `blocked`.
- `next-task.md` differs from that item's promotable body by anything other than the `Promoted:` value.

`QUEUE-CONTROL-001` is the queue-setup task that created this file. It has no Queue item. It is consumed. If `next-task.md` asks to add this queue again, stop.

## Success

When the active task's required checks pass, the implementation agent does all of the following in its completion update, then stops:

1. Set that item's status to `completed`.
2. Set `active_id` to `none`.
3. Append one row to `consumed.md`. Do not edit or delete older rows.
4. Replace `next-task.md` with the idle body below.
5. Do not promote the next item while `promotion` is `manual`.

The idle `next-task.md` is what permits a later human promotion. It is not itself a task.

## Block

If a required check fails, required tooling is unavailable, or the task needs a schema, dependency, provider, paid-service, secret, or architecture decision that its own text does not authorize:

1. Set that item to `blocked` and leave `active_id` on that ID.
2. Do not append `consumed.md`. A blocked ID may be retried.
3. Replace `next-task.md` with the blocked body below, with the ID filled in.
4. Do not change or promote any other item.
5. Stop.

A human may later set that item back to `queued`, adjust only the text they intend to change, set `active_id` to `none`, and promote it again. Use a new ID for different work. A completed ID is never reused.

## Pause and resume

Pause: set `paused: true` in a commit pushed to `dev_test` by `Arildb88`. Agents that see `paused: true` stop before any edit, including when `next-task.md` changed in that push.

Resume: set `paused: false` in a commit pushed by `Arildb88`. Clearing the flag does not start work. The same or a later `Arildb88` push must promote one queued item so `next-task.md` changes. If that body is already the file contents, change only its `Promoted:` line so the push still changes the file. The current automation starts only when an `Arildb88` push changes `next-task.md`.

## Inspect

Read the Control block, each Queue status, `consumed.md`, and `next-task.md`.

- No active task: `active_id: none`, every item `queued` or `completed`, and `next-task.md` is the idle body.
- Running: one `active` item, `active_id` matches, and `next-task.md` is that promotable body.
- Stopped on failure: one `blocked` item, `active_id` matches, and `next-task.md` is the blocked body.
- Paused: `paused: true`. Promotion is invalid until resume.

## Loop prevention

- One active authorization at a time, and it is `next-task.md`.
- Cursor never enqueues, never promotes while `promotion` is `manual`, and never invents an ID.
- Only an `Arildb88` push that changes `next-task.md` starts a run today. The run executes that file only after the entry check.
- Completion writes the idle file and is pushed by `app/cursor`, which does not start a run.
- A consumed ID cannot be promoted or executed again.
- A blocked item is not consumed and is not skipped. The queue waits.
- `paused: true` stops the run before writes.
- One successful run completes one ID. It does not start the next ID in that same run.

## Automatic promotion is not enabled

Observed on 2026-10-02 for automation `af62016d-be2e-11f1-bb68-864e54d14197`:

- The automation starts when GitHub user `Arildb88` pushes `dev_test`.
- The prompt then continues only if that push changes `docs/agent-control/next-task.md`.
- Implementation merges are made by `app/cursor`. Pull request 27 merged at `2026-10-02T07:37:45Z` as commit `6cb14cde2a3a0236c27e7f0bc17d26f423ca0074`. The next run of this automation started only after `Arildb88` pushed `5e184549b3ea8413bcd856b4c433f9419d82a8b0` at 08:14Z.
- An agent merge that rewrites `next-task.md` therefore does not start the next task.

Do not describe this queue as self-advancing while `promotion` is `manual`.

### Minimal change a human must install

This repository cannot edit the Cursor Automation. A human applies both parts below. Until both are saved, leave `promotion: manual`.

Trigger: also fire on `dev_test` pushes by the Cursor GitHub App (`app/cursor`), in addition to `Arildb88`. Use a path filter for `docs/agent-control/next-task.md` if the product has one. If it does not, the prompt check stays the filter.

Prompt behavior to add to the existing implementation-agent instructions:

1. Fetch `dev_test`. Read `guardrails.md`, `task-queue.md`, `consumed.md`, and `next-task.md` before any edit.
2. If this push did not change `next-task.md`, stop with no writes.
3. Apply the agent entry check in this file. On failure, stop with no writes.
4. Implement that one ID. Do not implement any other ID in the same run.
5. If the task is blocked, apply the Block rule and stop. Do not promote.
6. If it succeeds, apply the Success rule. Then, only when `promotion` is `automatic` and `paused` is `false`, promote the first queued unconsumed item by writing its promotable body into `next-task.md` with a new `Promoted:` time, in that same update. If none is queued, leave the idle body.
7. Stop. Do not start the promoted item in the same run.

After that trigger and prompt are saved, `Arildb88` sets `promotion: automatic` in a separate push. The first automatic cycle is still a human promotion of one queued item, so the new trigger is proven before a second item can follow. `DB-POSTGRES-001` is the only queued item and must not be promoted by the queue-setup task.

## Idle next-task.md

Use this exact file when no task is authorized:

```markdown
# Authorized RideWear Task

## Type: NONE

## ID: none

## Task: No active task

No implementation is authorized.

The queue is `docs/agent-control/task-queue.md`. The ledger is `docs/agent-control/consumed.md`.

Do not promote a queued item from an agent run while promotion is manual. Do not add a task.
```

## Blocked next-task.md

Use this exact file when stopping on a blocker. Replace `BLOCKED_ID` with the item ID.

```markdown
# Authorized RideWear Task

## Type: NONE

## ID: none

## Task: Queue blocked on BLOCKED_ID

No implementation is authorized.

`BLOCKED_ID` is blocked in `docs/agent-control/task-queue.md`. Do not continue it from this file and do not promote another item.
```

## Queue

### QUEUE-TRIGGER-TEST-001

- status: completed
- title: Verify Cursor queue trigger safely
- source: control-plane verification only

#### Promotable body

~~~~~markdown
# Authorized RideWear Task

## Type: CONTROL TEST

## ID: QUEUE-TRIGGER-TEST-001

## Promoted: 2026-10-02T08:20:00Z

## Task: Verify Cursor queue trigger safely

This is a no-production-change control-plane test.

Read the queue/guardrails/ledger and perform only these actions:
- Confirm the queue entry check succeeds for this ID.
- Do not change application code, dependencies, schema, providers, CI, or database configuration.
- Do not run API/Flutter tests, builds, analyze, or smoke.
- Record successful trigger execution in docs/agent-reports/latest.md.
- Apply the normal queue Success rule: mark this ID completed, append it to consumed.md, clear active_id, and restore next-task.md to idle.
- promotion is manual, so DO NOT promote DB-POSTGRES-001.
- Merge documentation/control changes only to dev_test and STOP.

This task exists only to verify that the updated Cursor Automation accepts the authorized trigger safely.
~~~~~

### DB-POSTGRES-001

- status: completed
- title: Implement Prisma PostgreSQL foundation
- source: `docs/architecture/SUPABASE_POSTGRES_MIGRATION_PLAN.md`

#### Promotable body

Copy the fenced file into `docs/agent-control/next-task.md`. Change only `Promoted:`.

~~~~~markdown
# Authorized RideWear Task

## Type: IMPLEMENTATION

## ID: DB-POSTGRES-001

## Promoted: REPLACE_WITH_UTC_TIME

## Task: Implement Prisma PostgreSQL foundation

Read first:

- `docs/agent-control/guardrails.md`
- `docs/agent-control/task-queue.md`
- `docs/agent-control/consumed.md`
- `docs/agent-control/next-task.md`
- `docs/architecture/SUPABASE_POSTGRES_MIGRATION_PLAN.md`

Authorized scope is sections 3 through 8 of the migration plan, and nothing beyond that plan. In particular:

- Change the Prisma datasource to `postgresql` and add Prisma 5.22 `directUrl = env("DIRECT_URL")`. Do not edit models, including `Garment.isDemo`.
- Archive `apps/api/prisma/migrations` to `apps/api/prisma/migrations_sqlite` and create one reviewed PostgreSQL baseline with `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`. Do not replay the SQLite migration history.
- Update local development, Docker Compose, `scripts/smoke-api.sh`, and `.github/workflows/api-ci.yml` to Postgres 16, with `DATABASE_URL` and `DIRECT_URL` both set to that local database.
- Do not commit Supabase credentials, a Supabase host, a project ref, or a real database password.
- Do not connect to the hosted Supabase database and do not run `migrate deploy` against it. Hosted apply remains a manual operator step after local verification and after the operator confirms `public` has no application tables.

### Branch

Start from the latest `dev_test` on `feature/sqlite-to-supabase-postgres`. Do not modify `dev` or `main`.

### Verification

Follow section 8 of the migration plan, in that order. Targeted database checks only: review the baseline SQL, `migrate deploy` on empty local Postgres 16, `npm test` and `npm run build` in `apps/api`, and one smoke run against local Postgres. `api-ci` is the required GitHub repeat. No Flutter tests, Flutter analyze, or mobile build.

### Out of scope

Package upgrades, `@supabase/supabase-js`, the Data API, RLS policies, Prisma 7, `prisma.config.ts`, `@prisma/adapter-pg`, `jsonb` or enum conversions, copying SQLite files, and any Flutter change.

If local Postgres or another required tool is unavailable, mark `DB-POSTGRES-001` blocked and stop. Do not use the hosted Supabase project as a substitute database.

### Completion

Follow the queue success rule in `docs/agent-control/task-queue.md`. If promotion is automatic, promote at most the next pre-approved item and STOP.
~~~~~

### DB-SUPABASE-002

- status: active
- title: Supabase deployment readiness
- source: `docs/architecture/SUPABASE_POSTGRES_MIGRATION_PLAN.md`

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: DB-SUPABASE-002
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Prepare Supabase deployment readiness

After DB-POSTGRES-001 is completed, make the PostgreSQL setup operationally ready for a first manual Supabase deployment. Verify/document environment variable roles, pooled runtime versus direct migration connection, migration commands, empty-public preflight, rollback/recovery, and operator steps.

Do not connect to or mutate the hosted Supabase database. Do not commit hosts, project refs, passwords, tokens, or other secrets. Do not introduce Supabase client/Data API or package upgrades.

Prefer static/config validation. Run only focused checks that provide new evidence; do not repeat the full API suite if DB-POSTGRES-001 already established the same behavior.

Update relevant architecture/operator docs and report. Follow queue success/block rules.
~~~~~

### GEO-ELEVATION-002

- status: queued
- title: Validate altitude-aware weather
- source: existing Kartverket elevation + MET altitude implementation

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: GEO-ELEVATION-002
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Validate altitude-aware weather behavior

Validate the existing Kartverket elevation -> MET altitude foundation with focused automated tests and deterministic fixtures/mocks. Cover low/high elevation cases, coordinate/rounding behavior, cache/fallback behavior, partial elevation failure, and that MET receives altitude only when valid elevation exists.

Do not add providers, paid services, dependencies, schema changes, or live-network-dependent CI tests. Do not claim measured forecast accuracy from mocked tests. Add only minimal production changes if validation exposes a concrete defect.

Run focused API tests for touched geo/weather code; broader suites only if the change materially affects them. Update report and follow queue rules.
~~~~~

### ROUTING-WEATHER-002

- status: queued
- title: Improve route ETA/weather sampling
- source: existing route-weather-sampling foundation

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: ROUTING-WEATHER-002
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Improve route ETA and weather sampling

Improve the current road-geometry weather sampling and ETA distribution using the existing provider-neutral routing/weather architecture. Preserve ephemeral dense geometry and the current provider boundary. Focus on segment-aware distance/progress and deterministic sampling/ETA behavior, including short routes and fallbacks.

No live traffic, new routing/weather provider, paid service, schema change, dependency, or persisted polyline. Do not invent per-leg timing when provider data does not contain it.

Use focused routing/weather tests first. Run broader API checks only when needed for changed behavior. Update report and follow queue rules.
~~~~~

### CYCLING-001

- status: queued
- title: Cycling recommendation foundation
- source: `docs/product/CYCLING_PLAN.md`

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: CYCLING-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Implement cycling recommendation foundation

Implement the first cycling-specific recommendation foundation according to docs/product/CYCLING_PLAN.md, reusing shared route/weather/elevation infrastructure but not motorcycle clothing rules. MVP scope: cycling route/weather along route at ETA, ground elevation where available, cycling intensity inputs already supported/authorized by the plan, wear/pack reasons and confidence with safe fallbacks.

Do not add turn-by-turn navigation, live rerouting, power-meter integration, unsupported surface-quality claims, new paid providers, dependencies, or schema changes unless the existing plan explicitly makes them unnecessary. If a required schema/dependency/provider decision appears, BLOCK instead of inventing it.

Use focused domain/API tests. Mobile work is allowed only if the plan and existing activity UI support it without schema/dependency expansion; otherwise block/report the boundary. Follow queue rules.
~~~~~

### ALPINE-001

- status: queued
- title: Alpine and snowboard exposure foundation
- source: `docs/product/ALPINE_SNOWBOARD_PLAN.md`

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: ALPINE-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Implement alpine/snowboard exposure foundation

Implement only the provider-independent foundation supported by docs/product/ALPINE_SNOWBOARD_PLAN.md. Keep alpine_skiing and snowboarding as separate activity values while allowing a shared exposure engine. Model/use base, mid and upper elevation weather correctly; never substitute village weather as summit weather.

Do not add a piste/resort provider, paid service, dependency, schema migration, or fake resort data. If the existing data model cannot support the planned MVP without one of those decisions, BLOCK and report the exact minimal requirement instead of improvising.

Focused tests only for the implemented domain behavior; broaden only when necessary. Follow queue rules.
~~~~~

### XC-SKI-001

- status: queued
- title: Cross-country skiing foundation
- source: `docs/product/CROSS_COUNTRY_SKIING_PLAN.md`

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: XC-SKI-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Implement cross-country skiing foundation

Implement only the provider-independent XC foundation supported by docs/product/CROSS_COUNTRY_SKIING_PLAN.md: track/line weather with elevation and ETA plus easy/steady/hard intensity, with classic/skate as a tag rather than separate engines.

No grooming-status claims, Sporet integration, live rerouting, wax advice, new paid provider, dependency, or unauthorized schema migration. BLOCK if a required data-model/provider decision is missing.

Use focused tests and follow queue success/block rules.
~~~~~

### WEATHER-PROVIDER-RESEARCH-002

- status: queued
- title: Weather provider quality comparison plan
- source: `docs/research/WEATHER_DATA_QUALITY.md`

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: RESEARCH
## ID: WEATHER-PROVIDER-RESEARCH-002
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Design empirical weather-provider quality comparison

Extend the existing weather research into an evidence-based comparison methodology for RideWear route and mountain use: same coordinates, elevations, forecast horizons and timestamps; measurable error/coverage/latency/cost criteria; MET baseline; candidate free/paid providers only where current official terms/pricing can be verified.

Research/documentation only. Do not subscribe, add SDKs, change providers, send secrets, or declare a paid provider superior without evidence. Minimize tests because no production code should change. Update research docs/report and follow queue rules.
~~~~~

### ADS-001

- status: queued
- title: Non-intrusive monetization foundation
- source: `docs/business/ADS_MONETIZATION_STRATEGY.md`

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: ADS-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Implement ad-placement policy foundation

Implement only the provider-neutral ad eligibility/policy foundation already defined in docs/business/ADS_MONETIZATION_STRATEGY.md: ads default off; explicitly eligible non-critical surfaces only; never allow ads to affect recommendation ranking; no ads on safety, navigation, recommendation-critical, or auth surfaces.

Do not integrate AdMob or another ad SDK/provider, CMP, tracking, consent SDK, dependency, paid service, or production ad unit. If provider integration is required for meaningful implementation, BLOCK and leave the policy documented rather than adding it.

Use focused tests for policy logic if executable code is added. No unrelated broad suites. Follow queue rules.
~~~~~
