# Pre-approved task queue

`docs/agent-control/next-task.md` is the authorization token. An agent may execute it only when the triggering push is an authorization handoff defined below. A push that merely edits that file is not an authorization. This file is the ordered list of later tasks that Arild has already approved. `docs/agent-control/consumed.md` records IDs that have already completed.

Cursor must not add a product or implementation task to this file.

## Control

```text
paused: false
active_id: PERFORMANCE-001
promotion: automatic
handoff_generation: 35
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

Generation `1` is spent. It appeared on `dev_test` in `15f2dae8e6c0fe5a5f3fc8284853669541f586e0`, `e668b09c97df165a34c59a2b1ceaf1f5bdbeade5`, and `d7125a9d8c8ae907e5d69a6cdf576642adaf32cf` for a rejected `GEO-ELEVATION-002` handoff. `QUEUE-CONTROL-003` restored the idle baseline to `1` and did not reuse it. Generation `2` is also spent: `GEO-ELEVATION-002` completed at that generation and is consumed. Generation `3` is also spent: `ROUTING-WEATHER-002` completed at that generation and is consumed. Generation `4` is also spent: `CYCLING-001` was authorized and claimed at that generation in `6601fd8` and `74665b915ff13593fce2780d71b601fdfe2b584f`, then the owning implementation run was cancelled before completion. `QUEUE-CONTROL-005` returns `CYCLING-001` to `queued` without consuming it and without reusing generation `4`. The idle baseline remains `4`. The next from-idle human authorization, including a retry of `CYCLING-001`, must use Generation `5`. Do not reset the baseline downwards.

Generation `5` is spent: a `CYCLING-001` claim at that generation was recovered without consuming the ID. Generation `6` is spent: `CYCLING-001` was authorized from idle at that generation and completed by the automatic final control update. That update authorizes `ALPINE-001` at generation `7`. Do not reuse generation `6`. Do not execute `CYCLING-001` again.

Generation `7` is spent: `ALPINE-001` completed and the automatic final control update authorizes `XC-SKI-001` at generation `8`. Do not reuse generation `7`. Do not execute `ALPINE-001` again.

Generation `8` is spent: `XC-SKI-001` completed and the automatic final control update authorizes `WEATHER-PROVIDER-RESEARCH-002` at generation `9`. Do not reuse generation `8`. Do not execute `XC-SKI-001` again.

Generation `9` is spent: `WEATHER-PROVIDER-RESEARCH-002` completed and the automatic final control update authorizes `ADS-001` at generation `10`. Do not reuse generation `9`. Do not execute `WEATHER-PROVIDER-RESEARCH-002` again.

Generation `10` is spent: `ADS-001` completed and no queued unconsumed item remained, so the final close is idle at generation `10`. Do not reuse generation `10`. Do not execute `ADS-001` again.

Generation `11` is spent: `INTEGRATION-001` was authorized from idle and completed. The automatic final control update authorizes `MOBILE-ACTIVITIES-001` at generation `12`. Do not reuse generation `11`. Do not execute `INTEGRATION-001` again.

Generation `12` is spent: `MOBILE-ACTIVITIES-001` completed and the automatic final control update authorizes `RECOMMENDATION-UX-001` at generation `13`. Do not reuse generation `12`. Do not execute `MOBILE-ACTIVITIES-001` again.

Generation `13` is spent: `RECOMMENDATION-UX-001` completed and the automatic final control update authorizes `WEATHER-VALIDATION-001` at generation `14`. Do not reuse generation `13`. Do not execute `RECOMMENDATION-UX-001` again.

Generation `14` is spent: `WEATHER-VALIDATION-001` completed and the automatic final control update authorizes `MVP-SMOKE-001` at generation `15`. Do not reuse generation `14`. Do not execute `WEATHER-VALIDATION-001` again.

Generation `15` is spent: `MVP-SMOKE-001` completed and no queued unconsumed item remained, so the final close is idle at generation `15`. Do not reuse generation `15`. Do not execute `MVP-SMOKE-001` again.

Generation `16` is spent: `MANUAL-REGRESSION-001` was authorized from idle and completed. No queued unconsumed item remained, so the final close is idle at generation `16`. Do not reuse generation `16`. Do not execute `MANUAL-REGRESSION-001` again.

Generation `17` is spent: `MANUAL-REGRESSION-002` was authorized from idle and recovered without being consumed. Do not reuse generation `17`.

Generation `18` is spent: `MANUAL-REGRESSION-002` was authorized from idle and completed. The automatic final control update authorizes `ALPINE-RESORTS-001` at generation `19`. Do not reuse generation `18`. Do not execute `MANUAL-REGRESSION-002` again.

Generation `19` is spent: `ALPINE-RESORTS-001` completed and the automatic final control update authorizes `XC-TRAIL-DISCOVERY-001` at generation `20`. Do not reuse generation `19`. Do not execute `ALPINE-RESORTS-001` again.

Generation `20` is spent: `XC-TRAIL-DISCOVERY-001` completed and the automatic final control update authorizes `DEMO-WARDROBE-ACTIVITY-001` at generation `21`. Do not reuse generation `20`. Do not execute `XC-TRAIL-DISCOVERY-001` again.

Generation `21` is spent: `DEMO-WARDROBE-ACTIVITY-001` completed and the automatic final control update authorizes `DEPENDENCY-MAINTENANCE-001` at generation `22`. Do not reuse generation `21`. Do not execute `DEMO-WARDROBE-ACTIVITY-001` again.

Generation `22` is spent: `DEPENDENCY-MAINTENANCE-001` completed and the automatic final control update authorizes `STABILIZATION-001` at generation `23`. Do not reuse generation `22`. Do not execute `DEPENDENCY-MAINTENANCE-001` again.

Generation `23` is spent: `STABILIZATION-001` was authorized at that generation and recovered without being consumed. Do not reuse generation `23`.

Generation `24` is spent: `STABILIZATION-001` was authorized from idle and completed. The automatic final control update authorizes `ALPINE-SNOWBOARD-UNIFY-001` at generation `25`. Do not reuse generation `24`. Do not execute `STABILIZATION-001` again.

Generation `25` is spent: `ALPINE-SNOWBOARD-UNIFY-001` completed and the automatic final control update authorizes `WARDROBE-SHARING-001` at generation `26`. Do not reuse generation `25`. Do not execute `ALPINE-SNOWBOARD-UNIFY-001` again.

Generation `26` is spent: `WARDROBE-SHARING-001` completed and the automatic final control update authorizes `TEST-COVERAGE-001` at generation `27`. Do not reuse generation `26`. Do not execute `WARDROBE-SHARING-001` again.

Generation `27` is spent: `TEST-COVERAGE-001` was authorized at that generation and recovered without being consumed. Do not reuse generation `27`.

Generation `28` is spent: `TEST-COVERAGE-001` was authorized from idle and completed. The automatic final control update authorizes `FNUGG-ATTRIBUTION-001` at generation `29`. Do not reuse generation `28`. Do not execute `TEST-COVERAGE-001` again.

Generation `29` is spent: `FNUGG-ATTRIBUTION-001` completed and the automatic final control update authorizes `XC-TRAIL-SYNC-001` at generation `30`. Do not reuse generation `29`. Do not execute `FNUGG-ATTRIBUTION-001` again.

Generation `30` is spent: `XC-TRAIL-SYNC-001` completed and the automatic final control update authorizes `UX-POLISH-001` at generation `31`. Do not reuse generation `30`. Do not execute `XC-TRAIL-SYNC-001` again.

Generation `31` is spent: `UX-POLISH-001` completed and the automatic final control update authorizes `DEPARTURE-COMPARE-001` at generation `32`. Do not reuse generation `31`. Do not execute `UX-POLISH-001` again.

Generation `32` is spent: `DEPARTURE-COMPARE-001` completed and the automatic final control update authorizes `RECOMMENDATION-EXPLAIN-001` at generation `33`. Do not reuse generation `32`. Do not execute `DEPARTURE-COMPARE-001` again.

Generation `33` is spent: `RECOMMENDATION-EXPLAIN-001` completed and the automatic final control update authorizes `THERMAL-FEEDBACK-001` at generation `34`. Do not reuse generation `33`. Do not execute `RECOMMENDATION-EXPLAIN-001` again.

Generation `34` is spent: `THERMAL-FEEDBACK-001` completed and the automatic final control update authorizes `PERFORMANCE-001` at generation `35`. Do not reuse generation `34`. Do not execute `THERMAL-FEEDBACK-001` again.

After a from-idle human token is pushed, and before the accepting run claims it, the control block may still show the previous generation, `active_id: none`, and `handoff_state: idle` while `next-task.md` already holds the token. That window is not a second authorization. The token is the authorization. The claim only records ownership.

## Who may enqueue

Only (a) a commit pushed to `dev_test` by GitHub user `Arildb88`, or (b) a ChatGPT control push made after Arild explicitly approves the concrete task(s) in chat (for example, "kjør på"), may add or edit a queued task. Cursor must never add, invent, or edit queued task text. A ChatGPT control push may contain only the task text Arild explicitly approved; it must not autonomously expand the queue. Enqueueing is not authorization: execution still requires a separate valid `next-task.md` handoff.

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

The accepting run MUST NOT write a claim commit to `dev_test`. The authorized `next-task.md` token is the ownership record for the duration of the run. Keep the item `queued`, `active_id: none`, and the Control block at its previous idle generation/state on authoritative `dev_test` until the final implementation PR lands. Work only on the feature/fix branch. This avoids a mid-run push to `dev_test` and therefore avoids self-triggering another Automation run. The final pre-merge control update completes this token and, in automatic mode, may authorize the next ID atomically.

### 2. Cursor to Cursor, automatic final control update

Cursor may authorize a different next ID only when `promotion` is `automatic`, and only by landing a complete pre-merge control state onto `dev_test`. The implementation run prepares that state on its feature or fix branch after required checks pass, merges that branch, and stops. It must not execute the newly authorized ID and must not write to the repository after the merge.

`promotion` is `manual` now. This section does not enable automatic promotion. While `promotion` is `manual`, the pre-merge close is the idle success-close in the Success section. Landing it on `dev_test` is not an authorization handoff.

Compare the new `dev_test` tip with the previous `dev_test` tip: the first parent of a merge commit, or the tip before a fast-forward push. Feature-branch commits are not handoffs and do not change authoritative queue state. `dev_test` remains authoritative until the PR is merged.

The landed range is an automatic authorization only when `promotion` is `automatic` and the new tip, relative to that previous tip, shows all of the following:

1. The previous next-task ID is a real task ID, called PREV. The previous `active_id` was PREV or the previous tip still held PREV's unclaimed token, the previous `handoff_state` was `authorized` or the previous tip was the from-idle token for PREV, and the previous tip was not paused.
2. PREV is `completed` on the new tip.
3. `consumed.md` gains exactly one new row, and that row is PREV.
4. Exactly one queued unconsumed ID, the first such item in the Queue section, is `active`. `active_id` is that ID. No item is `blocked`. No other item is `active`.
5. `handoff_generation` is exactly the previous generation plus 1. When the previous tip is an unclaimed from-idle token, that previous generation is the token `Generation`, not the lagging control-block value. `handoff_state` is `authorized`.
6. `next-task.md` is that new item's promotable body plus `Generation:` set to the new generation, `Handoff-From:` set to PREV, `Authorization:` set to `authorized`, and `Promoted:` set to the UTC time the branch commit was prepared. Place them after the ID line in that order: `Generation`, `Handoff-From`, `Authorization`, `Promoted`.
7. The report and control state on the new tip include that completion.

A new Automation run triggered by that landing must validate this range itself before executing the new ID. The run that merged the PR must already have stopped.

If `promotion` is `automatic` and no queued unconsumed item exists, the pre-merge close is an idle final close instead. It must not invent an ID. Landing that idle close is not an authorization.

Reject every other push before any repository write. Rejected pushes include a same-ID edit, a `Promoted:` bump, an idle or blocked `next-task.md`, a generation change other than exactly plus 1, an ID swap that does not meet one of the two handoff kinds, a manual-mode landing even when it carries the idle success-close, a claim commit, an abandoned-claim recovery, a pause, a resume, an implementation commit, a PR update, a report-only update, and any push while `paused` is `true`.

A trigger caused by a rejected push stops with no repository writes. A manual-mode merge is one of those rejected pushes. No success-close write is required after it, and none is allowed as part of completion.

A final close records completion and does not authorize another ID. `handoff_state` is `idle`, `handoff_generation` stays the same, `active_id` is `none`, `promotion` stays unchanged, and `next-task.md` is the idle body with `## Authorization: none`. A block sets `handoff_state` to `blocked`, keeps the same generation, and does not append `consumed.md`.

