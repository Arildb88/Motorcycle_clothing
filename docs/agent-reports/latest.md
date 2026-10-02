# CYCLING-001 cycling recommendation foundation

## Task

`CYCLING-001`, generation 6, from-idle authorization `88a5bccc7e83c44bcc3886a2bbc739be0ddc76eb`. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

## Implementation

Cycling routes now use engine `cycling_v1` instead of the motorcycle engine.

- Weather samples follow the cycling line at ETA, reusing the existing sampler. If cycling routing is down, samples fall back to saved waypoints and the duration hint.
- OpenRouteService requests `cycling-regular` only when `travelProfile` is `cycling`. Motorcycle and driving requests stay on `driving-car`. `cycling-regular` is the interim generic profile. It is not a validated Oslo or Bergen default and it is not a surface-quality claim.
- Ground elevation is passed into the forecast when the elevation lookup returns a height. A missing height does not fail the recommendation.
- Ride style is the explicit input `easy`, `steady`, or `hard` (`intensity` query). A missing or unknown value becomes `steady` and is reported as assumed.
- Wear, pack, reason codes, and confidence are cycling-specific. A hard dry ride vents or packs the shell. Rain on a short later segment is packed rather than worn for the whole ride. A short cold cell does not set the sustained outfit.
- Garments are used only when tagged `cycling`. Motorcycle garments, one-piece suits, and heated vests are not selected. An empty cycling wardrobe returns a generic cycling kit. A helmet is assumed safety equipment and is not chosen as a warmth layer.
- Motorcycle exposure, motorcycle speed defaults, armour presets, and personal offsets are not applied. Cold-sensitivity shrinkage is not applied on this path.

## Mobile boundary

The existing activity screen still shows the coming-next state for cycling, and the ride planner still saves motorcycle routes. Wiring that UI would present motorcycle clothing as cycling kit. No mobile change was made. The API accepts a cycling route and an optional `intensity` query without a schema change.

## Final control state

Promotion is automatic. This branch completes `CYCLING-001` and authorizes the next queued item.

- `CYCLING-001` completed and appended once to `consumed.md`
- `ALPINE-001` active
- `active_id: ALPINE-001`
- `promotion: automatic` unchanged
- `handoff_generation: 7` (token generation 6 plus 1; the control block on the parent still showed 5 because there was no claim)
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `ALPINE-001`, Generation 7, Handoff-From `CYCLING-001`, Authorization `authorized`
- This run does not implement `ALPINE-001`

## Checks

Focused API tests, 21 passed:

- `apps/api/src/recommend/cycling/cycling.engine.spec.ts`
- `apps/api/src/recommend/cycling-recommend.service.spec.ts`
- `apps/api/src/routing/ors-routing.adapter.spec.ts`

No Flutter tests, no full API suite, no live routing or weather calls, no schema migration.

## Architecture / config

No new dependency, provider, paid service, or database schema change. No secrets. `dev` and `main` were not modified.

## Remaining

- Which ORS cycling profile fits Norwegian mixed commuting is still the open question in `docs/product/CYCLING_PLAN.md`.
- Cycling presets, personal offsets, wind-vector product copy, and surface notes are later stages and were not added.
- Mobile cycling UI remains the existing coming-next screen.
