# Pre-merge manual success-close

## Task

`QUEUE-CONTROL-004`. Remove the post-merge success-close gap found when `GEO-ELEVATION-002` merged in pull request 35 before its idle bookkeeping. This run does not execute `ROUTING-WEATHER-002` or any other queued product task.

## Baseline checked before editing

`dev_test` at `c9c1d9fc88822a9b810545437586d9521ce771a1` matched the required baseline:

- `paused: false`
- `active_id: none`
- `promotion: manual`
- `handoff_generation: 2`
- `handoff_state: idle`
- `GEO-ELEVATION-002` completed and consumed
- `ROUTING-WEATHER-002` queued and unconsumed
- `next-task.md` idle, ID `none`, Generation `2`, `Authorization: none`

## Protocol

While `promotion` is `manual`, the accepting run still validates the token and claims the task. It implements on the feature or fix branch and runs required checks first. Only after those checks pass, the same branch receives the success-close:

- current ID `completed` and appended once to `consumed.md`
- `active_id: none`
- `handoff_state: idle`
- `handoff_generation` unchanged
- `promotion` stays `manual`
- idle `next-task.md`, `Authorization: none`, same Generation
- report updated
- no different task authorized

The PR contains both the implementation and that close. Required checks run against that complete branch. The run re-fetches `dev_test`, merges only if ownership was not superseded or paused, and stops. No repository write is required after the merge. The merge push is not an authorization. An Automation run caused by it stops with no writes.

`dev_test` stays authoritative until the merge. An unmerged feature-branch close does not consume the ID. If checks fail or the merge cannot happen, the run does not merge and does not start another task.

`promotion` stays `manual`. Automatic promotion is specified but not enabled. When a human later enables it, the same pre-merge rule applies: the branch tip carries the atomic next-task handoff, PR checks run against that tip, and the merge landing is the handoff a new run must validate. The merging run stops and does not execute the new ID.

## Resulting control state

Unchanged idle baseline:

- `paused: false`
- `active_id: none`
- `promotion: manual`
- `handoff_generation: 2`
- `handoff_state: idle`
- `ROUTING-WEATHER-002` queued and unconsumed
- `next-task.md` unchanged idle body
- no product task authorized

Generation `2` stays spent. The next from-idle human authorization must use Generation `3`.

## Commit / PR

- Branch: `fix/queue-control-004` from `dev_test` at `c9c1d9fc88822a9b810545437586d9521ce771a1`
- Commit: `07a98104423fd65c364606cf8d0650f541b0b771` — docs(agent): close manual tasks before the dev_test merge
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/36 into `dev_test` only. Not merged to `dev` or `main`.

## Files changed

- `docs/agent-control/guardrails.md`
- `docs/agent-control/task-queue.md`
- `docs/agent-reports/latest.md`

`next-task.md` and `consumed.md` are unchanged. No application, Prisma, provider, dependency, or CI file is changed.

## Checks actually run

No API, Flutter, build, analyze, or smoke command. A local consistency read confirmed:

- Control block values remain the idle baseline above.
- Queue item statuses are unchanged, including `GEO-ELEVATION-002` completed and `ROUTING-WEATHER-002` queued.
- `consumed.md` still has a `GEO-ELEVATION-002` row and no `ROUTING-WEATHER-002` row.
- `next-task.md` is still the idle body at Generation `2`.
- The protocol text requires the manual success-close before merge and forbids a post-merge write.

## Checks intentionally not repeated

No `npm test`, `npm run build`, `scripts/smoke-api.sh`, GitHub `api-ci`, Flutter test, Flutter analyze, or mobile build.

## Architecture / config

No schema, dependency, provider, package, or database change. The Cursor Automation prompt was not edited from this run. A human pastes the replacement block in `docs/agent-control/task-queue.md`.

## Manual validation needed

Replace the Cursor implementation-agent instructions with that paste block. Leave the trigger able to fire for Anyone.

## Remaining issues

- The installed Automation prompt is unchanged until a human pastes the replacement block.
- `ROUTING-WEATHER-002` remains queued. This run does not authorize it.