`dev_test` is authoritative. A `consumed.md` row, `completed` status, or idle body that exists only on an unmerged feature or fix branch does not complete the task and does not authorize another one. If required checks fail or the PR cannot merge, do not merge, do not start another task, and do not treat that branch as the queue state. Apply the Block rule only in a change that does not append `consumed.md` and does not authorize another ID. If that blocker cannot land, report it and stop.

Before merging into `dev_test`, fetch `dev_test` again. Judge ownership from that fetched tip, not from the feature branch's success-close. Stop without merging if ownership was superseded or the queue was paused. In particular, stop when any of these is true on the fetched tip:

- `paused` is `true`.
- The token ID already has a row in `consumed.md`.
- `active_id` is a different ID than this token.
- `handoff_generation` is greater than this token's generation.
- `handoff_state` is `blocked`, or any item is `blocked`.
- `next-task.md` names a different ID or a different generation than this token.

Continue only when the fetched tip still carries this token, `paused` is `false`, the ID is unconsumed there, and either the queue is still unclaimed (`active_id: none` and the item is still `queued`) or this same ID is already `active` at this same generation. Do not overwrite a newer handoff.

## Abandoned claim recovery

A claim that becomes abandoned must never automatically authorize another agent run. Recovery requires an explicit human or ChatGPT control action. Cursor must not perform it. Cursor must not infer that another run died from elapsed time. There is no timeout, lease, heartbeat, or takeover. Ordinary claim commits stay non-authorization pushes.

The recovery applies only when a human has established all of the following on `dev_test`:

- One item is `active`.
- That ID is unconsumed.
- `next-task.md` still holds that ID's authorized token.
- The task has not completed.
- No implementation pull request for that claim was merged.
- The run that owned the claim was cancelled or abandoned, and no surviving implementation run owns it.

The recovery commit returns that same task to a safe idle retry state in one push:

- That item's status is `queued`.
- `active_id` is `none`.
- `handoff_state` is `idle`.
- `handoff_generation` is unchanged.
- `promotion` is unchanged.
- `consumed.md` is unchanged. Do not append the ID.
- `next-task.md` is the idle body.
- `## Generation:` is unchanged.
- `## Handoff-From:` is `none`.
- `## Authorization:` is `none`.

Do not mark the task `completed`. Do not authorize another task in the recovery commit. Do not retry the task. Do not advance to the next queued item.

This commit is not an authorization handoff. It is not handoff A: it changes `task-queue.md` as well as `next-task.md`, and the new token is idle. It is not handoff B: it does not complete the previous ID, does not append `consumed.md`, does not activate another ID, and does not increase generation. An Automation run triggered by the recovery stops with no repository writes. Do not execute the recovered ID because the parent tip was authorized. The new tip is idle.

The abandoned generation stays permanently spent. A later retry requires a new from-idle human authorization whose `## Generation:` is that unchanged `handoff_generation` plus 1. Never reuse the abandoned generation.

`QUEUE-CONTROL-005` is that recovery for `CYCLING-001` generation `4`. The accepting implementation run was cancelled before completion. No implementation pull request merged, and no surviving run owns the claim. Generation `4` stays spent. `CYCLING-001` stays unconsumed and `queued`. The next explicit from-idle retry of `CYCLING-001` must use Generation `5`. `ALPINE-001` and every later item stay `queued`. This recovery does not authorize a product task.

## Promotion

Automatic promotion is valid only as the Cursor-to-Cursor final control update above, and only for the first queued unconsumed item. It is not a recovery path for an abandoned claim, and it must not be used to authorize the next queued item during recovery.

From-idle human authorization may name any ID that is already `queued` and unconsumed. It is not limited to a Cursor-chosen item, and it does not mark the item `active` by itself.

The Control block is authoritative for the current mode. Cursor must not change `promotion`. A human push set `promotion: automatic`. `QUEUE-CONTROL-005` leaves that value unchanged.

While `promotion` is `manual`:

- A human or ChatGPT authorizes one queued unconsumed item from idle by the single `next-task.md` commit defined above, pushed to `dev_test`.
- Cursor does not create that token, and must not write the next task into `next-task.md`.
- The pre-merge close is the idle success-close. Landing it is not an authorization handoff.

While `promotion` is `automatic`:

- Cursor still must not set `promotion: automatic`. Only a human push may change the flag.
- A completing run may put the next authorization on its feature or fix branch only after required checks pass, and only when `paused` is `false` and a queued unconsumed item exists. Landing that branch on `dev_test` is the handoff.
- That same run must merge and stop. It must not implement the authorized ID and must not write after the merge.
- Abandoned-claim recovery does not use this path and does not activate the next queued item.

A same-ID `Promoted:` bump is not a promotion and not a retry. Returning an abandoned claim to `queued` is only the human recovery above. A later from-idle authorization uses a new generation. Do not reuse a generation that has already appeared.

## Agent entry check

On every run, before any edit, read this file, `consumed.md`, `guardrails.md`, and `next-task.md`, plus the parent copies from the triggering push.

Stop with no repository writes unless the triggering push is one of the two authorization handoffs above.

For a from-idle human authorization, do not reject the token only because `active_id` is still `none`, the item is still `queued`, or the control block `handoff_generation` is still the parent generation. Those are expected until the accepting run claims the task. Do reject it when the token checks fail, the ID is not queued and unconsumed, another item is active or blocked, or the parent was not idle.

For an automatic final control update, require the landed `dev_test` range above, including `active_id` equal to the new ID and `handoff_state: authorized` on the new tip. A manual-mode merge that leaves the idle success-close is not that update. Stop with no writes. Do not add another completion commit.

An abandoned-claim recovery is not a handoff even when the parent tip was `authorized` and named a real ID. The new tip is idle at the same generation, the same ID is `queued`, and `consumed.md` is unchanged. Stop with no repository writes. Do not execute the recovered ID. Do not execute the next queued ID. Do not infer abandonment from elapsed time, and do not perform the recovery.

Also stop with no repository writes when any of these is true:

- `paused` is `true`.
- The ID already has a row in `consumed.md` on `dev_test`. A row that exists only on an unmerged branch does not count.
- `next-task.md` has `Type: NONE`, its ID is `none`, it has no ID, or `## Authorization:` is not `authorized`.
- The push is a claim, an abandoned-claim recovery, a same-ID edit, a `Promoted:`-only edit, an implementation commit, a report update, or a manual-mode merge.
- The parent had an active or blocked task and this push tries to name a different ID without landing the automatic final control update.

`QUEUE-CONTROL-001` is the queue-setup task that created this file. It has no Queue item. It is consumed. If `next-task.md` asks to add this queue again, stop.

This check is what stops ordinary and mid-task pushes when the trigger remains Anyone.

## Success

