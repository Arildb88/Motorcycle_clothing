# Pre-merge manual success-close

## Task

`ROUTING-WEATHER-002`. Improve route ETA and weather sampling. Generation `3`. Promotion stayed `manual`. This run does not authorize `CYCLING-001` or any other queued item.

## Authorization

From-idle handoff on `dev_test` commit `ad9292b3a9b41804303bcd3ca9cc81b7b7a99043`. Parent `476e5ff44ee73050c77414076ea963190f02b384` was idle: `paused: false`, `active_id: none`, `handoff_generation: 2`, `handoff_state: idle`, next-task ID `none`. The token changed only `docs/agent-control/next-task.md`, named `ROUTING-WEATHER-002`, set Generation `3`, `Handoff-From: none`, and `Authorization: authorized`. The ID was queued and had no consumed row.

## Implementation

Weather samples stay on the supplied road line at even distance fractions. When the routing provider returns one distance and duration per waypoint interval, ETA and per-sample speed follow that timing. Short routes still sample the endpoints only. Saved-waypoint fallback stays on those vertices and keeps distance-based ETA. Legs are ignored when they do not match the route duration, or when a leg consumes time but covers no distance.

`OpenRouteServiceRoutingAdapter.roadWeatherSource` returns the ephemeral road line plus those legs. `preview` and `POST /location/route-preview` do not gain a legs field. `analyze` still stores waypoint endpoints, not the dense line.

## Resulting control state

- `paused: false`
- `active_id: none`
- `promotion: manual`
- `handoff_generation: 3`
- `handoff_state: idle`
- `ROUTING-WEATHER-002` completed and appended once to `consumed.md`
- `next-task.md` idle, ID `none`, Generation `3`, `Authorization: none`
- no other task authorized

Generation `3` is the idle baseline after this close. The next from-idle human authorization must use Generation `4`.

## Commit / PR

- Branch: `feature/routing-weather-002-eta-sampling` from `dev_test` at `ad9292b3a9b41804303bcd3ca9cc81b7b7a99043`
- Claim: `d86e2e4` — chore(agent): claim ROUTING-WEATHER-002 generation 3
- Implementation: `6ad856390690012adddb06379c22c750a5385673` — feat(routing): time weather samples from provider legs
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/37 into `dev_test` only. Not merged to `dev` or `main`.

## Files changed

- `apps/api/src/routing/routing.types.ts`
- `apps/api/src/routing/route-weather-sampling.ts`
- `apps/api/src/routing/route-weather-sampling.spec.ts`
- `apps/api/src/routing/ors-routing.adapter.ts`
- `apps/api/src/routing/ors-routing.adapter.spec.ts`
- `apps/api/src/recommend/motorcycle/route-travel.ts`
- `apps/api/src/recommend/recommend.service.ts`
- `docs/agent-control/task-queue.md`
- `docs/agent-control/consumed.md`
- `docs/agent-control/next-task.md`
- `docs/agent-reports/latest.md`

## Checks actually run

In `apps/api`:

- `npx jest src/routing/route-weather-sampling.spec.ts src/routing/ors-routing.adapter.spec.ts --no-coverage` — 2 suites, 23 tests passed
- `npm run build` — passed

## Checks intentionally not repeated

No full `npm test`, `scripts/smoke-api.sh`, Flutter test, Flutter analyze, or mobile build. `api-ci` is the GitHub check for this pull request.

## Architecture / config

No schema, dependency, package, provider, or database change. No live traffic. No persisted polyline. No per-leg timing is synthesized when the provider did not return it.

## Manual validation needed

None. Sampling tests are deterministic and do not call OpenRouteService.

## Remaining issues

- `CYCLING-001` and the later queued items stay queued. This close does not authorize them.
- `promotion` stays `manual`.
