# Pre-approved task queue

`docs/agent-control/next-task.md` is the only task body an agent may execute, and only when the triggering push is an authorization handoff. A push that merely edits that file is not an authorization. This file is the ordered list of later tasks that Arild has already approved. `docs/agent-control/consumed.md` records IDs that have already completed.

Cursor must not add a product or implementation task to this file.

## Control

```text
paused: false
active_id: none
promotion: manual
handoff_generation: 0
handoff_state: idle
```

- `paused` is `true` or `false`. Agents stop before any edit when it is `true`. Only a human push may set it back to `false`.
- `active_id` is `none` or exactly one task ID.
- `promotion` stays `manual` until a human sets `automatic` with their own push. Cursor must not change `promotion`.
- `handoff_generation` is a non-negative integer. It starts at `0`. A missing value on an older commit is `0`. It increases by exactly 1 only on an authorization handoff.
- `handoff_state` is `idle`, `authorized`, or `blocked`.
  - `idle`: nothing is authorized. `next-task.md` is the idle body. `active_id` is `none`. No item is blocked.
  - `authorized`: exactly one ID is authorized at this generation. A run may execute it only when its triggering push is the authorization handoff that set this generation.
  - `blocked`: the active item is blocked. `next-task.md` is the blocked body. Generation does not change.

## Who may enqueue

Only a commit pushed to `dev_test` by GitHub user `Arildb88` may add or edit a queued task. ChatGPT may draft the text. The draft is not authorized until that push is on `dev_test`.

Cursor must not append a task, rewrite a queued body, or assign a new ID.

## States

`queued`, `active`, `completed`, `blocked`.

At most one item is `active`. At most one item is `blocked`. An item is never both. `active_id` matches that item, or is `none` when every item is `queued` or `completed`.

## Authorization handoff

An authorization handoff is the only push that may start an implementation run. The triggering push must change `docs/agent-control/next-task.md`, and that change is not enough by itself. The automation trigger may remain Anyone. The pushing GitHub account is not proof of authorization.

Compare the triggering push with its parent on `dev_test`. Use the parent of the automation compare range when that range is known, otherwise the parent of `HEAD`. Read parent copies with `git show <parent>:path`. A missing `handoff_generation` on the parent is `0`. Treat a missing `handoff_state` as `idle` only when the parent `active_id` is `none` and the parent next-task ID is `none`. Any other parent without `handoff_state` is not a valid handoff source.

The push is an authorization handoff only when every condition below is true:

1. The push changes `docs/agent-control/next-task.md`.
2. The new `paused` value is `false`.
3. The new `handoff_state` is `authorized`.
4. The new `handoff_generation` is exactly the parent generation plus 1.
5. `next-task.md` contains `## Generation:` equal to that new generation and `## Handoff-From:` equal to the parent next-task ID (`none` or a task ID).
6. The new next-task ID is not `none`, its Type is not `NONE`, and it differs from the parent next-task ID.
7. The new ID has no row in the new `consumed.md`.
8. The new ID is the only Queue item with status `active`, `active_id` is that ID, and no item is `blocked`.
9. `next-task.md` matches that item's promotable body except the `Promoted:`, `Generation:`, and `Handoff-From:` lines.
10. The handoff has exactly one of these sources:
    - **From idle.** The parent next-task ID is `none`, the parent `active_id` is `none`, the parent has no `blocked` item, and the push adds no `consumed.md` row. This is a human authorization. It does not replace an in-flight ID.
    - **Final control update.** The parent next-task ID is a real task ID, called PREV. In this same push, PREV becomes `completed`, `consumed.md` gains exactly one new row and that row is PREV, the parent `active_id` was PREV, and `## Handoff-From:` is PREV. This is the only way to authorize a different next task ID after a task was active. It is allowed only when `promotion` is `automatic`. While `promotion` is `manual`, completion is a final close and must not authorize another ID.

Reject every other push before any repository write. Rejected pushes include a same-ID edit, a `Promoted:` bump, an idle or blocked `next-task.md`, a generation change other than exactly plus 1, an ID swap that does not complete the previous ID in the same push, a manual-promotion completion that writes a new ID, a pause, a resume, an implementation merge, a report update, and any push while `paused` is `true`.

A final close records completion and does not authorize another ID. `handoff_state` becomes `idle`, `handoff_generation` stays the same, `active_id` becomes `none`, and `next-task.md` becomes the idle body. A block sets `handoff_state` to `blocked`, keeps the same generation, and does not append `consumed.md`.

Before merging a finished task into `dev_test`, fetch `dev_test` again. Stop without merging if `paused` is `true`, `active_id` is no longer the ID this run started, or `handoff_generation` has changed from the value this run started from. A missing generation is `0`. If that fetched control block contains `handoff_state`, also stop unless it is still `authorized`. Do not overwrite a newer handoff.