After the token is validated, implement on the feature or fix branch without writing a claim to `dev_test` and run every required focused check. Only after those checks pass, prepare the close on that same branch, before the final merge. The PR must contain both the implementation and this close. Required PR checks run against that complete branch. There is no required repository write after the merge. The run stops after merge. Which close is valid depends on `promotion` in the Control block.

While `promotion` is `manual`, the pre-merge success-close contains all of the following and authorizes no different task:

1. Set that item's status to `completed`.
2. Append that ID exactly once to `consumed.md`. Do not edit or delete older rows.
3. Set `active_id` to `none`.
4. Set `handoff_state` to `idle`. Leave `handoff_generation` at the accepted token generation.
5. Leave `promotion` as `manual`.
6. Replace `next-task.md` with the idle body below, using that same generation, `Handoff-From: none`, and `Authorization: none`.
7. Update `docs/agent-reports/latest.md` with the implementation, the checks that ran, PR information when it already exists, and this completion state.
8. Do not set `paused` to `false`. Set `paused` to `true` only when the authorized task text says to.

Push that branch. Re-fetch `dev_test` and apply the concurrency check above. Merge only if ownership was not superseded or paused. Then stop. The merge push is not a new authorization. An Automation run caused by it stops with no writes.

Until that merge lands, `dev_test` stays authoritative. The success-close on the feature branch does not by itself consume the ID. If PR checks fail or the merge cannot happen, do not merge, do not start another task, and do not report the unmerged branch as completed queue state. Use the Block rule when a blocker must be recorded. That block must not append `consumed.md`.

The idle `next-task.md` permits a later human authorization. It is not itself a task.

When `promotion` is `automatic`, use the same pre-merge timing. After checks pass, the branch tip atomically contains the Cursor-to-Cursor update defined above, or an idle close when no queued unconsumed item exists. PR checks run against that tip. After it merges, stop. Do not execute the ID that landing authorizes, and do not write again. A later Automation run may execute that ID only after it independently validates the landed range.

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

`QUEUE-CONTROL-002` left the queue paused. Later human commits set `paused: false`. `QUEUE-CONTROL-003` and `QUEUE-CONTROL-004` kept `promotion: manual`. A later human commit set `promotion: automatic`. `QUEUE-CONTROL-005` keeps `paused: false` and `promotion: automatic`. It does not authorize a product task. Product work starts only from a later from-idle human authorization or, when `promotion` is `automatic`, from a landed automatic final control update after a real completion. An abandoned-claim recovery is neither of those.

## Inspect

Read the Control block, each Queue status, `consumed.md`, and `next-task.md`.

- Idle: `handoff_state: idle`, `active_id: none`, no `blocked` item, `next-task.md` is the idle body, and `## Authorization:` is `none`. Generation stays at the highest spent generation.
- Awaiting claim: `next-task.md` is a from-idle token (`## Authorization: authorized`, Generation = control generation + 1, `Handoff-From: none`) and the control block is still idle. This is an authorization. It is not permission for a second run to write a different token.
- Authorized and claimed: `handoff_state: authorized`, one `active` item, `active_id` matches, and `## Generation:` matches `handoff_generation`.
- Recovered after an abandoned claim: the same ID is `queued` and unconsumed, `active_id` is `none`, `handoff_state` is `idle`, `handoff_generation` is unchanged, `promotion` is unchanged, `consumed.md` has no new row, and `next-task.md` is the idle body at that same generation with `## Authorization: none`. This is not an authorization. The generation stays spent.
- Blocked: `handoff_state: blocked`, one `blocked` item, `active_id` matches, and `next-task.md` is the blocked body. Generation is unchanged.
- Paused: `paused: true`. No handoff is valid until a human sets `paused: false`.

## Loop prevention

- One authorization at a time. Only a from-idle human token or a landed automatic final control state creates it.
- Cursor never enqueues, never writes a next-task token while `promotion` is `manual`, and never invents an ID.
- The trigger may remain Anyone. A push that is not an authorization handoff stops with no writes. That includes implementation commits, PR updates, report updates, claim commits, same-ID edits, `Promoted:`-only edits, and a manual-mode merge that already contains the idle success-close.
- A manual final close leaves the idle file and the same generation. Landing it does not start another implementation, and the completing run does not write after that landing.
- A consumed ID cannot be promoted or executed again.
- A blocked item is not consumed and is not skipped. The queue waits. A token must not replace it.
- `paused: true` stops the run before writes.
- One successful run completes one ID. It does not start the next ID in that same run.
- Do not set `promotion: automatic` from an agent run. Do not clear it either. `QUEUE-CONTROL-005` leaves `promotion: automatic`.
- Do not reset `handoff_generation` downwards.
- Cursor never decides that a claim is abandoned and never recovers its own active claim. No timeout, lease, heartbeat, or takeover.
- An abandoned-claim recovery is a human or ChatGPT control push. It is not a handoff. A trigger on it stops with no writes. The recovered task stays `queued`. The abandoned generation stays spent. Recovery does not authorize a retry and does not advance to the next queued item.
- A later retry of a recovered task is only a new from-idle authorization at `handoff_generation` plus 1.

## Replacement Cursor Agent Instructions

Observed overlap on 2026-10-02 for automation `af62016d-be2e-11f1-bb68-864e54d14197`:

- `DB-SUPABASE-002` completed in `3a85248f8575bb6a7e096c7cd18087f1bcccf926`. That commit wrote `GEO-ELEVATION-002` into `next-task.md` while `promotion` was `automatic`.
- A second run started from that push and opened pull request 32 on `feature/geo-elevation-002-altitude-validation`.
- Generation `1` was later published for `GEO-ELEVATION-002` and then left inconsistent with an idle control block. That body is not an authorization. Generation `1` stays spent.
- `GEO-ELEVATION-002` at generation `2` merged in pull request 35 before its manual success-close. The merge push started another run, which correctly wrote nothing. The task stayed active until a later repair. `QUEUE-CONTROL-004` puts the success-close on the feature branch before merge so no post-merge write is required.
- An actor filter does not fix that. Anyone and an `Arildb88`-only trigger both start a run when an allowed account pushes a non-final `next-task.md` change. The entry check has to reject that push.
- Historical note: when the trigger was limited to `Arildb88`, the `app/cursor` merge of pull request 27 (`6cb14cde2a3a0236c27e7f0bc17d26f423ca0074`) did not start a run. The next run waited for `5e184549b3ea8413bcd856b4c433f9419d82a8b0`. That is not the concurrency control.
- `CYCLING-001` generation `4` was authorized and claimed. The accepting implementation run was cancelled before completion. The historical claim commit correctly did not start implementation. No implementation pull request merged. Claim commits are now removed from the execution protocol because they can self-trigger another Automation run. `QUEUE-CONTROL-005` is the human abandoned-claim recovery: the ID returns to `queued`, generation `4` stays spent, and `next-task.md` becomes the idle body. That recovery is not an authorization.

This repository cannot edit the Cursor Automation. This commit does not change the installed Cursor Automation prompt. A human pastes the block below into the automation after this change is on `dev_test`. Leave the trigger able to fire for Anyone, including `Arildb88` and `app/cursor`. A path filter on `docs/agent-control/next-task.md` may be added; the checks in the prompt stay required either way. Do not change `promotion` in that paste. It is already `automatic` from a human push. Installing this text does not authorize a task.

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

B. Cursor-to-Cursor automatic final control update, and only when promotion is automatic. Compare the new dev_test tip with the previous dev_test tip. The landed state marks the previous ID completed, appends that ID to consumed.md, activates exactly one next queued ID, increments generation by exactly 1, writes that next-task.md token with Handoff-From set to the completed ID and Authorization authorized, and updates the report. The run that merged it must already have stopped. A new run may execute the new ID only after it validates this landing itself.

A change to docs/agent-control/next-task.md is required for a handoff and is not sufficient. Reject all of the following before any edit:

- The push does not change docs/agent-control/next-task.md.
- The push keeps the same task ID, including a Promoted-only edit.
- The new next-task.md is idle or blocked, its ID is none, or Authorization is not authorized.
- Generation does not increase by exactly 1 from the previous generation. For a claimed parent, that is the parent `handoff_generation`. For an unclaimed from-idle token, that is the token `Generation`, not the lagging control-block value. Do not reuse a generation that has already appeared.
- paused is true.
- The parent was not idle, and this push is not the automatic final control update that completes that parent ID.
- The commit tries to replace an active or blocked task.
- promotion is manual, and the push tries to authorize a different ID from a completion commit.
- The ID is consumed, or it is not queued and unconsumed for a from-idle token.
- The push changes task-queue.md or consumed.md but is not the automatic final control update.
- The push is an implementation commit, PR update, report update, claim commit, or a manual-mode merge. A manual success-close merge is idle and is not handoff B. Do not write a follow-up commit for it.
- A historical claim commit is a non-authorization. STOP with no repository writes. New accepting runs must never create claim commits.
- The push is a human abandoned-claim recovery. That recovery is a non-authorization control push. The recovered task stays queued. The old generation stays spent. STOP with no repository writes. Do not retry the task. Do not advance to the next queued task.
- Only a later fresh from-idle authorization may retry a recovered task, with Generation equal to the spent handoff_generation plus 1.
- Never decide that a claim is abandoned. Never recover an active claim. No timeout, lease, heartbeat, or takeover.

The trigger may remain Anyone. Do not treat the pushing GitHub account as proof of authorization. Do not weaken this filter so that a claim commit or a recovery commit becomes executable.

QUEUE ENTRY CHECK

Apply the Agent entry check in docs/agent-control/task-queue.md. STOP with no repository writes if it fails.

In particular:

