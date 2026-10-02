# ALPINE-SNOWBOARD-UNIFY-001

## Task

`ALPINE-SNOWBOARD-UNIFY-001`, generation 25, authorized by the automatic final control update in `b350daaab33eb036b0dc5ea947743a4e2b354128`. The parent tip was the unclaimed from-idle token for `STABILIZATION-001` at generation 24. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/alpine-snowboard-unify-001`
- Implementation commit: `23918a15aeb8cce7813209f75def2d10fbd58e09`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/56 into `dev_test` only. Not merged to `dev` or `main`.

## Result

Alpine skiing and snowboarding are one user-facing resort activity. The chooser and home menu show "Alpine & snowboard" / "Alpint & snowboard". Cross-country skiing stays separate. Hiking stays unavailable.

The shared planner still uses Fnugg resort discovery, the selected resort, session time, and the existing MET weather, elevation, and alpine recommendation flow. Switching between alpine skiing and snowboarding keeps that resort and does not send another resort search. Stored and requested activity values remain `alpine_skiing` and `snowboarding`. Saved resort routes from both values appear in the same list. A saved route keeps its own activity type when it is recommended.

No blanket rule treats snowboarding as warmer or more strenuous. Personal too-cold / too-warm feedback is unchanged.

## Checks

Flutter 3.47.6 / Dart 3.13.5, in `apps/mobile`:

- `flutter analyze` — no issues
- `flutter test test/alpine_snowboard_unify_test.dart test/activity_context_test.dart test/nb_localization_test.dart test/ride_planner_test.dart test/resort_discovery_test.dart test/manual_regression_flow_test.dart` — passed

API behavior did not change, so API tests were not run. Android, iOS, and live Fnugg, MET, and device GPS were not run.

## Architecture / config

Flutter -> NestJS -> provider stays the same. Secrets stay server-side. No schema migration, new provider, dependency, or paid service. `dev` and `main` were not modified.

## Final control state

Promotion is automatic. The first queued unconsumed item is authorized. This run does not execute it.

- `ALPINE-SNOWBOARD-UNIFY-001` completed and appended once to `consumed.md`
- `WARDROBE-SHARING-001` is active
- `active_id: WARDROBE-SHARING-001`
- `promotion: automatic` unchanged
- `handoff_generation: 26`
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `WARDROBE-SHARING-001`, Generation 26, Handoff-From `ALPINE-SNOWBOARD-UNIFY-001`, Authorization `authorized`

## Remaining

Device and live resort checks were not run. `WARDROBE-SHARING-001` is authorized for a later run. This run stops after merge.
