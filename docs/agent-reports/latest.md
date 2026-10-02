# Human idle-token authorization

## Task

`QUEUE-CONTROL-003`. Repair the control plane so a human or ChatGPT can authorize a queued task with one `next-task.md` commit, while Cursor-to-Cursor promotion stays an atomic final control commit. This run does not execute `GEO-ELEVATION-002` or any product task.

The repository was inconsistent after a rejected handoff. `next-task.md` still contained the `GEO-ELEVATION-002` body at Generation `1`, while the control block said `handoff_generation: 0`, `active_id: none`, and `handoff_state: idle`. That body was not executed.

## Protocol

Two authorization handoffs exist. Every other push stops with no repository writes.

1. From-idle human/ChatGPT token. One commit changes `docs/agent-control/next-task.md` and does not change `task-queue.md` or `consumed.md`. It names a new ID that is already queued and unconsumed, sets Generation to the previous accepted generation plus 1, `Handoff-From: none`, and `Authorization: authorized`. The item does not need to become `active` in that commit. The accepting run claims it only after the token validates. This path cannot replace an active or blocked task.
2. Cursor-to-Cursor automatic final control update, only when `promotion` is `automatic` and the current task has fully succeeded. One commit marks the previous ID completed, appends it to `consumed.md`, activates exactly one next queued ID, increments generation once, writes the new token, and updates the report. The same run does not execute the new ID.

Implementation commits, PR updates, report updates, claims, ordinary merges, same-ID edits, and `Promoted:`-only edits are not authorizations. Before a task merges or finalizes, the run fetches `dev_test` again and stops if generation or ownership was superseded or the queue was paused.

`promotion` stays `manual`. Cursor must not write the next token while that mode is in force.

## Generation baseline

Generation `1` is spent. It appeared on `dev_test` in:

- `15f2dae8e6c0fe5a5f3fc8284853669541f586e0` — `chore(agent): authorize elevation handoff generation 1`
- `e668b09c97df165a34c59a2b1ceaf1f5bdbeade5` — `chore(agent): handoff GEO-ELEVATION-002 generation 1`
- `d7125a9d8c8ae907e5d69a6cdf576642adaf32cf` — `chore(agent): restore idle before atomic handoff`

`d7125a9` reset the control block to generation `0` and left the stale task body. This repair does not repeat that reset. The idle baseline is generation `1`. The next from-idle human authorization must use Generation `2`.

## Resulting control state

- `paused: false`
- `active_id: none`
- `promotion: manual`
- `handoff_state: idle`
- `handoff_generation: 1`
- `next-task.md` is the idle body, Generation `1`, `Authorization: none`
- `GEO-ELEVATION-002` remains `queued`
- `GEO-ELEVATION-002` has no row in `consumed.md`

## Commit / PR

- Branch: `fix/queue-control-003` from `dev_test` at `d7125a9d8c8ae907e5d69a6cdf576642adaf32cf`
- Commit: recorded in the follow-up docs commit on this branch
- PR: against `dev_test` only. Not merged to `dev` or `main`.

## Files changed

- `docs/agent-control/guardrails.md`
- `docs/agent-control/task-queue.md`
- `docs/agent-control/next-task.md`
- `docs/agent-reports/latest.md`

`consumed.md` is unchanged. No application, Prisma, database, dependency, provider, CI, Flutter, or API file is changed.

## Tests / checks actually run

No API, Flutter, build, analyze, or smoke command. This task forbids them. The local read after the edit confirms:

- Control block is `paused: false`, `active_id: none`, `promotion: manual`, `handoff_generation: 1`, `handoff_state: idle`.
- `next-task.md` is the idle body at Generation `1` with `Authorization: none`.
- `GEO-ELEVATION-002` is `queued`. No item is `active` or `blocked`.
- `consumed.md` has no `GEO-ELEVATION-002` row.
- The Queue section of `task-queue.md` is unchanged from `d7125a9`.

## Tests intentionally not repeated

No `npm test`, `npm run build`, `scripts/smoke-api.sh`, GitHub `api-ci`, Flutter test, Flutter analyze, or mobile build.

## Architecture / config

No schema, dependency, provider, package, or database change. `promotion` stays `manual`. The Cursor Automation prompt was not edited from this run. A human pastes the replacement block in `docs/agent-control/task-queue.md` under "Replacement Cursor Agent Instructions".

## Manual validation needed

Replace the Cursor implementation-agent instructions with that paste block. Leave the trigger able to fire for Anyone. Do not treat the paste as done until it is saved in the automation.

Do not authorize `GEO-ELEVATION-002` from this repair. A later authorization, after this idle baseline is on `dev_test`, is a separate from-idle commit whose Generation is `2`.

## Remaining issues

- The Cursor Automation still has the previous prompt until a human pastes the replacement instructions.
- Pull request 32 was not merged, closed, or continued by this run.
- Hosted Supabase apply remains a manual operator step from `DB-SUPABASE-002`.
