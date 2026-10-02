# Abandoned claim recovery

## Task

`QUEUE-CONTROL-005`. Document and apply a human abandoned-claim recovery for `CYCLING-001` generation `4`. This run does not implement `CYCLING-001` or any other product task.

## Incident

`CYCLING-001` generation `4` was validly authorized in `6601fd8` and claimed in `74665b915ff13593fce2780d71b601fdfe2b584f`. The accepting implementation run was cancelled before completion. No implementation pull request for that claim was merged. No surviving implementation run owns the claim. A later Automation run triggered by the claim correctly rejected that commit and made no writes.

Authoritative `dev_test` before this recovery:

- `paused: false`
- `active_id: CYCLING-001`
- `promotion: automatic`
- `handoff_generation: 4`
- `handoff_state: authorized`
- `CYCLING-001` active and unconsumed
- `next-task.md` still held the generation `4` authorized token

## Protocol

Abandoned-claim recovery is an explicit human or ChatGPT control action. A claim becoming abandoned must never automatically authorize another agent run. Cursor must not recover its own active claim, must not infer abandonment from elapsed time, and must not use a timeout, lease, heartbeat, or takeover.

The recovery commit returns the same task to a safe idle retry state: status `queued`, `active_id: none`, `handoff_state: idle`, `handoff_generation` unchanged, `promotion` unchanged, `consumed.md` unchanged, and `next-task.md` replaced by the idle body at the same generation with `Handoff-From: none` and `Authorization: none`.

That commit is not an authorization handoff. An Automation run triggered by it must stop with no repository writes. Generation `4` stays permanently spent. A later retry of `CYCLING-001` requires a new from-idle authorization at Generation `5`. This recovery does not mark the task completed, does not append `consumed.md`, does not authorize another task, and does not advance to `ALPINE-001`.

The installed Cursor Automation prompt was not changed. A human pastes the Replacement Cursor Agent Instructions from `docs/agent-control/task-queue.md` after this pull request merges.

## Resulting control state

- `paused: false`
- `active_id: none`
- `promotion: automatic`
- `handoff_generation: 4`
- `handoff_state: idle`
- `CYCLING-001` queued and unconsumed
- `ALPINE-001` queued
- `XC-SKI-001` queued
- `WEATHER-PROVIDER-RESEARCH-002` queued
- `ADS-001` queued
- `next-task.md`: ID `none`, Generation `4`, Handoff-From `none`, Authorization `none`
- no product task authorized

Generation `4` is spent. The next explicit from-idle retry of `CYCLING-001` must use Generation `5`.

## Commit / PR

- Branch: `fix/queue-control-005-abandoned-claim` from `dev_test` at `74665b915ff13593fce2780d71b601fdfe2b584f`
- PR: pending, targeting `dev_test` only. Not merged to `dev` or `main`.

## Files changed

- `docs/agent-control/task-queue.md`
- `docs/agent-control/guardrails.md`
- `docs/agent-control/next-task.md`
- `docs/agent-reports/latest.md`

`docs/agent-control/consumed.md` is unchanged. `CYCLING-001` has no consumed row.

## Checks actually run

Deterministic reads of the control files only: Control block, queue statuses, `next-task.md` fields, and a clean diff for `consumed.md`. No API tests. No Flutter tests. No builds. No smoke tests.

## Architecture / config

No application code, schema, dependency, provider, CI, or database change.

## Remaining issues

`CYCLING-001` is queued again and is not authorized. `ALPINE-001` and later items stay queued. Do not start them from this recovery.
