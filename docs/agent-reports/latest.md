# ALPINE-PLANNER-SIMPLIFY-001

## Task

`ALPINE-PLANNER-SIMPLIFY-001`, generation 54, authorized from `DEPENDENCY-MAINTENANCE-002`. This run did not write a claim commit. The validated `next-task.md` token stayed the ownership record until this branch's final control state.

- Branch: `feature/alpine-planner-simplify-001`
- Implementation commit: `fb4e4c5a917bff154f85748261bd6ae23ef3dd3c`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/86 into `dev_test` only. Not merged to `dev` or `main`.

## Result

Alpine skiing and snowboarding stay distinct activities and engines. The home screen no longer shows the skiing-or-snowboarding selector or the exposure control. Opening the planner keeps the current activity: snowboarding still opens snowboarding, and alpine skiing still opens alpine skiing. The planner keeps that selector.

Resort sessions request the existing `lift` exposure value. A stored hike or base choice is not sent. The alpine engine's lift, queue, and descent behavior is unchanged. The API still accepts an explicit hike or base value from an older client.

The session-length chips still store elapsed minutes in the ski area. Alpine weather samples use that duration from the departure time, at the start and, for a longer session, the middle and end. Departure and arrival stay separate from that duration. The label is now "Hvor lenge er du aktiv?" / "How long are you active?". There is no second question under the field. Cross-country still uses "Øktlengde" / "Session length" and its own duration.

Resort result cards hide latitude and longitude. A measured straight-line distance can still be shown. The selected resort keeps its coordinates for weather, elevation, and nearby discovery, and the row checkmark still marks it. The "Valgt skianlegg" / "Selected resort" block and its link are gone. One attribution remains above the results: "Informasjon om skianlegg er hentet fra Fnugg.no", linking to https://fnugg.no. Per-result Fnugg links are gone. The Hafjell Alpinsenter fixture at 61.24, 10.45 shows neither those coordinates nor a second Fnugg link.

For alpine and snowboard results, "Begrensninger og antakelser" / "Limits and assumptions" shows only the existing missing-top-station notice, and only when that condition is present. The section is hidden otherwise. Other activities still show their limit rows. Confidence and the engine's reason codes stay. Unavailable weather remains its own error, with retry.

## Checks

- `flutter analyze`: no issues found.
- Focused Flutter tests passed: `alpine_planner_simplify_test.dart`, `ride_planner_test.dart`, `resort_discovery_test.dart`, `fnugg_attribution_test.dart`, `alpine_snowboard_unify_test.dart`, `place_unicode_resort_test.dart`, `ux_polish_test.dart`, `ride_analysis_result_test.dart`, `manual_regression_flow_test.dart`.
- No API behavior change, so no API tests or API build were run.
- Android and iOS devices were not run. Live Fnugg was not contacted.

## Final control state

`ALPINE-PLANNER-SIMPLIFY-001` is completed and appended once to `consumed.md`. `active_id` is `none`. `handoff_state` is `idle`. `handoff_generation` stays 54. `promotion` stays `automatic`. `next-task.md` is idle with `Authorization: none`. No queued unconsumed task remained, so this close does not authorize another ID. This run does not execute another task.
