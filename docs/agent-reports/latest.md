# ALPINE-RESORTS-001

## Task

`ALPINE-RESORTS-001`, generation 19, authorized by the automatic final control update on `dev_test` from `472fa3f55e2b64e3da3aa4668fde97632f4d5e2e` to `06edf078faa6f0618f79c9d1dc82660943f2a1d0`. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/alpine-resorts-001`
- Implementation: `d6094183409534fa5e8a4016172b41bc79db6935`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/51 into `dev_test` only. Not merged to `dev` or `main`.

## Implementation

Alpine skiing and snowboarding ask which ski resort the user will use. The generic start/destination planner stays for motorcycle, cycling, and cross-country skiing.

Two discovery paths:

- Search by resort name. `Ål` stays Unicode and is percent-encoded once. Results are not selected until the user taps one.
- Nearby resorts from the current position or from a selected place. Several resorts stay listed so the user chooses the actual resort.

Distance from Fnugg is shown as straight-line distance, for example "26.7 km in a straight line" / "26.7 km i luftlinje". The screen says resort information comes from Fnugg.no. Empty and unavailable responses do not invent resorts.

The selected resort becomes the single planning place. Time, exposure, session length, and the existing alpine/snowboard recommendation stay in place. RideWear/MET weather and Kartverket elevation remain the clothing forecast. Fnugg weather is not requested.

## Final control state

Promotion is automatic. The first queued unconsumed item is authorized. This run does not execute it.

- `ALPINE-RESORTS-001` completed and appended once to `consumed.md`
- `XC-TRAIL-DISCOVERY-001` is active
- `active_id: XC-TRAIL-DISCOVERY-001`
- `promotion: automatic` unchanged
- `handoff_generation: 20`
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `XC-TRAIL-DISCOVERY-001`, Generation 20, Handoff-From `ALPINE-RESORTS-001`, Authorization `authorized`

## Checks

Flutter 3.47.1 (Dart 3.13.1), in `apps/mobile`:

- `flutter test test/resort_discovery_test.dart test/manual_regression_flow_test.dart test/ride_planner_test.dart` — 34 tests passed
- `flutter analyze` — no issues

Node, in `apps/api`:

- `npx jest src/resorts/fnugg-resort.adapter.spec.ts --runInBand --no-coverage` — 1 suite, 6 tests passed
- `npx eslint src/resorts src/app.module.ts` — no issues

## Architecture / config

Fnugg is called only from a NestJS adapter at `https://api.fnugg.no`. Name search uses `/search` with `type=resort` because `/suggest/autocomplete` does not return coordinates. Nearby uses `/geodata/getnearest` with `distance=50`. Requested fields are `id`, `name`, and `location.lat`/`location.lon`. Flutter calls `/resorts/search` and `/resorts/nearby`. No new dependency, schema migration, paid service, or secret. `dev` and `main` were not modified.

## Remaining

Live or device checks this run did not perform:

- A live Fnugg request from the running API.
- Device GPS permission and nearby-resort selection on an emulator.

`XC-TRAIL-DISCOVERY-001` is authorized for a later run. This run stops after merge.
