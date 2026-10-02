# Automatic final control update

## Task

`CYCLING-001`. Cycling recommendation foundation. Generation `4`. Promotion stayed `automatic`. This run authorizes `ALPINE-001` at generation `5` and does not implement it.

## Authorization

From-idle handoff on `dev_test` commit `6601fd8da831a8b34672e4a9629bac97b62c94ca`. Parent `0c7fbbf9e1f7dc4352b1bd844315ce62fff476a1` was idle: `paused: false`, `active_id: none`, `handoff_generation: 3`, `handoff_state: idle`, next-task ID `none`. The token changed only `docs/agent-control/next-task.md`, named `CYCLING-001`, set Generation `4`, `Handoff-From: none`, and `Authorization: authorized`. The ID was queued and had no consumed row. `promotion` was already `automatic`.

## Implementation

Cycling recommendations are `cycling_v1` in `apps/api/src/recommend/cycling/`. They run only when the saved route activity is `cycling`. Motorcycle routes still use `motorcycle_v1`.

- Weather samples reuse the shared route sampler and ETA. Ground elevation is passed through when the elevation port returns it.
- A cycling request asks OpenRouteService for `cycling-regular`. If that request is unavailable, sampling falls back to saved waypoints and the duration hint. It does not substitute driving-car geometry.
- The shared `POST /location/route-preview` response stays driving geometry.
- Intensity is the query `easy`, `steady`, or `hard`. It is not stored. Omission is recorded and confidence cannot be high.
- Exposure, wear/pack, and reasons are cycling-specific. Hard effort in dry mild air packs the shell instead of wearing it. Rain on a short late section is packed, not worn for the whole ride. Feet and hands can demand more warmth than the torso. A helmet is assumed and is not selected as a warmth garment.
- Garments match only when tagged `cycling`. Otherwise the kit is generic. Motorcycle garments, armour presets, and personal offsets are not used. The shared cold-sensitivity prior still applies.

## Resulting control state

- `paused: false`
- `active_id: ALPINE-001`
- `promotion: automatic`
- `handoff_generation: 5`
- `handoff_state: authorized`
- `CYCLING-001` completed and appended once to `consumed.md`
- `ALPINE-001` active
- `next-task.md` is the ALPINE-001 token, Generation `5`, `Handoff-From: CYCLING-001`, `Authorization: authorized`
- this run does not implement `ALPINE-001`

Generation `4` authorized and completed `CYCLING-001`. The claim recorded that generation. This close is the automatic handoff, so generation becomes `5`.

## Commit / PR

- Branch: `feature/cycling-001-recommendation-foundation` from `dev_test` at `6601fd8da831a8b34672e4a9629bac97b62c94ca`
- Claim: `74665b9` — chore(agent): claim CYCLING-001 generation 4
- Implementation: `9cabb959c7fcc567d3f81e5da3f9e571399b1a47` — feat(cycling): add cycling recommendation foundation
- PR: opened into `dev_test` only. Not merged to `dev` or `main`.

## Files changed

- `apps/api/src/recommend/cycling/`
- `apps/api/src/recommend/recommend.controller.ts`
- `apps/api/src/recommend/recommend.service.ts`
- `apps/api/src/routing/ors.constants.ts`
- `apps/api/src/routing/ors-routing.adapter.ts`
- `apps/api/src/routing/ors-routing.adapter.spec.ts`
- `apps/api/src/routing/routing.types.ts`
- `docs/agent-control/task-queue.md`
- `docs/agent-control/consumed.md`
- `docs/agent-control/next-task.md`
- `docs/agent-reports/latest.md`

## Checks actually run

In `apps/api`:

- `./node_modules/.bin/jest src/recommend/cycling/pipeline.spec.ts src/routing/ors-routing.adapter.spec.ts --no-coverage` — 2 suites, 25 tests passed
- `npx prisma generate` — passed
- `npm run build` — passed

## Checks intentionally not repeated

No full `npm test`, `scripts/smoke-api.sh`, Flutter test, Flutter analyze, or mobile build. The cycling home screen was not changed.

## Architecture / config

No schema, dependency, package, provider, or database change. No new secret. Dense cycling geometry is not stored. `cycling-regular` is HeiGIT's general cycling profile. `docs/product/CYCLING_PLAN.md` still leaves the Norway choice among regular, road, and mountain profiles open. This foundation does not claim that choice is settled and does not report surface quality.

`PROJECT_PLAN.md` still describes cycling engines as deferred. This change follows the authorized `CYCLING-001` task and `docs/product/CYCLING_PLAN.md` without rewriting that plan.

## Mobile boundary

The activity home still shows the existing coming-next screen for cycling. The motorcycle home is not a cycling recommendation surface, and wiring it would need new presentation beyond the current activity UI. No mobile files were changed.

## Manual validation needed

None for the domain tests. They do not call OpenRouteService or Kartverket.

## Remaining issues

- `ALPINE-001` is authorized for a later run. This run does not start it.
- Cycling intensity is request-scoped only.
- Route preview for the shared map stays on driving geometry.
- The Norway cycling-profile choice remains open.