## Promotion

The only promotable item is the first `queued` item in the Queue section below.

Promotion is valid only when it is also an authorization handoff and all of the following are true:

1. `paused` is `false`.
2. `promotion` is `manual` or `automatic`. The actor differs by mode, below.
3. No item is `active` or `blocked` before the push, except when this promotion is the final control update of the task that just completed. After the push, exactly one item is `active`.
4. The chosen ID has no row in `consumed.md`.
5. Status for that one item becomes `active`, and `active_id` becomes that ID. No other item becomes `active`.
6. `next-task.md` is that item's promotable body plus three lines: `Promoted:` set to the UTC time of the push, `Generation:` set to the new `handoff_generation`, and `Handoff-From:` set to `none` from idle or to the completed ID on a final control update. Place them after the ID line, in that order: `Generation`, `Handoff-From`, `Promoted`.
7. `handoff_generation` increases by exactly 1 and `handoff_state` becomes `authorized`.

Manual mode is the mode in force:

- GitHub user `Arildb88` promotes one item from `handoff_state: idle` and pushes that handoff to `dev_test`.
- Cursor does not promote while `promotion` is `manual`, and must not write the next task into `next-task.md`.
- A same-ID `Promoted:` bump is not a promotion and not a retry. To retry a task that never completed, return it to `queued` if needed, write the idle body, leave the generation unchanged, and do not consume it. A later idle authorization uses a new generation.

Automatic mode is not enabled:

- Cursor must not set `promotion: automatic`.
- After a human sets it in their own push, a completing run may authorize the next ID only inside the final control update above, and only when `paused` is `false` and a queued unconsumed item exists.
- That same run must not implement the authorized ID.

## Agent entry check

On every run, before any edit, read this file, `consumed.md`, `guardrails.md`, and `next-task.md`, plus the parent copies from the triggering push.

Stop with no repository writes when any of these is true:

- The triggering push is not an authorization handoff.
- `paused` is `true`.
- `handoff_state` is not `authorized`.
- `next-task.md` has `Type: NONE`, or its ID is `none`, or it has no ID.
- The ID already has a row in `consumed.md`.
- The ID is not exactly one Queue item with status `active`.
- `active_id` is not that same ID.
- Another item is `active` or `blocked`.
- `next-task.md` differs from that item's promotable body by anything other than the `Promoted:`, `Generation:`, and `Handoff-From:` lines.
- `## Generation:` does not equal `handoff_generation`.

`QUEUE-CONTROL-001` is the queue-setup task that created this file. It has no Queue item. It is consumed. If `next-task.md` asks to add this queue again, stop.

This check is what stops ordinary and mid-task pushes when the trigger remains Anyone.

## Success

When the active task's required checks pass, the implementation agent does all of the following in its completion update, then stops:

1. Set that item's status to `completed`.
2. Set `active_id` to `none`.
3. Append one row to `consumed.md`. Do not edit or delete older rows.
4. Leave `handoff_generation` unchanged. Set `handoff_state` to `idle`.
5. Replace `next-task.md` with the idle body below, using that same generation and `Handoff-From: none`.
6. Do not authorize a different ID while `promotion` is `manual`.
7. Do not set `paused` to `false`. Set `paused` to `true` only when the authorized task text says to.

The idle `next-task.md` permits a later human authorization. It is not itself a task. The completion push is a final close, not an authorization handoff.

## Block

If a required check fails, required tooling is unavailable, or the task needs a schema, dependency, provider, paid-service, secret, or architecture decision that its own text does not authorize:

1. Set that item to `blocked` and leave `active_id` on that ID.
2. Set `handoff_state` to `blocked`. Leave `handoff_generation` unchanged.
3. Do not append `consumed.md`. A blocked ID may be retried.
4. Replace `next-task.md` with the blocked body below. Fill in the ID and the unchanged generation.
5. Do not change or promote any other item.
6. Stop.

A human may later set that item back to `queued`, set `active_id` to `none`, set `handoff_state` to `idle`, and write the idle `next-task.md` without increasing generation. A later authorization from that idle state uses a new generation. Use a new ID for different work. A completed ID is never reused. Returning an item to `queued` does not execute it.

## Pause and resume

Pause: set `paused: true` in a commit pushed to `dev_test` by `Arildb88`. Agents that see `paused: true` stop before any edit, including when `next-task.md` changed in that push. Pausing does not change `handoff_generation`.

Resume: set `paused: false` in a commit pushed by `Arildb88`. Clearing the flag does not start work and does not change `handoff_generation`. The next push that starts work must be an authorization handoff from idle. Bumping `Promoted:` on an ID that is already active is not that handoff.

