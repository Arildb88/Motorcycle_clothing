# THERMAL-FEEDBACK-001

## Task

`THERMAL-FEEDBACK-001`, generation 34, authorized by the automatic final control update that completed `RECOMMENDATION-EXPLAIN-001`. The parent tip held that token at generation 33 with `RECOMMENDATION-EXPLAIN-001` active. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/thermal-feedback-001`
- Implementation commit: `751f5e1efc7219811f443a57eea1b26906c60bca`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/64 into `dev_test` only. Not merged to `dev` or `main`.

## Result

A recommendation can be marked for kald, passe, or for varm. The rating is stored on the activity that produced it.

- The three Norwegian choices are For kald, Passe, and For varm. They are on today's recommendation and on the planner analysis screen.
- A missing activity type does not fall back to motorcycle, so the submit control stays off.
- The rating updates only that activity's existing `PersonalOffset` (`zone: overall`). Alpine skiing and snowboarding stay on separate rows. Motorcycle clothes stay on the motorcycle wardrobe.
- `UserProfile.coldSensitivity` is not rewritten. Motorcycle recommendations still add that manual prior, then the shrunk feedback residual. Cycling, alpine, snowboard, and cross-country apply only their own residual and do not read the manual prior or another activity's offset.
- One extreme rating from an empty offset stores a 1 °C residual and applies `1/7` °C, because shrinkage uses `n/(n+6)`. The stored mean stays within ±3 °C. A long run of the same rating approaches at most 1 °C of applied bias.
- Comfortable feedback pulls an existing mean toward 0. No feedback (`n` is 0) applies 0, including a stored mean with no samples, so existing recommendations stay as they were.
- The engines do not turn the bias into a personal-history sentence. `canClaimPersonal` stays false.
- The API still accepts the older slightly-cold and slightly-warm ratings at half the step. The screen does not show them.

## Checks

API, focused:

- `thermal-calibration`, `feedback.service`, `thermal-bias.exposure`, `cycling-recommend`, `alpine-recommend`, `xc-recommend`, `activity-foundations`, `cycling.engine`, `alpine.engine`, `xc.engine`, and `explain-kit` — 59 tests passed
- `nest build` passed
- `tsc --noEmit` still reports existing spec-file union errors. The new activity-type assertion was cast so it does not add one. Production files in this change typecheck through the build.

Flutter, in `apps/mobile`:

- `flutter analyze` on `feedback_sheet.dart` and `ride_analysis_result_screen.dart` — no issues
- `flutter test test/thermal_feedback_sheet_test.dart test/ride_analysis_result_test.dart test/nb_localization_test.dart` — 14 tests passed

Android, iOS, and a live provider call were not run.

## Architecture / config

Flutter -> NestJS -> provider stays the same. Secrets stay server-side. No new provider, dependency, schema migration, or paid service. `dev` and `main` were not modified.

`ActivityLog` still has no `activityType` column. The calibration key is the existing `PersonalOffset` row. A later query of logs by activity would need an additive column. This task did not add one.

Hiking can be stored if a client sends that activity type. Hiking still has no recommendation engine, so nothing reads that row.

## Final control state

Promotion is automatic. The first queued unconsumed item is authorized. This run does not execute it.

- `THERMAL-FEEDBACK-001` completed and appended once to `consumed.md`
- `PERFORMANCE-001` is active
- `active_id: PERFORMANCE-001`
- `promotion: automatic` unchanged
- `handoff_generation: 35`
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `PERFORMANCE-001`, Generation 35, Handoff-From `THERMAL-FEEDBACK-001`, Authorization `authorized`

## Remaining

A device pass of the feedback sheet was not run. `PERFORMANCE-001` is authorized for a later run. This run stops after merge.
