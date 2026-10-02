# Pre-approved task queue

`docs/agent-control/next-task.md` is the authorization token. An agent may execute it only when the triggering push is an authorization handoff defined below. A push that merely edits that file is not an authorization. This file is the ordered list of later tasks that Arild has already approved. `docs/agent-control/consumed.md` records IDs that have already completed.

Cursor must not add a product or implementation task to this file.

## Control

```text
paused: false
active_id: GEO-ELEVATION-002
promotion: manual
handoff_generation: 2
handoff_state: authorized
```

- `paused` is `true` or `false`. Agents stop before any edit when it is `true`. Only a human push may set it back to `false`.
- `active_id` is `none` or exactly one task ID.
- `promotion` stays `manual` until a human sets `automatic` with their own push. Cursor must not change `promotion`.
- `handoff_generation` is a non-negative integer. A missing value on an older commit is `0`. It increases by exactly 1 only on an authorization handoff. A generation value that has appeared on `dev_test` is spent. Never reset it downwards to make files match.
- `handoff_state` is `idle`, `authorized`, or `blocked`.
  - `idle`: nothing is authorized. `next-task.md` is the idle body. `active_id` is `none`. No item is blocked. `## Authorization:` is `none`.
  - `authorized`: exactly one ID is authorized at this generation. A run may execute it only when its triggering push is the authorization handoff for that generation.
  - `blocked`: the active item is blocked. `next-task.md` is the blocked body. Generation does not change. `## Authorization:` is `none`.

### Generation baseline

Generation `1` is spent. It appeared on `dev_test` in `15f2dae8e6c0fe5a5f3fc8284853669541f586e0`, `e668b09c97df165a34c59a2b1ceaf1f5bdbeade5`, and `d7125a9d8c8ae907e5d69a6cdf576642adaf32cf` for a rejected `GEO-ELEVATION-002` handoff. `d7125a9d8c8ae907e5d69a6cdf576642adaf32cf` then reset the control block to `0` and left that task body in `next-task.md`. `QUEUE-CONTROL-003` restores the idle baseline to `1` and does not reuse generation `1`. The next from-idle human authorization must use Generation `2`. `GEO-ELEVATION-002` stays queued and unconsumed. This repair does not authorize it.

After a from-idle human token is pushed, and before the accepting run claims it, the control block may still show the previous generation, `active_id: none`, and `handoff_state: idle` while `next-task.md` already holds the token. That window is not a second authorization. The token is the authorization. The claim only records ownership.

## Who may enqueue

Only a commit pushed to `dev_test` by GitHub user `Arildb88` may add or edit a queued task. ChatGPT may draft the text. The draft is not authorized until that push is on `dev_test`.

Cursor must not append a task, rewrite a queued body, or assign a new ID.

## States

`queued`, `active`, `completed`, `blocked`.

At most one item is `active`. At most one item is `blocked`. An item is never both. After a claim, `active_id` matches the active item. `active_id` is `none` when every item is `queued` or `completed`.

A from-idle human authorization does not itself change an item from `queued` to `active`. The accepting run claims that item after the token validates. Until that claim, the authorized ID stays `queued` and `active_id` stays `none`.

## Authorization handoff

An authorization handoff is the only push that may start an implementation run. There are exactly two kinds. The automation trigger may remain Anyone. The pushing GitHub account is not proof of authorization.

Compare the triggering push with its parent on `dev_test`. Use the parent of the automation compare range when that range is known, otherwise the parent of `HEAD`. Read parent copies with `git show <parent>:path`. A missing `handoff_generation` on the parent is `0`. Treat a missing `handoff_state` as `idle` only when the parent `active_id` is `none` and the parent next-task ID is `none`. Any other parent without `handoff_state` is not a valid handoff source.

`## Authorization: authorized` is the authorization marker. Idle and blocked files use `## Authorization: none`. A `Promoted:` edit is not a marker and is not an authorization.

### 1. Human/ChatGPT to Cursor, from idle

`next-task.md` is the atomic token. From idle, one commit that changes `docs/agent-control/next-task.md` authorizes a task. That commit must not change `docs/agent-control/task-queue.md` or `docs/agent-control/consumed.md`. The queue item does not need to become `active` in that commit, and `active_id` / `handoff_generation` / `handoff_state` in the control block do not need to change in that commit.