The completion of `QUEUE-CONTROL-002` sets `paused: true`. Product items stay queued until a human resumes and then authorizes one ID from idle.

## Inspect

Read the Control block, each Queue status, `consumed.md`, and `next-task.md`.

- Idle: `handoff_state: idle`, `active_id: none`, no `blocked` item, and `next-task.md` is the idle body. Generation stays at the last handoff value, or `0` when no handoff has occurred.
- Authorized: `handoff_state: authorized`, one `active` item, `active_id` matches, `## Generation:` matches `handoff_generation`, and the push under review increased that generation by 1.
- Blocked: `handoff_state: blocked`, one `blocked` item, `active_id` matches, and `next-task.md` is the blocked body. Generation is unchanged.
- Paused: `paused: true`. No handoff is valid until a human sets `paused: false`.

## Loop prevention

- One authorization at a time, and only an authorization handoff creates it.
- Cursor never enqueues, never promotes while `promotion` is `manual`, and never invents an ID.
- The trigger may remain Anyone. A push that is not an authorization handoff stops with no writes, including a Cursor merge that edits `next-task.md`.
- A final close leaves the idle file and the same generation, so the completion push cannot start another implementation.
- A consumed ID cannot be promoted or executed again.
- A blocked item is not consumed and is not skipped. The queue waits.
- `paused: true` stops the run before writes.
- One successful run completes one ID. It does not start the next ID in that same run.
- Do not set `promotion: automatic` from an agent run.

## Replacement Cursor Agent Instructions

Observed overlap on 2026-10-02 for automation `af62016d-be2e-11f1-bb68-864e54d14197`:

- `DB-SUPABASE-002` completed in `3a85248f8575bb6a7e096c7cd18087f1bcccf926`. That commit wrote `GEO-ELEVATION-002` into `next-task.md` while `promotion` was `automatic`.
- A second run started from that push and opened pull request 32 on `feature/geo-elevation-002-altitude-validation`.
- An actor filter does not fix that. Anyone and an `Arildb88`-only trigger both start a run when an allowed account pushes a non-final `next-task.md` change. The entry check has to reject that push.
- Historical note: when the trigger was limited to `Arildb88`, the `app/cursor` merge of pull request 27 (`6cb14cde2a3a0236c27e7f0bc17d26f423ca0074`) did not start a run. The next run waited for `5e184549b3ea8413bcd856b4c433f9419d82a8b0`. That is not the concurrency control.

This repository cannot edit the Cursor Automation. A human replaces the implementation-agent instructions with the block below. Leave the trigger able to fire for Anyone, including `Arildb88` and `app/cursor`. A path filter on `docs/agent-control/next-task.md` may be added; the checks in the prompt stay required either way. Do not set `promotion: automatic` in that edit.

~~~~~text
You are the RideWear implementation agent.

Before doing any work:

1. Fetch the latest dev_test.
2. Read docs/agent-control/guardrails.md, docs/agent-control/task-queue.md, docs/agent-control/consumed.md, docs/agent-control/next-task.md, and docs/agent-reports/latest.md.
3. Inspect the commit or push that triggered this automation, including the parent versions of the control files.

TRIGGER FILTER

STOP with no repository writes unless the triggering push is an authorization handoff as defined in docs/agent-control/task-queue.md.

A change to docs/agent-control/next-task.md is required and is not sufficient. Reject all of the following before any edit:

- The push does not change docs/agent-control/next-task.md.
- The push keeps the same task ID, including a Promoted-only edit.
- The new next-task.md is idle or blocked, or its ID is none.
- handoff_generation does not increase by exactly 1 from the parent.
- handoff_state is not authorized, or paused is true.
- The new ID does not differ from the parent next-task ID.
- The parent ID was a real task ID, and this same push does not mark that ID completed and append it to consumed.md.
- The parent ID was none, but the parent was not idle: active_id was set, an item was blocked, or the push adds a consumed row.
- promotion is manual, and the push is a completion that tries to authorize a different ID.
- The ID is consumed, is not the single active item, or active_id does not match.

The trigger may remain Anyone. Do not treat the pushing GitHub account as proof of authorization.

QUEUE ENTRY CHECK

Apply the Agent entry check in docs/agent-control/task-queue.md. STOP with no repository writes if it fails.

In particular:

- Never execute an idle next-task.md.
- Never execute a consumed task ID.
- Never execute a task that is not the single active queue item.
- Never execute work while the queue is paused.
- Never execute a push that is not the authorization handoff for this generation.
- Never invent, enqueue, or expand a task.
- Never skip a blocked task.
- Execute at most ONE task ID per automation run.

IMPLEMENTATION

If the entry check succeeds:

