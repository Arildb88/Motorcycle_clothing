# RECOMMENDATION-UX-001 recommendation result presentation

## Task

`RECOMMENDATION-UX-001`, generation 13, authorized by the automatic final control update on `dev_test` commit `0240fa31a66716aaff0e35ef7f9780872b586004`. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/recommendation-ux-001-results`
- Implementation: `35f660f0cb4cc5bbd6583f369429ef676c5cb442`
- PR: pending, into `dev_test` only. Not merged to `dev` or `main`.

## Implementation

The planner result and the home recommendation card now present the API payload in separate sections.

- Wear and pack stay in their own sections, with a short hint under each heading.
- Kit reasons, such as cold, rain, wind, and which mountain site sets the kit, are listed under "Why this kit".
- Missing data, assumptions, equipment that this kit does not choose, and "we do not claim this" notes stay under "Limits and assumptions". That includes village weather not being used as the summit, missing elevation, and no wax or grooming advice.
- Confidence is the returned level (high, medium, or low). It is no longer the heading for every reason code.
- Route endpoints, exposure temperature, ground-elevation range, and alpine base/mid/upper rows appear only when the API sent those values. An estimated mid height is labeled estimated. A missing summit row is not invented.
- Elevation attribution is shown when the API returned it. It is not described as forecast accuracy.
- Activity reason codes that previously fell back to the raw code are localized in English and Norwegian. An unknown code stays visible as the code.

Motorcycle requests are unchanged. The home card still shows the same temperature, exposure, rain, wind, and confidence metrics, and it still hides an empty pack list.

## Final control state

Promotion is automatic. The first queued unconsumed item is authorized. This run does not execute it.

- `RECOMMENDATION-UX-001` completed and appended once to `consumed.md`
- `WEATHER-VALIDATION-001` is `active`
- `active_id: WEATHER-VALIDATION-001`
- `promotion: automatic` unchanged
- `handoff_generation: 14`
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `WEATHER-VALIDATION-001`, Generation 14, Handoff-From `RECOMMENDATION-UX-001`, Authorization `authorized`, Promoted `2026-10-02T13:01:48Z`

## Checks

Flutter 3.47.5 / Dart 3.13.4, in `apps/mobile`:

- `flutter analyze` on the touched Dart files — no issues
- `flutter test test/recommendation_presentation_test.dart test/ride_analysis_result_test.dart test/locale_controller_test.dart test/nb_localization_test.dart` — 14 tests passed

Live MET, Kartverket, and OpenRouteService were not required. The Flutter UI was not exercised in a browser or emulator.

## Architecture / config

No new dependency, provider, paid service, schema change, or secret. Recommendation ranking and physics were not changed. `dev` and `main` were not modified.

## Remaining

- Profile persistence still rejects alpine, snowboard, and cross-country because `SELECTABLE_ACTIVITIES` is motorcycle, hiking, and cycling.
- Hiking still has no recommendation engine.
- Home still omits the empty-pack sentence that the planner result shows.
- A later weather-validation harness is `WEATHER-VALIDATION-001`.
