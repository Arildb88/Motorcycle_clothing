# Final-handoff authorization protocol

## Task

`QUEUE-CONTROL-002`. Harden the automation final-handoff protocol so an ordinary or mid-task push cannot start another implementation run. Authorized by `22582b0b4203726dec8f489c84ff3123cca99f65`.

## Entry check

Trigger commit `22582b0b4203726dec8f489c84ff3123cca99f65` (`chore(agent): retrigger final-handoff hardening`, GitHub user `Arildb88`) changed only `docs/agent-control/next-task.md` (`Promoted`).

The entry check used the rules on `dev_test` at the start of this run, before this commit replaced them:

- `paused` was `false`.
- Type was `CONTROL`. ID was `QUEUE-CONTROL-002`.
- That ID had no row in `consumed.md`.
- It was the only Queue item with status `active`.
- `active_id` was `QUEUE-CONTROL-002`.
- No item was `blocked`.
- `next-task.md` matched that item's promotable body except `Promoted: 2026-10-02T09:43:00Z`.

The entry check succeeded. `GEO-ELEVATION-002` was already `queued` and was not executed.

## Completed work

Repository control protocol only. `handoff_generation` and `handoff_state` now define when a `dev_test` push may authorize a task.

- An authorization handoff is the only push that may start implementation. The push must change `next-task.md`, increase `handoff_generation` by exactly 1, set `handoff_state` to `authorized`, and name a different unconsumed ID.
- A different next ID is legal only from idle (human authorization; parent ID `none`) or from the completed task's final control update (previous ID completed and consumed in that same commit, and only when `promotion` is `automatic`).
- Same-ID edits, `Promoted:` bumps, idle writes, blocked writes, pauses, resumes, implementation merges, and report updates are not authorizations.
- The trigger may stay Anyone. The pushing account is not the concurrency control.
- One run still executes at most one ID. Consumed IDs, blockers, human pause, and the ban on modifying `dev` and `main` stay in force.
- The exact replacement Cursor Agent Instructions are in `docs/agent-control/task-queue.md` under "Replacement Cursor Agent Instructions". This run did not edit the Cursor Automation. A human pastes that block.

Completion state:

- `QUEUE-CONTROL-002` is `completed` and appended to `consumed.md`.
- `paused: true`, `active_id: none`, `promotion: manual`, `handoff_generation: 0`, `handoff_state: idle`.
- `next-task.md` is the idle body. This completion is a final close. It does not authorize another ID.
- `GEO-ELEVATION-002` remains `queued` and has no consumed row.

## Commit / PR

- Branch: `feature/queue-control-002-final-handoff` from `dev_test` at `22582b0b4203726dec8f489c84ff3123cca99f65`.
- Implementation commit: recorded in the following ledger line after this commit is created.
- PR: recorded after it is opened.
- Merge target: `dev_test` only. `dev` and `main` are not modified.

## Files changed

- `docs/agent-control/guardrails.md`
- `docs/agent-control/task-queue.md`
- `docs/agent-control/consumed.md`
- `docs/agent-control/next-task.md`
- `docs/agent-reports/latest.md`

## Tests / checks actually run

No API, Flutter, build, or smoke command. The task forbids them. The check below is a local read of the control files after the edit:

- Control block is `paused: true`, `active_id: none`, `promotion: manual`, `handoff_generation: 0`, `handoff_state: idle`.
- `next-task.md` is the idle body with `Generation: 0` and `Handoff-From: none`.
- `QUEUE-CONTROL-002` is `completed`. `GEO-ELEVATION-002` is `queued`. No item is `active` or `blocked`.
- `consumed.md` gains one `QUEUE-CONTROL-002` row and no `GEO-ELEVATION-002` row.
- `git diff` is limited to the control docs and this report.

## Tests intentionally not repeated

No `npm test`, `npm run build`, `scripts/smoke-api.sh`, GitHub `api-ci`, Flutter test, Flutter analyze, or mobile build. This task does not change application code, dependencies, schema, CI, providers, or database configuration.

## Architecture / config

No schema, dependency, provider, package, or database change. `promotion` stays `manual`. The automation prompt was not changed from this run.

## Fallback

None. The protocol is documentation. No tool or hosted service was required.

## Manual validation needed

A human replaces the Cursor implementation-agent instructions with the paste block in `docs/agent-control/task-queue.md`. Leave the trigger able to fire for Anyone. Do not treat that paste as done until it is saved in the automation.

Pull request 32 (`feature/geo-elevation-002-altitude-validation`) came from the overlapping run that started when `GEO-ELEVATION-002` was promoted. This run did not merge, close, or continue it. Leave it unmerged while the queue is paused. Authorize `GEO-ELEVATION-002` later only with a from-idle handoff after a human sets `paused: false`.

## Queue

`QUEUE-CONTROL-002` is completed and consumed. `active_id` is `none`. `handoff_state` is `idle`. `handoff_generation` is `0`. The queue is paused. No queued item was promoted.

## Remaining issues

- The Cursor Automation still has the previous prompt until a human pastes the replacement instructions. After this final close is on `dev_test`, a run that follows `task-queue.md` stops, because the idle file is not an authorization handoff.
- Hosted Supabase apply remains a manual operator step from `DB-SUPABASE-002`.
- Pull request 32 is still open. `GEO-ELEVATION-002` is queued, not consumed, and was not started by this run.