- Never execute an idle next-task.md.
- Never execute a consumed task ID. Consumed means a row on dev_test. An unmerged feature branch does not consume the ID.
- Never execute a from-idle token unless the parent was idle and the token checks pass.
- For a from-idle token, `active_id` remains `none` and the item remains `queued` on authoritative `dev_test` while implementation runs. Do not write a claim commit. The token itself is ownership until the final PR lands.
- Never execute work while the queue is paused.
- Never execute a push that is not the authorization handoff for this generation.
- Never execute a human abandoned-claim recovery. The parent may still be authorized. The new tip is idle. The recovered task stays queued. The old generation stays spent.
- Never invent, enqueue, or expand a task.
- Never decide that another run abandoned a claim, including from elapsed time.
- Never skip or replace a blocked task.
- Execute at most ONE task ID per automation run.

IMPLEMENTATION

If the entry check succeeds:

1. Treat next-task.md as the complete authorized scope.
2. Do NOT claim the task on `dev_test`. Do not push any ownership/control commit to `dev_test` at run start. The validated `next-task.md` token is the ownership record. Create the feature/fix branch from latest `dev_test` and keep implementation/control preparation there until the final merge.
3. Follow guardrails.md strictly.
4. Start from the latest dev_test.
5. Create the required feature/* or fix/* branch.
6. Do not expand scope or invent features.
7. Never modify or merge into dev or main.
8. Run only tests or checks that provide new evidence for the task. Prefer focused tests. Do not rerun broad suites merely because they passed recently. Run broader verification only when the task materially affects that area or next-task.md explicitly requires it. Do this before success-close bookkeeping.
9. Never expose or commit secrets.
10. Before merging into dev_test, fetch dev_test again. Judge that tip, not the feature branch's bookkeeping. Stop without merging if paused is true, the token ID is consumed on dev_test, active_id is a different ID, handoff_generation is greater than this token, handoff_state is blocked, or next-task.md names a different ID or generation. Continue only if this token is still present and the ID is still unclaimed or already claimed as this same ID at this same generation.

BLOCKED TASK

If a required check fails, required tooling is unavailable, or the task requires an unauthorized schema change, dependency, provider, paid service, secret, architecture decision, or other work outside next-task.md, apply the Block rule from task-queue.md.

Do not consume the task. Do not promote another task. Do not increase handoff_generation. Set Authorization to none. Update the report. STOP.

SUCCESS

If the task succeeds and promotion is manual:

1. Run the required checks first. Only after they pass, commit the success-close on the same feature or fix branch. Do not wait until after the merge.
2. That close marks the current ID completed, appends it once to consumed.md, sets active_id to none, sets handoff_state to idle, leaves handoff_generation unchanged, leaves promotion manual, and writes the idle next-task.md with Authorization none and the same Generation.
3. Update docs/agent-reports/latest.md on that same branch with the implementation, checks, PR information when available, and the completion state.
4. Do not authorize another ID.
5. Push the branch. The PR into dev_test must contain both the implementation and this success-close. Required checks must pass against that complete branch.
6. Re-fetch dev_test and apply the ownership check. Merge only if this task and generation were not superseded or paused.
7. Merge only into dev_test.
8. STOP. Do not write to the repository after the merge. The merge is not a new authorization. If a later run is triggered by the merge, it must stop with no writes.

Until the PR merges, dev_test remains authoritative. If checks fail or the merge cannot happen, do not merge, do not start another task, and do not treat the unmerged branch as completed queue state.

If the task succeeds and promotion is automatic, put the atomic final control update from task-queue.md on that same branch after checks pass, instead of the idle close. The PR checks run against that state. Merge it, then STOP. Do not execute the next ID and do not write again. A new run may execute that ID only after it validates the landed dev_test range as handoff B. If no queued unconsumed item remains, write the idle close instead and STOP.

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
- A same-ID, Promoted-only, claim, implementation, report, or manual-mode merge push causes an immediate STOP with no repository writes.
- A historical claim commit remains a non-authorization and causes an immediate STOP with no repository writes. New runs never create one.
- A human abandoned-claim recovery is a non-authorization control push and causes an immediate STOP with no repository writes. The recovered task stays queued. The old generation stays spent. Do not retry it and do not advance to the next queued task.
- Only a later fresh from-idle authorization may retry a recovered task.
- Never autonomously decide that a claim is abandoned. Never recover your own active claim. No timeout, lease, heartbeat, or takeover.
- Do not write success-close bookkeeping after the PR has merged.

Never start arbitrary work from your own commits, PRs, reports, or merges.

One authorized handoff equals at most one implementation run. The accepting run never writes a claim commit to dev_test.
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

- status: completed
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

- status: completed
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

- status: completed
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

- status: completed
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

- status: completed
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

- status: completed
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

- status: completed
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


### INTEGRATION-001

- status: completed
- title: Full integration and regression pass
- source: completed CYCLING-001, ALPINE-001, XC-SKI-001 and ADS-001 foundations

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: INTEGRATION-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Run integration/regression pass for the new activity foundations

Validate the completed cycling, alpine/snowboard, cross-country skiing, route/weather/elevation, recommendation and mobile ad-policy foundations together. Run the existing API test/typecheck/lint commands and Flutter analyze/tests that are supported by the repository. Add focused integration/regression tests where concrete coverage gaps are found and fix concrete regressions within the existing architecture.

Do not add product features, dependencies, schema changes, providers, paid services, or broad refactors. Do not contact live external providers when deterministic mocks/fixtures exist. If a failure requires an architectural/provider/schema decision, BLOCK and report the exact boundary instead of inventing it.

Update the agent report with exact commands and results. Follow queue rules.
~~~~~

### MOBILE-ACTIVITIES-001

- status: completed
- title: Mobile activity planning integration
- source: existing multi-activity UI plus completed recommendation engines

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: MOBILE-ACTIVITIES-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Connect supported activity recommendations to the existing mobile planning flow

Integrate the existing cycling, alpine skiing, snowboarding and cross-country skiing recommendation foundations into the existing Flutter activity/planning UI. Reuse existing activity values, route/planning models and API contracts. Let the user select only inputs already supported by the completed foundations, including applicable intensity/style inputs, and request/display the matching recommendation.

Do not redesign navigation, add schema changes, dependencies, providers, live tracking, power-meter support, grooming data, wax advice, or new activity types. Preserve motorcycle behavior. If an existing API/mobile contract is insufficient without an unauthorized model decision, BLOCK and report it.

Add focused Flutter/API contract tests for changed behavior and run Flutter analyze on touched code. Follow queue rules.
~~~~~

### RECOMMENDATION-UX-001

- status: completed
- title: Recommendation wear/pack UX
- source: existing recommendation outputs and mobile UI

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: RECOMMENDATION-UX-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Present recommendation results clearly in the mobile app

Improve the existing recommendation result presentation for supported activities using data already returned by the API. Clearly separate wear and pack items, reasons, confidence/fallback information and relevant route/weather/elevation context when available. Keep safety-relevant uncertainty visible and avoid unsupported claims.

Do not change recommendation ranking/physics, invent forecast accuracy, add providers/dependencies/schema changes, or redesign unrelated screens. Preserve Norwegian localization patterns already used by the app and existing motorcycle behavior.

Add focused widget/domain tests where practical and run Flutter analyze on touched code. Follow queue rules.
~~~~~

### WEATHER-VALIDATION-001

- status: completed
- title: Weather validation harness
- source: docs/research/WEATHER_DATA_QUALITY.md

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: WEATHER-VALIDATION-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Implement the provider-neutral weather validation harness

Implement the deterministic, provider-neutral measurement/data-shaping foundation described by docs/research/WEATHER_DATA_QUALITY.md using the existing MET baseline and existing weather abstractions. Support paired coordinate/elevation/valid-time observations and measurable comparison outputs that can later accept additional providers without changing production recommendation behavior.

Do not subscribe to or integrate a new provider, make live-network-dependent CI tests, change the production weather provider, add paid services, expose secrets, or declare a provider superior without empirical data. Avoid schema/dependency changes unless the existing research explicitly makes them unnecessary; otherwise BLOCK.

Add focused deterministic tests and update the research/report with what is actually measurable. Follow queue rules.
~~~~~

### MVP-SMOKE-001

- status: completed
- title: RideWear MVP smoke and readiness pass
- source: completed integration/mobile/recommendation foundations

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: MVP-SMOKE-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Run an MVP smoke/readiness pass and fix concrete in-scope defects

Exercise the repository-supported happy paths for auth, profile, wardrobe, route planning, motorcycle recommendations, cycling, alpine/snowboard and cross-country recommendations, plus the ads-off default. Run the strongest existing deterministic API and Flutter checks practical in the repository. Fix concrete regressions that stay within existing architecture and contracts.

Do not add new features, dependencies, providers, schema migrations, paid services or broad refactors. Do not fake successful live-provider behavior. Record any manual/device/live-service checks that still require a human separately instead of claiming they passed.

Leave dev and main untouched. Update the report with exact automated results, remaining manual checks and known MVP issues. Follow queue rules.
~~~~~

### MANUAL-REGRESSION-001

- status: completed
- title: Fix defects found in manual emulator testing
- source: manual Flutter emulator test after MVP-SMOKE-001

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: MANUAL-REGRESSION-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Fix concrete regressions found during manual Flutter emulator testing

Reproduce and fix the concrete defects found during the post-MVP manual emulator pass.

Route/location flow:
- Place search currently returns selectable results while the UI can simultaneously show "Stedsøk er midlertidig utilgjengelig." Fix the underlying success/error state handling; do not merely hide real provider/network errors.
- When a concrete place result is selected, preserve the selected result's meaningful display label and coordinates instead of degrading it to the typed query text. For example, selecting "Kristiansand lufthavn, Kjevik" must not result in the field displaying only "Kristiansand". The same applies to concrete POIs such as Arendal Trefoldighetskirke.
- Keep the user's typed search query separate from the selected provider result. The selected place label, coordinates and any existing provider metadata needed by the planner must remain associated with the selected place.
- Fix "Bytt om" so start and destination swap correctly, including labels, coordinates and associated selected-place state.
- Verify the complete existing route flow with valid selected places: search -> select -> swap -> route preview -> save -> analysis -> recommendation.
- Use the existing ORS/HeiGIT integration. Do not add another routing/geocoding provider.

Activity planning:
- Do not force every activity through a motorcycle-shaped planning flow.
- Cycling, alpine skiing, snowboarding and cross-country skiing already have completed recommendation foundations and must expose a usable Flutter recommendation/planning flow instead of a placeholder that redirects the user to motorcycle.
- Preserve each activity's existing recommendation engine and already-supported intensity/style/exposure inputs.
- Preserve existing motorcycle behavior.
- Do not build the future resort-search or nearby-cross-country-trail integrations in this task. Those require separate product/data-source work.
- For the current UI, alpine skiing and snowboarding must not require an artificial motorcycle-style start/destination route when the existing recommendation contract can operate from the activity/location inputs already supported.
- Hiking currently has no separate recommendation engine and must not be presented as a completed recommendation flow that silently uses motorcycle_v1. Clearly mark it unavailable/coming later or remove it from active recommendation choices. Do not implement a new hiking engine in this task.

Wardrobe test UX:
- During the current development/test phase, make "Legg til demo-klær" available even when the wardrobe already contains garments.
- Preserve personal garments and existing demo-garment identification/removal behavior.
- Avoid accidental duplicate demo garments when demo seeding is repeated.
- Keep the existing demo implementation functional. Do not implement the future activity-specific demo wardrobes in this task; that will be handled separately with the redesigned activity flows.

Profile UX:
- Make the existing "Endre passord" action visually identifiable as a normal RideWear button with an adequate touch target.
- Preserve the existing password-change behavior, navigation, validation and localization.

Regression coverage:
- Add focused Flutter/widget/domain regression tests for the defects fixed.
- Specifically cover preservation of a selected concrete place label independently of the typed query where practical.
- Cover swapping complete selected-place state, not only visible text.
- Run Flutter analyze and the relevant Flutter tests.
- Run focused API tests if backend behavior is changed.
- Record any live ORS/device checks that cannot be deterministic instead of claiming they passed.

Do not add dependencies, schema migrations, new external providers, paid services, new recommendation engines or broad refactors. Do not expose secrets. Keep dev and main untouched. Follow queue rules.
~~~~~

### MANUAL-REGRESSION-002

- status: completed
- title: Fix remaining manual mobile regressions
- source: manual emulator verification after MANUAL-REGRESSION-001

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: MANUAL-REGRESSION-002
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Fix remaining location, Norwegian input and profile UX regressions

Fix the concrete defects confirmed during the manual emulator verification after MANUAL-REGRESSION-001.

Location search:
- Fix the state where successful/selectable location search results can still show "Stedsøk er midlertidig utilgjengelig."
- Preserve real provider/network errors when a request actually fails. Do not merely hide the error widget.
- Verify the fix for start, destination and single-location activity planners.
- Preserve the selected-place label, coordinates, provider id and typed-query separation fixed by MANUAL-REGRESSION-001.
- Preserve the now-working complete-state "Bytt om" behavior.

Current position:
- Fix "Bruk nåværende posisjon" / current-position selection in the Flutter planner.
- Use the existing device location/permission architecture if present.
- Handle denied/unavailable location explicitly rather than silently failing.
- A successful position selection must provide usable coordinates to the existing planner.
- Do not add a new location provider or dependency unless already present architecture requires none; otherwise BLOCK and report the boundary.

Norwegian text input:
- Ensure RideWear location/search text fields accept normal Norwegian Unicode characters including æ, ø and å, both uppercase and lowercase.
- Do not normalize Norwegian place names into ASCII-only strings.
- Ensure search requests encode Unicode input correctly.
- Add focused regression coverage using realistic Norwegian place-name strings.

Profile:
- Add clear visual spacing between the "Endre passord" and "Logg ut" buttons while preserving the existing RideWear styling and minimum touch targets.
- Preserve navigation, password behavior, logout behavior and localization.

Tests:
- Add focused Flutter/widget/domain tests for the corrected search state, Unicode input and current-position state where deterministic testing is practical.
- Run Flutter analyze and relevant Flutter tests.
- Run focused API tests only if backend behavior changes.
- Record emulator/device/live-provider checks separately instead of claiming they passed when they were not run.

Do not add schema migrations, new external providers, paid services, recommendation engines or broad refactors. Keep dev and main untouched. Follow queue rules.
~~~~~

### ALPINE-RESORTS-001

- status: completed
- title: Alpine resort discovery with Fnugg
- source: manual alpine UX review and verified Fnugg API documentation

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: ALPINE-RESORTS-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Replace generic alpine place planning with ski-resort discovery

Implement a resort-oriented planning flow for alpine skiing and snowboarding using the Fnugg open API behind the existing NestJS API architecture.

User experience:
- Alpine skiing and snowboarding must ask which ski resort the user will use rather than presenting the generic motorcycle-style route planner.
- Support two discovery paths:
  1. Search for a ski resort by name.
  2. Use the user's selected/current coordinates to show nearby ski resorts.
- When several resorts are near the same area, show the alternatives and let the user explicitly choose the actual resort.
- Show resort name and useful distance/location context where available.
- Preserve Norwegian characters such as æ, ø and å in resort names and search.
- After a resort is selected, continue into the existing alpine/snowboard time, weather/elevation and recommendation flow.
- Do not require artificial start/destination routing for alpine or snowboard.

Provider:
- Use the documented Fnugg v1 open API.
- Resort-name typeahead may use /suggest/autocomplete and/or the resort search endpoint.
- Nearby discovery must use the documented /geodata/getnearest semantics with latitude/longitude and a bounded radius.
- Treat straight-line Fnugg distance as straight-line distance; do not label it driving distance.
- Keep Fnugg access server-side through NestJS and expose a provider-neutral RideWear contract to Flutter.
- Do not call Fnugg directly from Flutter.
- Request only fields RideWear actually needs.
- Include required user-visible attribution that resort information is sourced from Fnugg.no.
- Do not reproduce Fnugg.no as a competing clone or copy unrelated Fnugg content.
- Do not use Fnugg weather as a silent replacement for RideWear's existing weather architecture. Existing RideWear/MET weather and elevation logic remains authoritative for the clothing recommendation unless a separately authorized provider decision changes it.
- Handle Fnugg unavailable/empty responses without fabricating resorts.

Architecture:
- Preserve existing alpine and snowboard recommendation engines.
- No database/schema change unless strictly unnecessary; if persistence requires a new product/schema decision, BLOCK rather than inventing one.
- No paid service or secret should be introduced.
- Keep the provider adapter isolated so another resort source could replace or supplement Fnugg later.

Tests:
- Add deterministic provider/contract tests using fixtures/mocks.
- Add focused Flutter tests for resort search, multiple nearby resort choices, selection and empty/error states.
- Include Norwegian resort names such as names containing Å/å in deterministic test data.
- Run relevant API tests, Flutter tests and Flutter analyze.
- Do not claim live Fnugg/device GPS verification unless actually performed.

Do not implement cross-country trail discovery in this task. That will be handled separately. Do not add unrelated features or broad refactors. Keep dev and main untouched. Follow queue rules.
~~~~~
### XC-TRAIL-DISCOVERY-001

- status: completed
- title: Cross-country ski trail discovery
- source: approved product plan after alpine resort discovery

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: XC-TRAIL-DISCOVERY-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Add nearby cross-country ski trail discovery with manual route fallback

Improve cross-country skiing planning so users can either discover suitable ski trails near a location/current position or continue planning a manual start/end trip.

Provider and data constraints:
- Prefer authoritative GeoNorge/Kartverket sources and the existing RideWear Flutter -> NestJS -> provider architecture.
- Use only a source/API whose access, data fields and reuse terms are verified during implementation.
- Do not scrape UT.no, Skisporet.no or other websites.
- If no verified production-usable trail source is available, implement the provider-neutral contract and UX/fallback that can be supported safely, document the missing provider decision, and do not fabricate live trail data.
- Keep external-provider access server-side.
- No paid provider, secret, schema migration or new dependency unless already authorized by existing architecture; BLOCK if one is truly required.

UX:
- Offer "Finn løype i nærheten" and "Planlegg egen tur".
- Nearby discovery must use real coordinates and clearly identify returned trail candidates.
- Manual planning keeps the existing cross-country start/end flow.
- Preserve Norwegian Unicode place/trail names.
- A selected trail must integrate with existing RideWear weather/elevation/recommendation concepts where supported; do not invent geometry or grooming status.

Tests:
- Add deterministic API/provider-contract and Flutter tests for available, empty and error/fallback states.
- Run relevant API tests, Flutter tests and Flutter analyze.
- Record live-provider/device checks separately; do not claim them if not run.

Do not implement unrelated activities or broad refactors. Keep dev and main untouched. Follow queue rules.
~~~~~

### DEMO-WARDROBE-ACTIVITY-001

- status: completed
- title: Activity-specific demo wardrobe
- source: approved product plan for broader end-to-end testing

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: DEMO-WARDROBE-ACTIVITY-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Expand demo wardrobe with activity-relevant garments

Improve demo wardrobe data so motorcycle, cycling, alpine skiing, snowboarding and cross-country skiing can be tested with realistic activity-relevant clothing choices.

Requirements:
- Keep demo garments clearly identifiable as demo data and separate from personal garments.
- Preserve the existing idempotent demo-data behavior.
- Demo garments must be useful to the existing recommendation model; do not create unsupported garment capabilities or a new recommendation engine.
- Provide reasonable coverage across the currently supported activities and layering/body-area concepts already represented by the domain model.
- Do not remap hiking into another activity.
- Preserve localization and existing personal wardrobe behavior.
- No schema migration, new provider, paid service or broad architecture change.

Tests:
- Add/update focused deterministic tests for demo generation, idempotency, coexistence with personal garments and activity coverage.
- Run relevant API/Flutter tests and Flutter analyze where affected.

Keep dev and main untouched. Follow queue rules.
~~~~~

### DEPENDENCY-MAINTENANCE-001

- status: completed
- title: Controlled dependency and SDK maintenance
- source: approved accelerated pre-stabilization maintenance plan

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: MAINTENANCE
## ID: DEPENDENCY-MAINTENANCE-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Update RideWear dependencies and tooling in controlled groups

Perform a dedicated dependency/toolchain maintenance pass after the queued feature work.

Inventory first:
- Record current and available Flutter/Dart packages, npm/NestJS packages, Prisma, Android Gradle/Kotlin tooling and other repository-managed SDK/tool constraints.
- Use the package managers' own outdated/audit information where available.
- Separate compatible updates from major/migration-bearing updates.

Execution:
- Apply compatible dependency updates in controlled groups and run relevant tests after each logical group.
- Major updates are allowed only when their official migration requirements are understood and can be completed within this task without changing RideWear product architecture.
- Do not blindly force incompatible versions or suppress failures.
- Prisma/database changes require special care: do not create a database/schema migration merely to satisfy a package update. If a required major upgrade implies an unresolved schema/data/architecture decision, leave that major update deferred and document it rather than breaking the working database foundation.
- Preserve Flutter -> NestJS -> provider architecture and server-side secrets.
- Do not introduce unrelated packages, providers or features.
- Keep lockfiles/config files consistent with accepted updates.

Validation:
- Run Flutter analyze and relevant/full Flutter tests.
- Run relevant/full API tests, type checks/builds and Prisma generation/validation as applicable.
- Run Android build/tooling validation where the environment supports it.
- Report every deferred major update and the concrete reason.
- Do not claim iOS validation from Windows.

Keep dev and main untouched. Follow queue rules.
~~~~~

### STABILIZATION-001

- status: completed
- title: Consolidated MVP stabilization
- source: approved accelerated build-first then debug strategy

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: VALIDATION_AND_FIX
## ID: STABILIZATION-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Run consolidated RideWear regression and fix in-scope defects

After the queued feature and dependency work, perform one broad stabilization pass over the MVP instead of another feature expansion.

Coverage:
- Authentication/profile/password/logout.
- Wardrobe, personal garments and demo garments.
- Motorcycle and cycling route planning, place search, Norwegian Unicode, current position, swap, waypoints, route preview/save/analyze and weather/elevation integration.
- Alpine skiing and snowboarding resort discovery/selection and recommendation flow.
- Cross-country nearby-trail/manual-route flows and recommendation flow.
- Empty/error/provider-unavailable states and Norwegian localization.
- Verify hiking remains unavailable unless a separately authorized engine exists.
- Check important touch targets/layout regressions found during earlier emulator testing.

Fix policy:
- Fix reproducible defects within existing architecture and dependency set.
- Prefer root-cause fixes over hiding errors.
- Do not add new product features, providers, schema migrations, paid services or broad architecture changes.
- If a defect requires one of those decisions, document it as blocked/remaining rather than inventing the change.

Validation:
- Run the broadest practical API and Flutter automated suites, Flutter analyze, API build/type checks and relevant Prisma validation.
- Run Android build/emulator checks where the available environment supports them.
- Distinguish deterministic automated checks from live provider/device checks.
- Produce a concise remaining-issues list suitable for the next human manual regression pass.
- Do not claim iOS validation from Windows.

Keep dev and main untouched. Follow queue rules.
~~~~~

### ALPINE-SNOWBOARD-UNIFY-001

- status: completed
- title: Unify alpine skiing and snowboard user flow
- source: explicitly approved product simplification

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: PRODUCT_SIMPLIFICATION
## ID: ALPINE-SNOWBOARD-UNIFY-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Present alpine skiing and snowboarding as one shared resort activity flow while preserving useful internal distinctions

Simplify the RideWear user experience so alpine skiing and snowboarding no longer appear as unnecessarily separate planning categories.

Product behavior:
- Present one shared user-facing activity entry for resort snow sports, preferably localized as "Alpint & snowboard" / "Alpine & snowboard" where appropriate.
- Use the same resort discovery, selected resort, time, MET weather/elevation and recommendation planning flow for both.
- Do not duplicate planner screens or resort-provider calls merely to distinguish skiing from snowboarding.
- Preserve the existing Fnugg-backed resort discovery and attribution.
- Preserve current personal thermal-profile behavior so user feedback/personalization can account for whether a person tends to run warmer or colder.
- Do not encode an unsupported blanket rule that snowboard is always warmer or more strenuous than alpine skiing.

Internal compatibility:
- Do not remove or destructively migrate existing ALPINE_SKIING / SNOWBOARDING domain values merely for UI simplification.
- Keep existing stored/API data compatible.
- If an existing internal distinction can be retained cheaply for future recommendation tuning/analytics, retain it without forcing the user through two separate planner categories.
- Do not add a schema migration for this simplification.

Scope:
- Update home/activity selection and relevant labels/navigation so users see one coherent resort-snow-sports choice.
- Reuse existing alpine/snowboard recommendation capabilities rather than adding a new recommendation engine.
- Ensure hiking remains unavailable and cross-country skiing remains a separate activity.
- Preserve Norwegian Unicode/localization.
- Add/update focused Flutter tests for the unified entry and shared planner behavior.
- Run Flutter analyze and relevant tests; run API tests only if API behavior changes.
- No new provider, paid service, dependency, schema migration or broad architecture change.

Keep dev and main untouched. Follow queue rules.
~~~~~

### WARDROBE-SHARING-001

- status: completed
- title: Activity-aware wardrobe isolation and sharing
- source: explicitly approved wardrobe product rules

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: PRODUCT_FEATURE
## ID: WARDROBE-SHARING-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Make wardrobes activity-aware, keep motorcycle isolated, and make demo garments activity-specific

Implement the approved RideWear wardrobe rules.

Hard motorcycle boundary:
- Motorcycle clothing is its own wardrobe domain and must always remain separate from every non-motorcycle activity.
- A motorcycle garment must never become available to cycling, alpine/snowboard, cross-country skiing or other non-motorcycle activities through wardrobe sharing.
- Non-motorcycle garments must never become available to motorcycle through wardrobe sharing.
- This boundary is a product invariant, not merely a default checkbox.

User-controlled sharing for non-motorcycle activities:
- Let the user choose whether supported non-motorcycle activity wardrobes stay separate or share garments.
- Provide a clear selection UI where the user can choose which compatible activity categories share a wardrobe/garment availability.
- Cycling, alpine & snowboard, and cross-country skiing may be shared in combinations chosen by the user.
- Do not force all non-motorcycle categories into one wardrobe.
- Prefer one garment record with activity availability/membership over silently creating duplicate garment copies.
- Preserve room for additional non-motorcycle activities later without weakening the motorcycle isolation invariant.
- Hiking remains unavailable and must not be remapped to another activity.

Demo garments:
- Demo clothing must follow the currently selected activity/category.
- Motorcycle receives only motorcycle-relevant demo garments.
- Cycling receives cycling-relevant demo garments.
- Alpine & snowboard receives its own resort-snow-sports demo set.
- Cross-country skiing receives its own cross-country demo set.
- Demo garments from one activity must not appear as that activity's demo wardrobe in another category merely because personal wardrobes can be shared.
- Demo seeding remains clearly marked as demo, separate from personal garments, and idempotent per intended activity/category.
- Replacing/removing demo garments must not delete personal garments.

Recommendation behavior:
- Recommendations may use only garments available to the selected activity under these rules.
- Motorcycle recommendations may use only motorcycle garments.
- Non-motorcycle recommendations may use personal garments shared with that activity plus that activity's relevant demo garments.
- Do not invent a new recommendation engine; integrate with the existing activity/recommendation architecture.

Persistence and compatibility:
- Inspect the current garment/wardrobe schema before implementation.
- Preserve existing user garments and existing activity data.
- A schema migration is allowed only if it is the smallest safe change required to persist the approved sharing model; include a deterministic migration/backfill that preserves current data and motorcycle isolation.
- Do not destructively reinterpret existing motorcycle garments as generic clothing.
- If existing data cannot be migrated safely without a product decision, BLOCK and report the exact ambiguity rather than guessing.

Tests:
- Add deterministic tests proving motorcycle cannot share in either direction.
- Test separate and shared non-motorcycle combinations.
- Test recommendation garment filtering by selected activity.
- Test activity-specific, idempotent demo seeding and that personal garments survive demo replacement/removal.
- Test relevant UI selection/localization and Norwegian text.
- Run Prisma generate/validate and API migration/tests if persistence changes.
- Run relevant/full Flutter tests and Flutter analyze.

No new external provider, paid service or unrelated feature. Keep dev and main untouched. Follow queue rules.
~~~~~

### TEST-COVERAGE-001

- status: completed
- title: Critical MVP automated test coverage
- source: approved final pre-release hardening plan

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: VALIDATION_AND_FIX
## ID: TEST-COVERAGE-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Close meaningful automated-test gaps in critical RideWear MVP flows

Review existing automated coverage after STABILIZATION-001 and add tests only where important MVP behavior remains materially unprotected.

Prioritize:
- Authentication/profile/password/logout.
- Wardrobe and demo-garment coexistence/idempotency.
- Motorcycle/cycling planning and recommendation inputs.
- Alpine/snowboard resort discovery and selection.
- Cross-country trail/manual planning.
- Weather/elevation/provider error and empty states.
- Norwegian Unicode/location handling and important state/race regressions.

Requirements:
- Prefer deterministic unit/widget/integration/API tests over brittle snapshot or timing-dependent tests.
- Do not chase a numeric coverage percentage or add tests that only execute lines without checking behavior.
- Fix small reproducible defects uncovered by the new tests when they fit existing architecture.
- No new product features, providers, schema migrations, paid services or broad refactors.

Run relevant/full Flutter and API suites and Flutter analyze. Keep dev and main untouched. Follow queue rules.
~~~~~

### FNUGG-ATTRIBUTION-001

- status: completed
- title: Fnugg attribution compliance
- source: explicitly approved Fnugg attribution requirement

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: UX_AND_COMPLIANCE
## ID: FNUGG-ATTRIBUTION-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Add clear Fnugg attribution wherever RideWear presents Fnugg-sourced resort data

Implement attribution for the existing Fnugg integration.

Requirements:
- Verify the current official Fnugg API/terms immediately before implementation and follow the applicable attribution wording/link requirements.
- Wherever user-visible resort/facility/conditions data originates from Fnugg, show a clear but visually unobtrusive attribution in proximity to that data.
- Attribution must not be hidden as microtext or made materially less readable than surrounding secondary text.
- Link Fnugg attribution to the relevant Fnugg destination when the integration provides a reliable relevant URL; otherwise use the official Fnugg destination allowed by the terms.
- Keep RideWear-fetched MET weather clearly distinct from Fnugg-sourced data; do not label RideWear's direct MET data as Fnugg data.
- If RideWear displays Fnugg fields whose terms require additional weather/conditions attribution (for example Yr/Meteorologisk institutt/NRK), implement the currently required wording rather than guessing.
- Preserve provider-neutral backend boundaries and existing alpine/snowboard behavior.
- Add focused Flutter tests for attribution visibility and relevant link/conditional behavior.
- Run Flutter analyze/tests and API tests if server/provider mapping changes.
- No new provider, paid service, schema migration or unrelated redesign.
- Keep dev and main untouched. Follow queue rules.
~~~~~

### XC-TRAIL-SYNC-001

- status: completed
- title: Fast authoritative XC trail retrieval and refresh
- source: explicitly approved Geonorge Turrutebasen performance/refresh design

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: PERFORMANCE_AND_DATA
## ID: XC-TRAIL-SYNC-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Make nearby cross-country trail retrieval fast while keeping Geonorge Turrutebasen data fresh

Use the authoritative Geonorge Turrutebasen dataset:
https://kartkatalog.geonorge.no/metadata/turrutebasen/d1422d17-6d95-4ef1-96ab-8af31744dd63

Primary UX requirement:
- A user requesting nearby ski trails must get the nearby result quickly; do not make the request wait for a national dataset refresh/download.
- Flutter continues to call the RideWear NestJS API. Do not fetch Geonorge directly from Flutter.

Before changing architecture:
- Inspect the completed XC-TRAIL-DISCOVERY-001 implementation and verify which Geonorge endpoint/service it currently uses.
- Verify current official Turrutebasen access methods and metadata before selecting WFS/download/ATOM or another documented official interface.
- Reuse the existing implementation where it already satisfies the requirements.

Fast read path:
- Serve nearby-trail queries from a server-side cache/local indexed representation when practical.
- If the existing official API supports sufficiently fast bounded spatial queries, it may be used behind a short-lived server cache instead of importing all Norway.
- Prefer bounded geographic queries (position/radius or bbox) and only the Skiløype features/fields needed by RideWear.
- Add suitable spatial/indexing strategy only when supported by the current architecture and measured need.
- Do not block a user request on a full refresh.

Refresh:
- Check for fresh source data at most once per 24 hours by default; a refresh check must not make the interactive nearby-trail request wait for a full national update.
- Refresh asynchronously/server-side where the current deployment model supports it.
- Keep serving the last known-good data while refresh is running.
- If Geonorge is unavailable or refresh fails, retain and serve last known-good data and report/log freshness rather than emptying the trail map.
- Avoid duplicate concurrent refreshes.
- Do not claim real-time grooming/preparation status unless the verified source actually supplies current operational status.

Performance and correctness:
- Measure the nearby-trail path before/after and document timings/test method; optimize based on evidence.
- Preserve XC manual-route fallback.
- Preserve Norwegian characters/localization.
- Preserve Kartverket/Geonorge attribution and license requirements.
- No scraping, fabricated trails, paid providers, unrelated features or broad architecture changes.
- Do not modify motorcycle/cycling/alpine wardrobe behavior.

Validation:
- Deterministic tests for cache hit, stale cache, refresh failure/stale-data fallback, duplicate-refresh suppression and geographic filtering.
- API tests/build and Prisma validation if persistence is touched.
- Flutter tests/analyze for any client changes.
- Clearly distinguish tests from live-provider checks.

Keep dev and main untouched. Follow queue rules.
~~~~~

### UX-POLISH-001

- status: completed
- title: MVP UI and UX consistency pass
- source: approved final pre-release hardening plan

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: UX_MAINTENANCE
## ID: UX-POLISH-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Apply a focused RideWear MVP UI/UX polish pass

Review implemented MVP screens for consistency and obvious usability defects without redesigning the product.

Focus on:
- Spacing, alignment, overflow and small-screen resilience.
- Consistent RideWear buttons, minimum touch targets and disabled/loading states.
- Clear empty, loading, validation and provider-error states.
- Norwegian localization/text consistency, including æ/ø/å.
- Planner forms and activity-specific flows remaining understandable without exposing irrelevant route controls.
- Profile, wardrobe and recommendation-result presentation.

Requirements:
- Preserve existing navigation, architecture and visual identity.
- Do not invent new product features or perform a broad visual redesign.
- Add/update focused widget tests for meaningful regressions.
- Run Flutter analyze and relevant Flutter tests.
- Record anything requiring human visual/device judgment rather than claiming it is verified.

Keep dev and main untouched. Follow queue rules.
~~~~~

### DEPARTURE-COMPARE-001

- status: completed
- title: Compare departure times
- source: explicitly approved lightweight product enhancement

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: FEATURE
## ID: DEPARTURE-COMPARE-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Let users compare a small set of departure times using existing route-weather capabilities

Implement a lightweight departure-time comparison for route-oriented activities where the existing data supports it.

Requirements:
- Reuse existing route geometry, route-weather sampling, MET integration and activity planning; do not introduce a new weather/provider stack.
- Present 2–4 useful nearby departure alternatives with concise comparable conditions (temperature, precipitation, wind and other already-supported material conditions).
- Make clear which time each forecast applies to and handle unavailable/out-of-range forecast data gracefully.
- Do not invent a single opaque “best” score; users should be able to compare the factual conditions.
- Keep provider/API calls bounded and avoid obvious duplicate calls; preserve existing caching/provider boundaries.
- Norwegian localization and focused Flutter/API tests as applicable.
- No new provider, paid service, schema migration or broad redesign.
- Keep dev/main untouched and follow queue/control rules.
~~~~~

### RECOMMENDATION-EXPLAIN-001

- status: completed
- title: Explain clothing recommendations and what to bring
- source: explicitly approved lightweight product enhancement

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: FEATURE
## ID: RECOMMENDATION-EXPLAIN-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Explain why RideWear recommends clothing and distinguish wear-now from useful bring-along items

Build on the existing recommendation output and wardrobe/activity rules.

Requirements:
- Add concise user-facing reasons tied only to inputs/rules RideWear actually used (for example temperature, wind, precipitation, activity/intensity, elevation or personal thermal settings when present).
- Never fabricate causal explanations from data the recommendation engine did not use.
- Where existing recommendation logic/data supports it, distinguish garments to wear from optional items worth bringing for changing conditions.
- Respect activity-specific wardrobe availability, MC isolation, personal/demo separation and Alpint & snowboard/XC/cycling behavior.
- Keep explanations simple and Norwegian-localized; handle missing inputs gracefully.
- Prefer extending the existing recommendation contract/model minimally rather than creating a parallel recommendation engine.
- Add deterministic tests covering explanation correctness and garment eligibility.
- No new provider, paid service, schema migration or unrelated redesign unless the existing model makes the task impossible; if so BLOCK rather than guess.
- Follow queue/control rules.
~~~~~

### THERMAL-FEEDBACK-001

- status: completed
- title: Simple thermal recommendation feedback
- source: explicitly approved lightweight personalization enhancement

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: FEATURE
## ID: THERMAL-FEEDBACK-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Add simple cold/comfortable/hot feedback after a recommendation or activity as groundwork for personal thermal calibration

Requirements:
- Provide a minimal Norwegian UX for “for kald”, “passe” and “for varm” linked to the relevant recommendation/activity context where existing architecture safely permits.
- Inspect the existing personal thermal/profile model first and reuse it where possible.
- If safe within the current model, use accumulated feedback conservatively to improve the user's existing thermal preference/calibration; make the behavior deterministic, bounded and testable.
- Do not use ML, external AI, a new provider or opaque scoring.
- Do not let one feedback event cause a large calibration change.
- Preserve historical/user data and existing recommendations when no feedback exists.
- If persistent feedback requires an unauthorized schema migration, do not create one: implement the safe non-schema portion and document the exact follow-up need, or BLOCK if no meaningful safe implementation is possible.
- Respect activity/wardrobe isolation rules.
- Add focused tests for cold/comfortable/hot behavior and bounds.
- Follow queue/control rules.
~~~~~

### PERFORMANCE-001

- status: active
- title: Measure and fix obvious MVP performance waste
- source: approved final pre-release hardening plan

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: PERFORMANCE
## ID: PERFORMANCE-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Measure and address obvious RideWear MVP performance inefficiencies

Inspect the working MVP for concrete performance waste and fix only issues supported by evidence or clearly redundant work.

Focus on:
- Duplicate/unnecessary API requests.
- Search debounce, stale requests and race handling.
- Provider request reuse/cancellation where existing abstractions support it.
- Avoidable Flutter rebuild/state churn in important planner/recommendation screens.
- Obvious sequential work that can safely run concurrently without changing semantics.
- Excessive payload/data processing in existing API/provider adapters.

Requirements:
- Measure or demonstrate the problem before non-trivial optimization.
- Preserve behavior and existing architecture.
- Do not introduce caching infrastructure, new providers, dependencies, schema changes or speculative rewrites unless already available and clearly appropriate.
- Add regression tests where practical.
- Run relevant Flutter/API tests and Flutter analyze.
- Document measured/observed improvements and deferred opportunities.

Keep dev and main untouched. Follow queue rules.
~~~~~

### SECURITY-HARDENING-001

- status: queued
- title: Security hardening audit and safe fixes
- source: explicitly approved security hardening work

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: SECURITY_AUDIT_AND_FIX
## ID: SECURITY-HARDENING-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Audit and harden RideWear mobile/API security before release

Use current OWASP MASVS/MASTG guidance as the baseline. Inspect the existing Flutter + NestJS architecture before changing anything.

Scope:
- authentication/session/token handling, password/reset/change flows, authorization boundaries and IDOR risks
- sensitive local storage, logs, backups, error messages and accidental secret/PII exposure
- API input validation, rate limiting/brute-force protection, CORS/security headers where applicable
- TLS/cleartext configuration and production network settings
- secrets/API keys must remain server-side; verify release config does not package server secrets
- dependency/audit findings relevant to exploitable runtime risk
- add focused regression/security tests for safe fixes

Constraints:
- Fix only low-risk issues that fit the existing architecture.
- No new identity provider, paid service, schema migration or broad architecture rewrite.
- If a security fix requires a breaking/auth architecture change, document it as a concrete follow-up recommendation in latest report and do not invent/enqueue a task.
- Never commit secrets or real credentials.
- Preserve existing user data and auth compatibility.
- Run API tests/build and Flutter analyze/tests as applicable.
- Follow queue/control rules; dev and main untouched.
~~~~~

### PRIVACY-DATA-001

- status: queued
- title: User data and privacy readiness
- source: explicitly approved user-data handling review

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: PRIVACY_REVIEW_AND_FIX
## ID: PRIVACY-DATA-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Review RideWear personal-data lifecycle and implement safe privacy-readiness improvements

Inventory what personal/user-linked data RideWear currently stores or transmits (account/profile, wardrobe, routes/activity plans, location-related data, auth/reset data, logs/telemetry if any).

Requirements:
- document data category, purpose, storage location, retention/deletion behavior and external provider exposure
- verify production logs/errors do not unnecessarily expose credentials, tokens, precise location or other personal data
- inspect account deletion/data deletion behavior; identify gaps without pretending legal compliance
- minimize provider payloads and persisted location data where not required by existing product behavior
- ensure demo data remains distinguishable from personal user data
- add safe tests/docs for changes
- produce a concise privacy/data-flow readiness section in latest report

Constraints:
- This is engineering/privacy readiness, not a claim of GDPR/legal compliance.
- No analytics/advertising SDK, new provider, schema migration or destructive data migration unless already explicitly authorized.
- Preserve existing user data; if deletion semantics require a schema/architecture decision, document/block rather than guess.
- Run relevant tests/checks and follow queue/control rules.
~~~~~

### SOCIAL-AUTH-RESEARCH-001

- status: queued
- title: Microsoft and Facebook login implementation plan
- source: explicitly approved social-login planning

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: RESEARCH_AND_DESIGN
## ID: SOCIAL-AUTH-RESEARCH-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Produce an implementation-ready plan for Microsoft and Facebook login without enabling either provider

Inspect RideWear's current NestJS/Flutter authentication and user model first. Verify current official Microsoft and Meta documentation during the task.

Plan:
- native mobile OAuth/OIDC flow using current best practice (external user-agent/system browser and PKCE where provider/protocol requires)
- server/API trust boundary and token validation/exchange strategy
- Android and future iOS redirect/deep-link requirements
- account linking rules for existing email/password users, duplicate-email/collision handling, provider unlinking, and recovery when a provider account disappears
- minimum scopes/data requested and privacy implications
- secure token storage/session lifecycle/logout/revocation
- exact external operator setup required (app registrations, package/bundle IDs, redirect URIs, signing hashes/keys, review requirements) without committing secrets
- phased implementation steps and test matrix
- compare whether implementing Microsoft, Facebook, both, or neither adds meaningful value for RideWear; present factual tradeoffs without enabling them

Constraints:
- Research/design only: do not add dependencies, provider credentials, schema migrations, login buttons, or production OAuth code.
- Do not invent credentials or provider configuration.
- Preserve existing email/password auth.
- Store the implementation-ready design in docs and summarize it in latest report.
- Follow queue/control rules.
~~~~~

### RELEASE-READINESS-001

- status: queued
- title: MVP release-readiness validation
- source: approved final pre-release hardening plan

#### Promotable body

~~~~~markdown
# Authorized RideWear Task
## Type: RELEASE_VALIDATION
## ID: RELEASE-READINESS-001
## Promoted: REPLACE_WITH_UTC_TIME
## Task: Prepare and validate RideWear for a human-controlled beta/release step

Perform a final release-readiness pass after feature, dependency, stabilization, coverage, UX and performance work.

Validate:
- Flutter analyze and full practical Flutter test suite.
- API tests, production build/type checks and Prisma generate/validate as applicable.
- Android release build where the available environment supports it.
- Environment/config expectations for API, PostgreSQL/Supabase, routing, weather/elevation and resort/trail providers.
- Secrets remain server-side and no credentials are committed.
- Production-facing error handling does not expose secrets/internal stack data.
- Database migration state is documented and consistent with the repository.
- Existing ads/config behavior is appropriate for the current MVP configuration.
- Produce/update a concise release checklist covering remaining human steps, Android signing/distribution, hosted API/database configuration and later iOS/TestFlight work.

Boundaries:
- Do not deploy to production, publish an app, create paid infrastructure, rotate credentials or modify external services/accounts.
- Do not claim iOS build/test validation from Windows.
- Fix small release-blocking repository defects that fit existing architecture; document anything requiring human credentials, provider accounts, macOS/iOS tooling or a product decision.
- No new product features.

Keep dev and main untouched. Follow queue rules.
~~~~~

## QUEUE-CONTROL-006 — no-claim execution

Generation 5 for `CYCLING-001` was abandoned after its claim push triggered overlapping Automation activity. Human/ChatGPT recovery returned it to `queued`, `active_id: none`, `handoff_state: idle`, with generation 5 spent and `consumed.md` unchanged. From Generation 6 onward, accepting runs do not write claim commits to `dev_test`; the authorization token is ownership until the final implementation PR lands. The generation 6 retry of `CYCLING-001` was authorized from idle and completed. `CYCLING-001` is consumed. The generation 7 authorization of `ALPINE-001` completed. The generation 8 authorization of `XC-SKI-001` completed. The generation 9 authorization of `WEATHER-PROVIDER-RESEARCH-002` completed. The generation 10 authorization of `ADS-001` completed. No queued unconsumed item remained, so the final close is idle at generation 10. Later queued work was authorized from idle as `INTEGRATION-001` at generation 11 and completed. The automatic final control update authorized `MOBILE-ACTIVITIES-001` at generation 12 and that task completed. The automatic final control update authorized `RECOMMENDATION-UX-001` at generation 13 and that task completed. The automatic final control update authorized `WEATHER-VALIDATION-001` at generation 14 and that task completed. The automatic final control update authorized `MVP-SMOKE-001` at generation 15 and that task completed. No queued unconsumed item remained, so the final close is idle at generation 15. `MANUAL-REGRESSION-001` was later authorized from idle at generation 16 and completed. No queued unconsumed item remained, so the final close is idle at generation 16. `MANUAL-REGRESSION-002` was authorized from idle at generation 17 and recovered without being consumed. It was authorized again from idle at generation 18 and completed. The automatic final control update authorizes `ALPINE-RESORTS-001` at generation 19. `MANUAL-REGRESSION-002` was authorized from idle at generation 17 and recovered without being consumed. It was authorized again from idle at generation 18 and completed. The automatic final control update authorizes `ALPINE-RESORTS-001` at generation 19. `ALPINE-RESORTS-001` at generation 19 completed. The automatic final control update authorizes `XC-TRAIL-DISCOVERY-001` at generation 20. `XC-TRAIL-DISCOVERY-001` at generation 20 completed. The automatic final control update authorizes `DEMO-WARDROBE-ACTIVITY-001` at generation 21. `DEMO-WARDROBE-ACTIVITY-001` at generation 21 completed. The automatic final control update authorizes `DEPENDENCY-MAINTENANCE-001` at generation 22. `DEPENDENCY-MAINTENANCE-001` at generation 22 completed. The automatic final control update authorizes `STABILIZATION-001` at generation 23. Generation 23 was recovered without consuming `STABILIZATION-001`. `STABILIZATION-001` was authorized again from idle at generation 24 and completed. The automatic final control update authorizes `ALPINE-SNOWBOARD-UNIFY-001` at generation 25. `ALPINE-SNOWBOARD-UNIFY-001` at generation 25 completed. The automatic final control update authorizes `WARDROBE-SHARING-001` at generation 26. `WARDROBE-SHARING-001` at generation 26 completed. The automatic final control update authorizes `TEST-COVERAGE-001` at generation 27. Generation 27 was recovered without consuming `TEST-COVERAGE-001`. `TEST-COVERAGE-001` was authorized again from idle at generation 28 and completed. The automatic final control update authorizes `FNUGG-ATTRIBUTION-001` at generation 29. `FNUGG-ATTRIBUTION-001` at generation 29 completed. The automatic final control update authorizes `XC-TRAIL-SYNC-001` at generation 30.
