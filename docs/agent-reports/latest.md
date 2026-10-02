# XC-TRAIL-DISCOVERY-001

## Task

`XC-TRAIL-DISCOVERY-001`, generation 20, authorized by the automatic final control update on `dev_test` from `06edf078faa6f0618f79c9d1dc82660943f2a1d0` to `02015c470b638fcb390c5d6e89fe4e1ce77e57d5`. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/xc-trail-discovery-001`
- Implementation: `d570cf71f67a19b4dfa84be4b8624a12b68dfcf3`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/52 into `dev_test` only. Not merged to `dev` or `main`.

## Implementation

Cross-country planning offers "Finn løype i nærheten" and "Planlegg egen tur". The existing start and finish flow stays available and remains the opening choice.

Nearby discovery uses a real current position or a selected place. Returned trails keep their Kartverket names, including Norwegian characters such as Å. Distance is the straight-line distance to the nearest published vertex, for example "1.1 km in a straight line" / "1.1 km i luftlinje". The screen says trail information comes from Kartverket. An empty response and an unavailable response do not invent trails.

A selected trail becomes the cross-country line. The line is a short subset of the published centerline, including both ends and the nearest vertex. Time, intensity, style, and the existing cross-country recommendation stay in place. RideWear/MET weather and Kartverket elevation remain the clothing forecast. Preparation codes are not shown as grooming status.

## Final control state

Promotion is automatic. The first queued unconsumed item is authorized. This run does not execute it.

- `XC-TRAIL-DISCOVERY-001` completed and appended once to `consumed.md`
- `DEMO-WARDROBE-ACTIVITY-001` is active
- `active_id: DEMO-WARDROBE-ACTIVITY-001`
- `promotion: automatic` unchanged
- `handoff_generation: 21`
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `DEMO-WARDROBE-ACTIVITY-001`, Generation 21, Handoff-From `XC-TRAIL-DISCOVERY-001`, Authorization `authorized`

## Checks

Flutter 3.47.1 (Dart 3.13.1), in `apps/mobile`:

- `flutter test test/trail_discovery_test.dart test/manual_regression_flow_test.dart test/ride_planner_test.dart` — 33 tests passed
- `flutter analyze` — no issues

Node, in `apps/api`:

- `npx jest src/trails/geonorge-trail.adapter.spec.ts --runInBand --no-coverage` — 1 suite, 6 tests passed
- `npx eslint src/trails src/app.module.ts` — no issues

## Architecture / config

Kartverket Turrutebasen is called only from a NestJS adapter at `https://wfs.geonorge.no/skwms1/wfs.turogfriluftsruter`. The feature type is `app:Skiløype`. Access was verified on 2026-10-02 with GetCapabilities and one GetFeature near Oslo. The Geonorge catalog lists the dataset as open data with license "No conditions apply to access and use". No API key is required. The response uses `lokalId`, `rutenavn`, and `senterlinje`. Flutter calls `/trails/nearby`. The nearby radius is 8 km in a straight line. No new dependency, schema migration, paid service, or secret. `dev` and `main` were not modified.

## Remaining

Live or device checks this run did not perform:

- A live Turrutebasen request from the running API.
- Device GPS permission and nearby-trail selection on an emulator.

Turrutebasen coverage depends on contributed routes, so an empty nearby result can be real. `DEMO-WARDROBE-ACTIVITY-001` is authorized for a later run. This run stops after merge.
