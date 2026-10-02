# XC-SKI-001 cross-country skiing foundation

## Task

`XC-SKI-001`, generation 8, automatic handoff from `ALPINE-001` on `dev_test` range `522bb2225086fd05b666b2ea52cf787f59de532a..a4e4c249cc48aca14b526633eb0cdd99163a1b4d`. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/xc-ski-001-foundation`
- Implementation: `32ca789b95eaaea19a2756e781b3dbcd04fc1d3e`
- PR: pending into `dev_test` only. Not merged to `dev` or `main`.

## Implementation

Cross-country skiing uses engine `xc_v1`. Classic and skate are not separate engines.

- The line is the saved waypoints, in waypoint order. The recommend path does not call road routing and does not treat a driving route as a ski track.
- ETA follows the route's duration along that line. A missing positive duration uses 120 minutes and is flagged as assumed.
- Each sample is forecast at its own coordinate, time, and ground elevation. A missing height is left missing. It is not copied from a neighbouring point and it is not treated as a climb.
- Intensity is easy, steady, or hard. A missing value becomes steady and is flagged. Higher intensity adds metabolic heat. These offsets are assumptions, not measurements.
- A rise of at least 15 metres between known heights adds a further metabolic offset. A descent does not. Wind chill uses forecast wind only. Ski speed is not invented, and motorcycle airflow coefficients are not used.
- Worn clothing follows the moving samples. A short colder sample is packed (mid layer, shell, or overmitts) instead of dressing the whole tour for that minute. The shell starts in the pack unless rain, wind, or sustained cold says to wear it.
- Classic versus skate changes only the equipment note for boots. Boots are not a warmth score. Garments must be tagged `xc_skiing`. Alpine-only garments, motorcycle garments, one-piece suits, and heated vests are not selected.
- The result states that grooming status and wax advice are not provided.

## Mobile boundary

`SELECTABLE_ACTIVITIES` is unchanged, so the app does not offer a cross-country kit. No mobile change was made. The API accepts an `xc_skiing` route, the existing `intensity` query, and an optional `style` query (`classic` or `skate`) without a schema change.

## Final control state

Promotion is automatic. This branch completes `XC-SKI-001` and authorizes the next queued item.

- `XC-SKI-001` completed and appended once to `consumed.md`
- `WEATHER-PROVIDER-RESEARCH-002` active
- `active_id: WEATHER-PROVIDER-RESEARCH-002`
- `promotion: automatic` unchanged
- `handoff_generation: 9` (generation 8 plus 1)
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `WEATHER-PROVIDER-RESEARCH-002`, Generation 9, Handoff-From `XC-SKI-001`, Authorization `authorized`
- This run does not implement `WEATHER-PROVIDER-RESEARCH-002`

## Checks

Focused recommend tests, 65 passed, including the new cross-country suites:

- `apps/api/src/recommend/xc/xc.engine.spec.ts`
- `apps/api/src/recommend/xc-recommend.service.spec.ts`

`nest build` succeeds. No Flutter tests, no full API suite, no live routing or weather calls, no schema migration.

## Architecture / config

No new dependency, provider, paid service, or database schema change. No secrets. No Sporet, OSM piste, or seNorge client. `dev` and `main` were not modified.

The work stays inside the existing recommend module, activity enum `xc_skiing`, saved waypoints, elevation port, and weather altitude parameter. `style` is an optional query on the existing recommend endpoint.

## Remaining

- Named trails, OSM nordic geometry, and a ski router were not added.
- A user-declared cabin stop is not a separate input. Short slices come from distance along the line.
- The metabolic, climb, and wind numbers are open assumptions, not measured constants.
- Grooming, wax, and snow-presence hints were not added.
- Mobile cross-country UI remains unavailable on purpose.
