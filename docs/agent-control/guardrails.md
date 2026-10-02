# RideWear Agent Guardrails

## Branch policy
- `dev_test` is the integration/testing branch.
- `dev` and `main` are human-controlled. NEVER merge, push, rebase, reset, force-push, or otherwise modify them.
- Start implementation work from the latest `dev_test`.
- Use a `feature/*` or `fix/*` branch.
- Merge to `dev_test` only after all required tests pass.

## Scope control
- Read this file, `docs/agent-control/next-task.md`, `docs/agent-control/task-queue.md`, and `docs/agent-control/consumed.md` before implementation.
- Apply the agent entry check in `task-queue.md` before any edit. If it fails, STOP with no repository writes.
- Implement only the task explicitly authorized in `next-task.md`.
- Do not invent features, IDs, or queue items.
- Do not change architecture, database schema, external providers, paid services, or dependency versions unless `next-task.md` explicitly authorizes it.
- Do not remove existing functionality.
- If a required decision is ambiguous or outside the authorized scope, mark the active queue item blocked when one exists, report the decision needed, and STOP. Do not promote another item.

## Queue
Authoritative rules live in `docs/agent-control/task-queue.md`. This section restates the constraints agents must not weaken.

- Only GitHub user `Arildb88` may enqueue or edit future task text, by a push to `dev_test`. ChatGPT may draft that text. Cursor must not.
- `next-task.md` is the authorization token. It authorizes work only when the triggering push is an authorization handoff. There are exactly two kinds.
- From idle, a human or ChatGPT authorizes one already queued, unconsumed ID with one commit that changes `next-task.md` and does not change `task-queue.md` or `consumed.md`. That commit must set a new task ID, `Generation` to the previous accepted generation plus 1, `Handoff-From: none`, and `Authorization: authorized`. The item does not need to become `active` in that commit. The accepting run claims it only after the token validates. This exception must not replace an active or blocked task.
- Cursor may authorize a different ID only in the automatic final control commit, after the current task has fully succeeded, and only when `promotion` is `automatic`. That commit marks the previous ID completed, appends it to `consumed.md`, activates exactly one next queued ID, increments generation by exactly 1, writes the new token, and updates the report. The same run must not execute the new ID. While `promotion` is `manual`, completion is an idle close and must not authorize another ID.
- `handoff_generation` increases by exactly 1 only on one of those handoffs. A generation that has appeared on `dev_test` is spent. Never reset it downwards. A same-ID push, including a `Promoted:` edit, is not an authorization.
- A normal implementation commit, PR update, report update, claim, merge, same-ID edit, or `Promoted:`-only edit must not authorize work. A trigger from that push stops with no repository writes.
- The trigger may remain Anyone. Entry logic rejects non-handoff pushes. Changing which GitHub actor fires the automation is not the concurrency control.
- While `promotion` is `manual`, Cursor must not write the next task into `next-task.md`.
- On success while `promotion` is `manual`: mark that ID `completed`, append `consumed.md`, set `active_id` to `none`, set `handoff_state` to `idle`, leave `handoff_generation` unchanged, write the idle `next-task.md` with `Authorization: none`, and STOP.
- On a failed required check, missing required tool, or unauthorized schema, dependency, provider, paid-service, secret, or architecture decision: mark that ID `blocked`, set `handoff_state` to `blocked`, leave `handoff_generation` unchanged, do not append `consumed.md`, write the blocked `next-task.md` with `Authorization: none`, and STOP.
- A consumed ID must not run again.
- Pause by setting `paused: true` and pushing as `Arildb88`. Agents then STOP with no writes. Resume by setting `paused: false` in an `Arildb88` push. Clearing the flag does not start work and does not change `handoff_generation`.
- `dev` and `main` stay human-controlled. Do not merge, push, rebase, reset, or force-push them.
- Inspect status in the queue Control block, item statuses, `consumed.md`, and `next-task.md`.
- One run executes at most one task ID. The replacement Cursor Agent Instructions live in `docs/agent-control/task-queue.md` under "Replacement Cursor Agent Instructions". A human installs that text. An agent run must not claim the automation prompt was changed.

## Quality
- Preserve the existing Flutter -> NestJS API -> external-provider architecture.
- Keep provider secrets server-side.
- Prefer existing abstractions and provider-independent domain models.
- Add/update focused tests for changed behavior.
- Run every test/build command required by `next-task.md`.
- If required tests fail, do not merge.

## Completion
After successful implementation:
1. Commit the feature/fix branch.
2. Open a PR targeting `dev_test`.
3. Merge only to `dev_test` after required tests pass.
4. Update `docs/agent-reports/latest.md` with task, branch/commit/PR, files changed, tests/build results, config/architecture changes, manual checks, and remaining issues.
5. Apply the queue success rule. While `promotion` is `manual`, that commit is a final close: idle `next-task.md`, `Authorization: none`, `handoff_state: idle`, and the same `handoff_generation`. Do not authorize a different ID. While `promotion` is `automatic`, that commit is the atomic final control update and this run stops without executing the new ID. Before merging or finalizing on `dev_test`, fetch it again and stop if the accepted generation or task ownership was superseded or the queue was paused. A missing generation is `0`.
6. STOP. One run completes at most one ID.
