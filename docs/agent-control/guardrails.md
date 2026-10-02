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
- `next-task.md` authorizes work only when the triggering push is an authorization handoff. Queue status `active` must match its ID, or both must show that nothing is active.
- `handoff_generation` increases by exactly 1 only when a different task ID is authorized. A same-ID push, including a `Promoted:` edit, is not an authorization.
- A different next task ID may be authorized only by the completed task's final control update, or by a human authorization from idle (`ID: none` and `active_id: none`). An ordinary or mid-task push cannot authorize another implementation run.
- The trigger may remain Anyone. Entry logic rejects non-handoff pushes. Changing which GitHub actor fires the automation is not the concurrency control.
- Promote at most one `queued` item, and only by the promotion rule. While `promotion` is `manual`, only `Arildb88` promotes, and only from idle. Cursor must not write the next task into `next-task.md`.
- On success: mark that ID `completed`, append `consumed.md`, set `active_id` to `none`, set `handoff_state` to `idle`, leave `handoff_generation` unchanged, write the idle `next-task.md`, and STOP. Do not start the next item in the same run.
- On a failed required check, missing required tool, or unauthorized schema, dependency, provider, paid-service, secret, or architecture decision: mark that ID `blocked`, set `handoff_state` to `blocked`, leave `handoff_generation` unchanged, do not append `consumed.md`, write the blocked `next-task.md`, and STOP.
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
5. Apply the queue success rule. That commit is a final close: idle `next-task.md`, `handoff_state: idle`, and the same `handoff_generation`. While `promotion` is `manual`, do not authorize a different ID. Before merging to `dev_test`, fetch it again and stop if `paused` is true, `active_id` is no longer this ID, or `handoff_generation` has changed from the value this run started from. A missing generation is `0`. If the fetched control block contains `handoff_state`, also stop unless it is still `authorized`.
6. STOP. One run completes at most one ID.
