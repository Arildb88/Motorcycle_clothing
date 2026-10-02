# Authorized RideWear Task

## Type: IMPLEMENTATION

## Task: Add a safe pre-approved agent task queue

Implement a repository-controlled queue so the existing Cursor automation can advance through tasks that Arild/ChatGPT have explicitly pre-approved, without allowing the agent to invent work or expand scope.

Read first:
- `docs/agent-control/guardrails.md`
- `docs/agent-control/next-task.md`
- `docs/agent-reports/latest.md`
- `docs/architecture/SUPABASE_POSTGRES_MIGRATION_PLAN.md`

### Goal

Keep `next-task.md` as the single active authorized task, and add a separate queue for future tasks that have already been explicitly approved.

The queue must be deterministic, reviewable in Git, safe against loops, and stop on blockers.

### Required design

Create a minimal queue/control design under `docs/agent-control/`.

At minimum provide:
- `task-queue.md` containing ordered pre-approved tasks with stable IDs and status.
- Clear queue states such as `queued`, `active`, `completed`, `blocked` (use the smallest sensible representation).
- A deterministic rule for promoting exactly one queued task to `next-task.md`.
- A durable way to record that a task has already been consumed so the same task cannot run twice.
- A rule that only tasks already written in the queue by an authorized human/coordinator may be promoted. Cursor must never create a new product/implementation task on its own.
- One active task at a time.
- If the active task is blocked, fails required checks, requires an unauthorized schema/dependency/provider/paid-service/secret/architecture decision, or otherwise needs human judgment: mark/report blocked and STOP. Do not consume the next queue item.
- If a task succeeds: update report/control state and permit the next pre-approved queue item to become active according to the mechanism below.

### Trigger/loop constraint

The existing Cursor Automation is triggered by pushes to `dev_test` by the user's GitHub identity and its current instruction checks whether `next-task.md` changed in the triggering push.

Design the queue around that constraint. Do not create an uncontrolled self-trigger loop.

Prefer the smallest reliable Git-based mechanism. If fully automatic queue advancement cannot be made reliable with the current trigger/identity constraints without changing Cursor Automation configuration, document the exact minimal Automation instruction/trigger change required and STOP before pretending it is automatic.

Do not add external services, GitHub Actions, bots, tokens, scheduled jobs, or dependencies merely to make the queue work.

### Initial queue contents

After the queue mechanism is defined, add exactly ONE pre-approved future implementation item:

ID: `DB-POSTGRES-001`
Title: `Implement Prisma PostgreSQL foundation`

Scope for that queued item must come from `docs/architecture/SUPABASE_POSTGRES_MIGRATION_PLAN.md` and include:
- Prisma datasource -> PostgreSQL and Prisma 5.22 `directUrl`.
- Preserve models.
- Archive SQLite migration history and create one reviewed PostgreSQL baseline.
- Update local development/CI/smoke configuration to Postgres 16.
- No Supabase credentials committed.
- Do not connect/apply to the user's hosted Supabase database automatically.
- Targeted verification first; only database-relevant broader checks. No Flutter tests.
- Hosted Supabase apply remains a manual/operator step after local verification and confirmation that `public` is empty.

Do NOT execute DB-POSTGRES-001 during this queue-implementation task unless the queue mechanism can safely promote it only after this task has completed and the automation behavior is proven. Safety takes priority over consuming the queue.

### Documentation / guardrails

Update `guardrails.md` only as necessary to make queue behavior authoritative and unambiguous.

Document:
- who may enqueue work
- promotion rules
- success/block behavior
- loop prevention
- how ChatGPT/human can pause the queue
- how to resume
- how to inspect status

### Tests / capacity rule

This task should primarily change control documentation/configuration, not application production code.

Do not run API/Flutter test suites, builds, analyze, or smoke tests for documentation-only changes.
If executable repository automation code is genuinely necessary, use focused validation only and explain why.

### Explicitly out of scope

- Do not implement PostgreSQL in this task unless safe post-completion promotion is actually proven.
- No Supabase connection or secrets.
- No production app feature.
- No dependencies.
- No external queue service.
- No GitHub Actions solely for the queue.
- Do not modify `dev` or `main`.

### Completion

Work from latest `dev_test` on a focused `feature/*` branch.
Merge successful work only to `dev_test` according to guardrails.
Update `docs/agent-reports/latest.md` with:
- queue mechanism
- files changed
- exact automation behavior required
- whether DB-POSTGRES-001 is queued, promoted, or intentionally waiting
- loop prevention
- pause/resume procedure
- remaining limitations

Then STOP unless the proven queue mechanism itself safely performs the explicitly authorized promotion.
