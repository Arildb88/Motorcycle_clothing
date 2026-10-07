# CYCLING-WARDROBE-UX-001

## Task

`CYCLING-WARDROBE-UX-001`, generation 48, authorized from `PLACE-SEARCH-AVAILABILITY-001`. This run did not write a claim commit. The validated `next-task.md` token stayed the ownership record until this branch's final control state.

- Branch: `feature/cycling-wardrobe-ux-001`
- Implementation commit: `a0f6b11e63789d6bddb79be393dfdbe34ab72dba`
- PR: targeting `dev_test` only. Not merged to `dev` or `main`.

## Result

Cycling wardrobe add and edit now offers eight cycling garment choices instead of motorcycle presets: long cycling trousers/tights, short cycling shorts, triathlon suit, short-sleeve technical T-shirt, long-sleeve technical jersey, thin cycling jacket, fingerless cycling gloves, and thin full-finger gloves. Norwegian labels say "Fingreløse sykkelhansker" and "Tynne sykkelhansker med fingre" so "Fingerhansker" is not used as an ambiguous label.

Each choice maps to an existing category and body zone. Long trousers and shorts are `pants` / legs. The technical T-shirt and long jersey are `base_layer` / torso. The jacket is `shell_jacket` / torso. Both glove choices are `gloves` / hands. The triathlon suit is `one_piece_suit` / `full_body` and covers torso and legs as one garment.

A short technical T-shirt is warmth 1. It is not the category default warmth 3. Long trousers, the long jersey, and the jacket expose Thin / Medium / Warm, stored as warmth 2, 3, and 4 on the existing 1–5 scale. Those defaults are estimates, not measured manufacturer values. Detailed warmth, wind, water, breathability, ventilation, heated, and liner controls stay inside the collapsed "Avanserte innstillinger / vinter" section.

Brand and model are optional text fields. A garment can be saved from its name without a catalogue selection. Choosing a preset or a thin/medium/warm band does not mark the tiers as an explicit community rating. The share-rating control stays in the advanced section and still requires a deliberate slider change plus a brand and model.

The stored `preset` column is a nullable additive field. Existing garments stay null. Motorcycle presets are unchanged and are not offered on the cycling form.

Recommendation matching still uses temperature, wind, precipitation, and intensity. A cold, windy, easy ride prefers the warmer long jersey, tights, jacket, and thin full-finger gloves over the light T-shirt, shorts, and fingerless gloves, and it does not use a motorcycle jacket. A hot, dry, hard ride wears the light T-shirt and shorts and does not wear the warm jacket. A triathlon suit on a mild ride is one wear item and does not also add a T-shirt or shorts. When warmer trousers and a jersey are owned, a cold ride uses those and does not wear the suit. A cycling-tagged one-piece without the triathlon preset stays out of the cycling kit.

## Checks

- `flutter analyze` on the changed mobile files: no issues found
- `flutter test test/cycling_wardrobe_ux_test.dart`: passed
- `flutter test test/garment_catalogue_test.dart`: passed
- `flutter test test/wardrobe_sharing_test.dart`: the cycling form membership test passed. `shows Norwegian sharing copy and saves a chosen combination` failed because `wardrobeSharingBody` is still the English sentence in `app_nb.arb`. That string was already English in the generated Norwegian file on `dev_test` before this change. This task did not edit that copy.
- Focused API tests passed: `cycling-presets.spec.ts`, `wardrobe.service.spec.ts`, `cycling.engine.spec.ts`, `cycling-recommend.service.spec.ts`
- API production build: passed (`npm run build` in `apps/api` after `prisma generate`)
- Prisma schema validate: passed
- `prisma migrate deploy` on disposable local Postgres 16 database `motorcycle_preset_check`: passed, including `20261007220000_cycling_garment_preset`
- `prisma migrate diff` from migrations to the schema: no difference
- Android, iOS, and a live wardrobe save were not run

## Final control state

`CYCLING-WARDROBE-UX-001` is completed and appended once to `consumed.md`. `active_id` is `WARDROBE-REMOVE-SHARING-001`. `handoff_state` is `authorized`. `handoff_generation` is 49. `promotion` stays `automatic`. `next-task.md` authorizes `WARDROBE-REMOVE-SHARING-001` with `Handoff-From: CYCLING-WARDROBE-UX-001`. This run does not execute that ID.