1. Treat next-task.md as the complete authorized scope.
2. Follow guardrails.md strictly.
3. Start from the latest dev_test.
4. Create the required feature/* or fix/* branch.
5. Do not expand scope or invent features.
6. Never modify or merge into dev or main.
7. Before merging back to dev_test, fetch dev_test again. Stop without merging if paused is true, active_id is no longer this ID, or handoff_generation has changed from the value this run started from. A missing generation is 0. If the fetched control block contains handoff_state, also stop unless it is still authorized.
8. Run only tests or checks that provide new evidence for the task. Prefer focused tests. Do not rerun broad suites merely because they passed recently. Run broader verification only when the task materially affects that area or next-task.md explicitly requires it.
9. Never expose or commit secrets.

BLOCKED TASK

If a required check fails, required tooling is unavailable, or the task requires an unauthorized schema change, dependency, provider, paid service, secret, architecture decision, or other work outside next-task.md, apply the Block rule from task-queue.md.

Do not consume the task. Do not promote another task. Do not increase handoff_generation. Update the report. STOP.

SUCCESS

If the task succeeds:

1. Commit the implementation.
2. Open a PR targeting dev_test.
3. Merge only into dev_test when guardrails.md permits it and every required check has passed.
4. Apply the Success rule from task-queue.md in that completion update:
   - mark the current ID completed
   - append it to consumed.md
   - set active_id to none
   - set handoff_state to idle
   - leave handoff_generation unchanged
   - write the idle next-task.md
5. Authorize a different next ID in that same commit only when promotion is automatic, paused is false, no item is blocked, and the commit meets the final-control-update rule in task-queue.md. While promotion is manual, do not authorize another ID.
6. Update docs/agent-reports/latest.md with the completed work, the tests and checks actually run, the tests intentionally not repeated, the commit and PR, architecture decisions, fallbacks, manual validation needed, and remaining issues.
7. STOP. Do not implement an ID authorized in this same run.

LOOP PREVENTION

- One automation run executes at most one task ID.
- Never execute a task you just authorized in the same run.
- Never authorize more than one item.
- Never create a new queue item yourself.
- Never reuse a consumed ID.
- A blocked task stops queue advancement.
- paused: true stops all work.
- An idle next-task.md causes an immediate STOP.
- A triggering push that is not an authorization handoff causes an immediate STOP.
- A same-ID or Promoted-only push causes an immediate STOP.

Never start arbitrary work from your own commits, PRs, reports, or merges.

One authorized handoff equals at most one implementation run.
~~~~~

## Idle next-task.md

Use this exact file when no task is authorized. Replace `GENERATION` with the current `handoff_generation` without increasing it.

```markdown
# Authorized RideWear Task

## Type: NONE

## ID: none

## Generation: GENERATION

## Handoff-From: none

## Task: No active task

No implementation is authorized.

The queue is `docs/agent-control/task-queue.md`. The ledger is `docs/agent-control/consumed.md`.

Do not promote a queued item from an agent run while promotion is manual. Do not add a task. This file is not an authorization handoff.
```

## Blocked next-task.md

Use this exact file when stopping on a blocker. Replace `BLOCKED_ID` with the item ID. Replace `GENERATION` with the current `handoff_generation` without increasing it.

```markdown
# Authorized RideWear Task

## Type: NONE

## ID: none

## Generation: GENERATION

## Handoff-From: none

## Task: Queue blocked on BLOCKED_ID

No implementation is authorized.

`BLOCKED_ID` is blocked in `docs/agent-control/task-queue.md`. Do not continue it from this file and do not promote another item. This file is not an authorization handoff.
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

- status: completed
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

### QUEUE-CONTROL-002

- status: completed
- title: Harden automation final-handoff protocol
- source: observed overlapping runs with Anyone trigger

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: CONTROL
## ID: QUEUE-CONTROL-002
## Promoted: 2026-10-02T09:35:00Z
## Task: Harden final-handoff automation protocol

Control-plane/docs only. Design and implement a repository protocol so ordinary/mid-task pushes cannot authorize another implementation run. Define explicit handoff state/generation semantics where only a completed task's final control update may authorize a different next task ID. Preserve one-task-per-run, consumed ledger, blocker behavior, human pause, and dev/main protection.

Update guardrails.md and task-queue.md consistently. Keep the product queue paused after this control task. Restore GEO-ELEVATION-002 to queued, not consumed, and do not execute it. Do not change application code, dependencies, schema, CI, providers, or database configuration. No API/Flutter tests/builds/smoke are needed.

Document the exact replacement Cursor Agent Instructions a human must install for the new protocol. Do not assume changing GitHub actor identity solves concurrency. The trigger may remain Anyone; entry logic must reject non-final/non-authorization pushes safely.

On success mark QUEUE-CONTROL-002 completed and consumed, leave paused:true, active_id:none, promotion:manual, next-task idle, and STOP. Do not promote another task.
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