The commit is a from-idle human authorization only when every condition below is true:

1. The commit changes `docs/agent-control/next-task.md` and does not change `docs/agent-control/task-queue.md` or `docs/agent-control/consumed.md`.
2. The parent `paused` value is `false`, parent `handoff_state` is `idle`, parent `active_id` is `none`, the parent next-task ID is `none`, and the parent has no `blocked` item.
3. The new next-task ID is not `none`, its Type is not `NONE`, and it differs from the parent ID.
4. `## Generation:` is exactly the parent `handoff_generation` plus 1.
5. `## Handoff-From:` is `none`.
6. `## Authorization:` is `authorized`.
7. In the unchanged queue, that ID is `queued`, it is not `active` or `blocked` or `completed`, and it has no row in `consumed.md`.
8. `next-task.md` matches that item's promotable body except the `Promoted:`, `Generation:`, `Handoff-From:`, and `Authorization:` lines.

This exception applies only to a from-idle human authorization. It must not replace an active task or a blocked task. A token pushed while `active_id` is set, while any item is `blocked`, or while the parent next-task ID is not `none`, is not a handoff.

The accepting run claims the task only after those checks pass. The claim sets that item to `active`, sets `active_id` to that ID, sets `handoff_generation` to the token generation, and sets `handoff_state` to `authorized`. The claim does not change the token ID, Generation, Handoff-From, or Authorization lines. The claim is not an authorization handoff. A later trigger caused by the claim stops with no repository writes.

### 2. Cursor to Cursor, automatic final control update

Cursor may authorize a different next ID only after the current task has fully succeeded: implementation, required checks, PR and merge bookkeeping, then this final control commit. The same run must not execute the newly authorized ID.

This kind is allowed only when `promotion` is `automatic`. While `promotion` is `manual`, completion is a final close and must not authorize another ID.

The final control commit is an automatic authorization only when it atomically does all of the following:

1. The parent next-task ID is a real task ID, called PREV. The parent `active_id` was PREV, the parent `handoff_state` was `authorized`, and the parent was not paused.
2. PREV becomes `completed` in this commit.
3. `consumed.md` gains exactly one new row, and that row is PREV.
4. Exactly one queued unconsumed ID, the first such item in the Queue section, becomes `active`. `active_id` becomes that ID. No item is `blocked`. No other item becomes `active`.
5. `handoff_generation` becomes exactly the parent generation plus 1. `handoff_state` becomes `authorized`.
6. `next-task.md` is that new item's promotable body plus `Generation:` set to the new generation, `Handoff-From:` set to PREV, `Authorization:` set to `authorized`, and `Promoted:` set to the UTC time of the commit. Place them after the ID line in that order: `Generation`, `Handoff-From`, `Authorization`, `Promoted`.
7. The report and control state are updated in this same commit.

If `promotion` is `automatic` and no queued unconsumed item exists, the completion commit is a final close instead. It must not invent an ID.

Reject every other push before any repository write. Rejected pushes include a same-ID edit, a `Promoted:` bump, an idle or blocked `next-task.md`, a generation change other than exactly plus 1, an ID swap that does not meet one of the two kinds above, a manual-promotion completion that writes a new ID, a claim commit, a pause, a resume, an implementation commit, a PR update, a report-only update, a merge that is not the automatic final control commit, and any push while `paused` is `true`.

A trigger caused by a rejected push stops with no repository writes.

A final close records completion and does not authorize another ID. `handoff_state` becomes `idle`, `handoff_generation` stays the same, `active_id` becomes `none`, and `next-task.md` becomes the idle body with `## Authorization: none`. A block sets `handoff_state` to `blocked`, keeps the same generation, and does not append `consumed.md`.

Before merging or otherwise finalizing a task on `dev_test`, fetch `dev_test` again. Stop without merging if ownership was superseded or the queue was paused. In particular, stop when any of these is true:

- `paused` is `true`.
- The token ID already has a row in `consumed.md`.
- `active_id` is a different ID than this token.
- `handoff_generation` is greater than this token's generation.
- `handoff_state` is `blocked`, or any item is `blocked`.
- `next-task.md` on the fetched branch names a different ID or a different generation than this token.

