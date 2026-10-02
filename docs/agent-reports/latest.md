# ALPINE-001 alpine and snowboard exposure foundation

## Task

`ALPINE-001`, generation 7, automatic handoff from `CYCLING-001` on `dev_test` range `88a5bccc7e83c44bcc3886a2bbc739be0ddc76eb..522bb2225086fd05b666b2ea52cf787f59de532a`. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/alpine-001-exposure-foundation`
- Implementation: `3ee19150989e220c66bdda58303812be59cd6c01`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/40 into `dev_test` only. Not merged to `dev` or `main`.

## Implementation

Alpine skiing and snowboarding stay separate activity values and share engine `alpine_v1`.

- A session is saved pins, not a road. The recommend path does not call road routing.
- Base, mid, and upper forecasts use each site's own coordinate and ground elevation. A missing upper height is not filled with the village elevation, and a lone village pin is not labeled as the summit.
- When only base and upper heights are known, mid is the halfway elevation at the midpoint, marked as an estimate. A third measured height is used as mid instead.
- A session of at least 180 minutes is sampled at start, middle, and end. A shorter session uses the start time.
- Worn clothing follows the colder of base and upper, and the upper-mountain wind. `exposure=base` dresses for the base and still reports the summit. `exposure=hike` adds a fixed wind allowance. The default is lift queues. These wind and metabolic numbers are assumptions, not a measured waiting-versus-descent split.
- Garments tagged `alpine_skiing` or `snowboarding` are shared. Motorcycle garments, one-piece suits, heated vests, and boots are not selected. Boots, goggles, and helmets are equipment notes. An empty alpine wardrobe returns a generic alpine kit. A warmer unused mid layer is left off the hill without a locker model.
- Motorcycle exposure, motorcycle speed, and personal offsets are not applied.

## Mobile boundary

`SELECTABLE_ACTIVITIES` is unchanged, so the app does not offer an alpine kit. No mobile change was made. The API accepts an `alpine_skiing` or `snowboarding` route and an optional `exposure` query (`lift`, `hike`, or `base`) without a schema change.

## Final control state

Promotion is automatic. This branch completes `ALPINE-001` and authorizes the next queued item.

- `ALPINE-001` completed and appended once to `consumed.md`
- `XC-SKI-001` active
- `active_id: XC-SKI-001`
- `promotion: automatic` unchanged
- `handoff_generation: 8` (generation 7 plus 1)
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `XC-SKI-001`, Generation 8, Handoff-From `ALPINE-001`, Authorization `authorized`
- This run does not implement `XC-SKI-001`

## Checks

Focused API tests, 16 passed:

- `apps/api/src/recommend/alpine/alpine.engine.spec.ts`
- `apps/api/src/recommend/alpine-recommend.service.spec.ts`

`nest build` succeeds. Two pre-existing type errors in the cycling recommend path were corrected so that build can pass: re-export `CyclingIntensity`, and include route endpoints on the cycling recommend parameter. No Flutter tests, no full API suite, no live routing or weather calls, no schema migration.

## Architecture / config

No new dependency, provider, paid service, or database schema change. No secrets. No resort catalog. `dev` and `main` were not modified.

`ARCHITECTURE.md` §15 still says alpine is a future engine. This task authorized the provider-independent foundation in `docs/product/ALPINE_SNOWBOARD_PLAN.md`. The work stays inside the existing recommend module, activity enums, saved waypoints, elevation port, and weather altitude parameter.

## Remaining

- Resort directories, piste routing, OSM lift tops, and avalanche or snow-quality claims were not added.
- The waiting-versus-descent split and the hike wind allowance are open parameters, not measured constants.
- Mobile alpine UI remains unavailable on purpose.
