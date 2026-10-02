# RECOMMENDATION-EXPLAIN-001

## Task

`RECOMMENDATION-EXPLAIN-001`, generation 33, authorized by the automatic final control update that completed `DEPARTURE-COMPARE-001`. The parent tip held that token at generation 32 with `DEPARTURE-COMPARE-001` active. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/recommendation-explain-001`
- Implementation commit: `4673568ae2bdf57829c1985fe2e327ac2399c037`
- PR: pending, into `dev_test` only. Not merged to `dev` or `main`.

## Result

Each recommended garment can say why it is there, using only reason codes that engine already emitted for that slot.

- Wear and pack stay separate. A packed item does not receive a wear-only reason, and a worn item does not receive a pack-only reason.
- A code is omitted when the engine did not emit it, when the slot rule does not read that input, when a liner or vent was not selected on that garment, or when a wardrobe gap belongs to another slot.
- Missing reasons stay blank. Limit notes such as incomplete weather stay in the limits section.
- Motorcycle clothes stay out of cycling, alpine, snowboard, and cross-country explanations. Demo clothes are not shared into another activity. A shared personal alpine garment can be explained only with cycling codes when cycling is the engine.
- Alpine and snowboard share the alpine rules. No rain sentence is added, because that engine does not emit one.
- A non-zero motorcycle cold-sensitivity bias is not turned into a personal-history sentence. The motorcycle engine does not emit that claim.

## Checks

API, focused:

- `explain-kit` — 9 tests passed
- `alpine-recommend`, `cycling-recommend`, `xc-recommend`, and `departure-compare.recommend` — 9 tests passed
- `tsc --noEmit` reported no errors in the changed API files. Existing spec-file type errors were already present and were not changed.

Flutter, in `apps/mobile`:

- `flutter analyze` on the four changed Dart files — no issues
- `flutter test test/recommendation_presentation_test.dart test/ride_analysis_result_test.dart` — 12 tests passed

Android, iOS, and a live provider call were not run.

## Architecture / config

Flutter -> NestJS -> provider stays the same. Secrets stay server-side. No new provider, dependency, schema migration, or paid service. `dev` and `main` were not modified.

## Final control state

Promotion is automatic. The first queued unconsumed item is authorized. This run does not execute it.

- `RECOMMENDATION-EXPLAIN-001` completed and appended once to `consumed.md`
- `THERMAL-FEEDBACK-001` is active
- `active_id: THERMAL-FEEDBACK-001`
- `promotion: automatic` unchanged
- `handoff_generation: 34`
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `THERMAL-FEEDBACK-001`, Generation 34, Handoff-From `RECOMMENDATION-EXPLAIN-001`, Authorization `authorized`

## Remaining

A device pass of the explanation lines was not run. `THERMAL-FEEDBACK-001` is authorized for a later run. This run stops after merge.
