# Pre-approved agent task queue

## Task

`QUEUE-CONTROL-001`. Add a repository-controlled queue so a later Cursor run can execute only a task Arild has already written down. This run does not implement PostgreSQL.

## Queue mechanism

`docs/agent-control/next-task.md` is the only active authorization. After this task it is the idle file (`Type: NONE`), so nothing is authorized.

`docs/agent-control/task-queue.md` holds the ordered pre-approved items, the control flags (`paused`, `active_id`, `promotion`), and the promotion, success, block, pause, resume, and inspect rules. Status values are `queued`, `active`, `completed`, and `blocked`. At most one item is active.

`docs/agent-control/consumed.md` is an append-only ledger. An ID with a row must not run again. Blocked IDs are not written there, so a human can retry the same ID after changing the task. New work needs a new ID.

`promotion` is `manual`. Only a push to `dev_test` by GitHub user `Arildb88` may enqueue, edit a queued body, or promote the first `queued` item into `next-task.md`. The promoted file must match that item's promotable body except the `Promoted:` time. Cursor must not promote.

## DB-POSTGRES-001

Intentionally waiting as `queued`. It was not promoted and not executed. Its promotable body is stored in the queue and points at sections 3 through 8 of `docs/architecture/SUPABASE_POSTGRES_MIGRATION_PLAN.md`.

Automatic promotion is not proven. The current automation does not start on `app/cursor` pushes, so writing the Postgres task into `next-task.md` from this run would leave a latent authorization instead of running it safely. Safety takes priority.

## Automation behavior

What works today, without an automation edit:

- Trigger: push to `dev_test` by `Arildb88`.
- The prompt continues only when that push changes `docs/agent-control/next-task.md`.
- The agent then applies the entry check in `task-queue.md` and `guardrails.md`. Idle, paused, consumed, or mismatched tasks stop with no writes.
- Completion is merged by `app/cursor`. That push does not start another run. Pull request 27 merged at `2026-10-02T07:37:45Z` as `6cb14cde2a3a0236c27e7f0bc17d26f423ca0074`, and the next run started only after `Arildb88` pushed `5e184549b3ea8413bcd856b4c433f9419d82a8b0`.

What a human must change before the queue can advance itself, both parts, on automation `af62016d-be2e-11f1-bb68-864e54d14197`:

1. Also fire on `dev_test` pushes by `app/cursor`. Prefer a path filter for `docs/agent-control/next-task.md` when the product has one.
2. Add the seven prompt steps in `task-queue.md` under "Minimal change a human must install": one changed `next-task.md`, the entry check, one ID per run, block without promoting, and on success promote at most the next already-queued item in that same update, then stop without starting it.

After both are saved, `Arildb88` sets `promotion: automatic` in a separate push. The first cycle is still a human promotion, so the new trigger is proven before a second item can follow. This run does not set `automatic` and does not edit the automation.

## Loop prevention

- One active `next-task.md` at a time.
- Cursor does not enqueue and does not promote while `promotion` is `manual`.
- Success writes the idle `next-task.md` and does not start another ID.
- Agent merges do not match the current trigger.
- A consumed ID cannot be promoted again.
- A blocked item stops the queue. The next item stays `queued`.
- `paused: true` stops a run before any write, even if `next-task.md` changed.

## Pause and resume

Pause: `Arildb88` sets `paused: true` in `task-queue.md` and pushes to `dev_test`.

Resume: `Arildb88` sets `paused: false`. That alone does not start work. The same or a later `Arildb88` push must promote one queued item so `next-task.md` changes. If the body is already in the file, change only `Promoted:`.

Inspect: queue Control block, item status, `consumed.md`, and `next-task.md`.

## Commit / PR

- Branch: `feature/agent-task-queue` from `dev_test` (`5e184549b3ea8413bcd856b4c433f9419d82a8b0`)
- Queue commit: `052a275d0bd04f3b58d09f81c06ee46f50f42b1f` — docs: add pre-approved agent task queue
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/28
- Merge: fast-forward into `dev_test` only. `dev` and `main` are unchanged. The `dev_test` tip is the commit that adds this report.
- Required checks: none. This task is documentation-only and forbids the API and Flutter suites. `api-ci` path filters do not include `docs/`.

## Files changed

- `docs/agent-control/task-queue.md`
- `docs/agent-control/consumed.md`
- `docs/agent-control/guardrails.md`
- `docs/agent-control/next-task.md`
- `docs/agent-reports/latest.md`

## Tests / build / smoke

Not run. `next-task.md` forbids `npm test`, Flutter test, Flutter analyze, builds, and smoke for this documentation-only change. No application code, dependency, or workflow file changed.

## Architecture / config

No datasource, schema, migration, dependency, provider, or secret change. Queue state is Git files only. `promotion` remains `manual`. No GitHub Action, bot, token, or scheduled job was added.

## Fallback

Leave `promotion: manual` and do not promote `DB-POSTGRES-001` until a human chooses to. The SQLite app is unchanged. If the documented trigger assumption is wrong and an agent merge starts a run against the idle `next-task.md`, the entry check stops that run with no writes.

## Manual validation recommended

Review the promotion, pause, and idle-file rules before the first `Arildb88` promotion. Do not install the automatic-promotion trigger until that manual path is acceptable. Hosted Supabase is still not in this task.

## Remaining issues

- Automatic queue advancement is not installed and is not claimed to work.
- `DB-POSTGRES-001` is queued, not started.
- PostgreSQL is not implemented. Local instructions and CI still use SQLite.
- `docker-compose.yml` still advertises a Postgres URL that does not match the SQLite schema.