Continue only when the fetched branch still carries this token, `paused` is `false`, the ID is unconsumed, and either the queue is still unclaimed (`active_id: none` and the item is still `queued`) or this same ID is already `active` at this same generation. Do not overwrite a newer handoff.

## Promotion

Automatic promotion is valid only as the Cursor-to-Cursor final control update above, and only for the first queued unconsumed item.

From-idle human authorization may name any ID that is already `queued` and unconsumed. It is not limited to a Cursor-chosen item, and it does not mark the item `active` by itself.

Manual mode is the mode in force:

- A human or ChatGPT authorizes one queued unconsumed item from idle by the single `next-task.md` commit defined above, pushed to `dev_test`.
- Cursor does not create that token while `promotion` is `manual`, and must not write the next task into `next-task.md`.
- A same-ID `Promoted:` bump is not a promotion and not a retry. To retry a task that never completed, return it to `queued` if needed, write the idle body, leave the generation unchanged, and do not consume it. A later idle authorization uses a new generation. Do not reuse a generation that has already appeared.

Automatic mode is not enabled:

- Cursor must not set `promotion: automatic`.
- After a human sets it in their own push, a completing run may authorize the next ID only inside the final control update above, and only when `paused` is `false` and a queued unconsumed item exists.
- That same run must not implement the authorized ID.

## Agent entry check

On every run, before any edit, read this file, `consumed.md`, `guardrails.md`, and `next-task.md`, plus the parent copies from the triggering push.

Stop with no repository writes unless the triggering push is one of the two authorization handoffs above.

For a from-idle human authorization, do not reject the token only because `active_id` is still `none`, the item is still `queued`, or the control block `handoff_generation` is still the parent generation. Those are expected until the accepting run claims the task. Do reject it when the token checks fail, the ID is not queued and unconsumed, another item is active or blocked, or the parent was not idle.

For an automatic final control update, require the atomic conditions above, including `active_id` equal to the new ID and `handoff_state: authorized` in that same commit.

Also stop with no repository writes when any of these is true:

- `paused` is `true`.
- The ID already has a row in `consumed.md`.
- `next-task.md` has `Type: NONE`, its ID is `none`, it has no ID, or `## Authorization:` is not `authorized`.
- The push is a claim, a same-ID edit, a `Promoted:`-only edit, an implementation commit, a report update, or a merge that is not an automatic final control update.
- The parent had an active or blocked task and this push tries to name a different ID without completing that task in the same automatic final control update.

`QUEUE-CONTROL-001` is the queue-setup task that created this file. It has no Queue item. It is consumed. If `next-task.md` asks to add this queue again, stop.

This check is what stops ordinary and mid-task pushes when the trigger remains Anyone.

## Success

When the active task's required checks pass and `promotion` is `manual`, the implementation agent does all of the following in its completion update, then stops:

1. Set that item's status to `completed`.
2. Set `active_id` to `none`.
3. Append one row to `consumed.md`. Do not edit or delete older rows.
4. Leave `handoff_generation` unchanged at the accepted token generation. Set `handoff_state` to `idle`.
5. Replace `next-task.md` with the idle body below, using that same generation, `Handoff-From: none`, and `Authorization: none`.
6. Do not authorize a different ID.
7. Do not set `paused` to `false`. Set `paused` to `true` only when the authorized task text says to.

The idle `next-task.md` permits a later human authorization. It is not itself a task. The completion push is a final close, not an authorization handoff.

When `promotion` is `automatic`, the completion update is the atomic final control commit defined above. Do not implement the ID that commit authorizes.

## Block

If a required check fails, required tooling is unavailable, or the task needs a schema, dependency, provider, paid-service, secret, or architecture decision that its own text does not authorize:

1. Set that item to `blocked` and leave `active_id` on that ID.
2. Set `handoff_state` to `blocked`. Leave `handoff_generation` unchanged.
3. Do not append `consumed.md`. A blocked ID may be retried.
4. Replace `next-task.md` with the blocked body below. Fill in the ID and the unchanged generation. `## Authorization:` is `none`.
5. Do not change or promote any other item.
6. Stop.

A human may later set that item back to `queued`, set `active_id` to `none`, set `handoff_state` to `idle`, and write the idle `next-task.md` without increasing generation. A later authorization from that idle state uses a new generation. Use a new ID for different work. A completed ID is never reused. Returning an item to `queued` does not execute it.

