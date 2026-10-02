# MOBILE-ACTIVITIES-001 mobile activity planning

## Task

`MOBILE-ACTIVITIES-001`, generation 12, authorized by the automatic final control update on `dev_test` commit `7e9f5781b9344948a26f33d19a0a774f62f344c3`. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/mobile-activities-001-planning`
- Implementation: `fcce535c3de1fa92695cb82c0d29c58535a3ff8b`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/45 into `dev_test` only. Not merged to `dev` or `main`.

## Implementation

The existing planner now requests the recommendation for the activity the user is planning.

- Cycling sends `intensity` (`easy`, `steady`, or `hard`).
- Alpine skiing and snowboarding send `exposure` (`lift`, `hike`, or `base`).
- Cross-country skiing sends `intensity`, and `style` (`classic` or `skate`) only when the user picks one. Leaving style unset omits the query parameter.
- Motorcycle still sends only `routeId` and `departureAt`.
- Saved routes use that activity type. Alpine and cross-country keep the saved session length instead of a driving ETA. New alpine and snowboard plans default to 240 minutes, matching the server fallback. New cross-country plans default to 120 minutes, matching the engine default.
- The result shows the effort, exposure, or style returned on `comfort` when those fields are present.
- Profile and onboarding still offer only motorcycle, hiking, and cycling. That matches API `SELECTABLE_ACTIVITIES`. Alpine, snowboard, and cross-country are session choices. Hiking still has no engine.

## Final control state

Promotion is automatic. The first queued unconsumed item is authorized. This run does not execute it.

- `MOBILE-ACTIVITIES-001` completed and appended once to `consumed.md`
- `RECOMMENDATION-UX-001` is `active`
- `active_id: RECOMMENDATION-UX-001`
- `promotion: automatic` unchanged
- `handoff_generation: 13`
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `RECOMMENDATION-UX-001`, Generation 13, Handoff-From `MOBILE-ACTIVITIES-001`, Authorization `authorized`, Promoted `2026-10-02T12:50:11Z`

## Checks

Flutter 3.47.5 / Dart 3.13.4, in `apps/mobile`:

- `flutter analyze` on the touched Dart files — no issues
- `flutter test test/ride_planner_test.dart test/ride_analysis_result_test.dart test/activity_context_test.dart test/nb_localization_test.dart` — passed

API, in `apps/api`:

- `npx jest --no-coverage src/recommend/activity-planning.contract.spec.ts` — 4 tests passed

Live MET, Kartverket, and OpenRouteService were not required.

## Architecture / config

No new dependency, provider, paid service, schema change, or secret. `dev` and `main` were not modified.

## Remaining

- Profile persistence still rejects alpine, snowboard, and cross-country because `SELECTABLE_ACTIVITIES` is motorcycle, hiking, and cycling. Changing that allow-list was not authorized.
- Hiking still has no recommendation engine.
- Recommendation reason codes that are not already localized still fall back to the code. Clearing that up is `RECOMMENDATION-UX-001`.
- The Flutter UI was not exercised in a browser or emulator. Coverage is the focused widget and contract tests above.
