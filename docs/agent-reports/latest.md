# SNOWBOARD-LABEL-001

## Task

`SNOWBOARD-LABEL-001`, generation 51, authorized from `PLACE-UNICODE-RESORT-001`. This run did not write a claim commit. The validated `next-task.md` token stayed the ownership record until this branch's final control state.

- Branch: `fix/snowboard-label-001`
- Implementation commit: `7ffe633dbe1f63433faebe3d78d1ef1c2aff7d23`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/83 into `dev_test` only. Not merged to `dev` or `main`.

## Result

The Norwegian activity label is Snowboard. The planner compound label is Alpint eller snowboard, in the same position as the existing Alpint & snowboard wording. The activity chooser, wardrobe, and home menu keep that shared Alpint & snowboard entry. English stays Snowboarding and Skiing or snowboarding. The `snowboarding` enum, persisted tags, and engine routing are unchanged. User-created names were not rewritten.

## Checks

- `flutter gen-l10n` regenerated Norwegian strings from `app_nb.arb`. The generated file matches the two label edits. Five pre-existing untranslated Norwegian messages remain.
- `flutter analyze` on the changed localization and planner files and the focused tests: no issues found
- `flutter test test/nb_localization_test.dart test/alpine_snowboard_unify_test.dart`: passed (3 localization tests and 5 alpine/snowboard tests)
- `flutter test test/activity_context_test.dart`: passed (6 tests). Selecting Snowboard still uses `AppActivity.snowboarding` and api value `snowboarding`
- API files were not changed, so API tests and the API build were not run
- Android and iOS devices were not run

## Final control state

`SNOWBOARD-LABEL-001` is completed and appended once to `consumed.md`. `active_id` is `THERMAL-ZONE-FEEDBACK-001`. `handoff_state` is `authorized`. `handoff_generation` is 52. `promotion` stays `automatic`. `next-task.md` authorizes `THERMAL-ZONE-FEEDBACK-001` with `Handoff-From: SNOWBOARD-LABEL-001`. This run does not execute that ID.