## Pause and resume

Pause: set `paused: true` in a commit pushed to `dev_test` by `Arildb88`. Agents that see `paused: true` stop before any edit, including when `next-task.md` changed in that push. Pausing does not change `handoff_generation`.

Resume: set `paused: false` in a commit pushed by `Arildb88`. Clearing the flag does not start work and does not change `handoff_generation`. The next push that starts work must be a from-idle human authorization. Bumping `Promoted:` on an ID that is already active is not that handoff.

`QUEUE-CONTROL-002` left the queue paused. Later human commits set `paused: false`. `QUEUE-CONTROL-003` keeps `paused: false` and `promotion: manual`. It does not authorize a product task. Product work starts only from a later from-idle human authorization.

## Inspect

Read the Control block, each Queue status, `consumed.md`, and `next-task.md`.

- Idle: `handoff_state: idle`, `active_id: none`, no `blocked` item, `next-task.md` is the idle body, and `## Authorization:` is `none`. Generation stays at the highest spent generation.
- Awaiting claim: `next-task.md` is a from-idle token (`## Authorization: authorized`, Generation = control generation + 1, `Handoff-From: none`) and the control block is still idle. This is an authorization. It is not permission for a second run to write a different token.
- Authorized and claimed: `handoff_state: authorized`, one `active` item, `active_id` matches, and `## Generation:` matches `handoff_generation`.
- Blocked: `handoff_state: blocked`, one `blocked` item, `active_id` matches, and `next-task.md` is the blocked body. Generation is unchanged.
- Paused: `paused: true`. No handoff is valid until a human sets `paused: false`.

## Loop prevention

- One authorization at a time. Only a from-idle human token or an automatic final control commit creates it.
- Cursor never enqueues, never writes a next-task token while `promotion` is `manual`, and never invents an ID.
- The trigger may remain Anyone. A push that is not an authorization handoff stops with no writes. That includes implementation commits, PR updates, report updates, claim commits, same-ID edits, `Promoted:`-only edits, and merges that are not the automatic final control commit.
- A final close leaves the idle file and the same generation, so the completion push cannot start another implementation.
- A consumed ID cannot be promoted or executed again.
- A blocked item is not consumed and is not skipped. The queue waits. A token must not replace it.
- `paused: true` stops the run before writes.
- One successful run completes one ID. It does not start the next ID in that same run.
- Do not set `promotion: automatic` from an agent run.
- Do not reset `handoff_generation` downwards.

## Replacement Cursor Agent Instructions

Observed overlap on 2026-10-02 for automation `af62016d-be2e-11f1-bb68-864e54d14197`:

- `DB-SUPABASE-002` completed in `3a85248f8575bb6a7e096c7cd18087f1bcccf926`. That commit wrote `GEO-ELEVATION-002` into `next-task.md` while `promotion` was `automatic`.
- A second run started from that push and opened pull request 32 on `feature/geo-elevation-002-altitude-validation`.
- Generation `1` was later published for `GEO-ELEVATION-002` and then left inconsistent with an idle control block. That body is not an authorization. Generation `1` stays spent.
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

There are exactly two valid handoffs:

A. From-idle human/ChatGPT authorization. One commit changes docs/agent-control/next-task.md and does not change docs/agent-control/task-queue.md or docs/agent-control/consumed.md. The parent is idle: paused false, handoff_state idle, active_id none, next-task ID none, no blocked item. The new file names a different task ID that is already queued and unconsumed, Generation is exactly the parent handoff_generation plus 1, Handoff-From is none, and Authorization is authorized. The queue item does not need to be active in that commit.

B. Cursor-to-Cursor automatic final control update, and only when promotion is automatic. The same commit marks the previous ID completed, appends that ID to consumed.md, activates exactly one next queued ID, increments generation by exactly 1, writes that next-task.md token with Handoff-From set to the completed ID and Authorization authorized, and updates the report. Do not execute that new ID in the run that wrote the commit.

A change to docs/agent-control/next-task.md is required for a handoff and is not sufficient. Reject all of the following before any edit:

- The push does not change docs/agent-control/next-task.md.
- The push keeps the same task ID, including a Promoted-only edit.
- The new next-task.md is idle or blocked, its ID is none, or Authorization is not authorized.
- Generation does not increase by exactly 1 from the parent handoff_generation.
- paused is true.
- The parent was not idle, and this push is not the automatic final control update that completes that parent ID.
- The commit tries to replace an active or blocked task.
- promotion is manual, and the push tries to authorize a different ID from a completion commit.
- The ID is consumed, or it is not queued and unconsumed for a from-idle token.
- The push changes task-queue.md or consumed.md but is not the automatic final control update.
- The push is an implementation commit, PR update, report update, claim commit, or merge that is not handoff B.

The trigger may remain Anyone. Do not treat the pushing GitHub account as proof of authorization.

QUEUE ENTRY CHECK

Apply the Agent entry check in docs/agent-control/task-queue.md. STOP with no repository writes if it fails.

In particular:

- Never execute an idle next-task.md.
- Never execute a consumed task ID.
- Never execute a from-idle token unless the parent was idle and the token checks pass.
- For a from-idle token, active_id may still be none and the item may still be queued. Claim it only after validation. Do not treat that missing claim as a reason to invent a different task.
- Never execute work while the queue is paused.
- Never execute a push that is not the authorization handoff for this generation.
- Never invent, enqueue, or expand a task.
- Never skip or replace a blocked task.
- Execute at most ONE task ID per automation run.

IMPLEMENTATION

If the entry check succeeds:

1. Treat next-task.md as the complete authorized scope.
2. Claim the task before other edits when the queue has not claimed it yet: status active, active_id set to the token ID, handoff_generation set to the token generation, handoff_state authorized. Do not change the token ID, Generation, Handoff-From, or Authorization. The claim is not a new authorization.
3. Follow guardrails.md strictly.
4. Start from the latest dev_test.
5. Create the required feature/* or fix/* branch.
6. Do not expand scope or invent features.
7. Never modify or merge into dev or main.
8. Before merging or finalizing on dev_test, fetch dev_test again. Stop without merging if paused is true, the token ID is consumed, active_id is a different ID, handoff_generation is greater than this token, handoff_state is blocked, or next-task.md names a different ID or generation. Continue only if this token is still present and the ID is still unclaimed or already claimed as this same ID at this same generation.
9. Run only tests or checks that provide new evidence for the task. Prefer focused tests. Do not rerun broad suites merely because they passed recently. Run broader verification only when the task materially affects that area or next-task.md explicitly requires it.
10. Never expose or commit secrets.

BLOCKED TASK

If a required check fails, required tooling is unavailable, or the task requires an unauthorized schema change, dependency, provider, paid service, secret, architecture decision, or other work outside next-task.md, apply the Block rule from task-queue.md.

Do not consume the task. Do not promote another task. Do not increase handoff_generation. Set Authorization to none. Update the report. STOP.

SUCCESS

If the task succeeds and promotion is manual:

1. Commit the implementation.
2. Open a PR targeting dev_test.
3. Merge only into dev_test when guardrails.md permits it and every required check has passed.
4. Apply the Success rule from task-queue.md in that completion update:
   - mark the current ID completed
   - append it to consumed.md
   - set active_id to none
   - set handoff_state to idle
   - leave handoff_generation unchanged
   - write the idle next-task.md with Authorization none
5. Do not authorize another ID while promotion is manual.
6. Update docs/agent-reports/latest.md with the completed work, the tests and checks actually run, the tests intentionally not repeated, the commit and PR, architecture decisions, fallbacks, manual validation needed, and remaining issues.
7. STOP.

If the task succeeds and promotion is automatic, write the atomic final control update from task-queue.md instead of the idle close, then STOP. Do not implement the ID that commit authorizes. If no queued unconsumed item remains, write the idle close and STOP.

LOOP PREVENTION

- One automation run executes at most one task ID.
- Never execute a task you just authorized in the same run.
- Never authorize more than one item.
- Never create a new queue item yourself.
- Never reuse a consumed ID.
- Never reset handoff_generation downwards.
- A blocked task stops queue advancement.
- paused: true stops all work.
- An idle next-task.md causes an immediate STOP.
- A triggering push that is not an authorization handoff causes an immediate STOP with no repository writes.
- A same-ID, Promoted-only, claim, implementation, report, or ordinary merge push causes an immediate STOP.

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

## Authorization: none

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

## Authorization: none

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

- status: active
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
