# MC-BASIC-LAYERS-001

## Task

`MC-BASIC-LAYERS-001`, generation 39, authorized by the automatic final control update that completed `SECURITY-HARDENING-001`. This run did not write a claim commit. The validated `next-task.md` token stayed the ownership record until this branch's final control state.

- Branch: `feature/mc-basic-layers-001`
- Implementation commit: `7c9c7c6ba1a9ae743949b99d1f991e6e7ea66d50`
- PR: pending, into `dev_test` only. Not merged to `dev` or `main`.

## Result

Motorcycle planning can name everyday clothes already worn under the protective kit. The choice lives on the recommendation request. There is no schema migration.

- Overdel and Underdel are separate dropdowns in the motorcycle planner. Both include Ingen / None and start empty. Empty is a valid request and is omitted from the query.
- Upper options are none, T-shirt, thin sweater, thick sweater, and wool base-layer top. Lower options are none, wool base-layer bottom, jeans, and sweatpants/joggers.
- A base piece can be worn with one sweater. Wool bottoms can be worn with jeans or joggers. Choosing the other piece in the same role replaces it. If a request still sends two pieces for one role, only the warmer credit is kept.
- Warmth credits are ordinal points on the existing 1–5 scale, not laboratory CLO values. Upper credit applies to the torso. Lower credit applies to the legs.
- A thick sweater is warmer than a thin sweater. A wool base top is warmer than a T-shirt. Extra base and mid suggestions use the remaining torso warmth. When that remaining warmth drops below the existing extra-layer threshold, those slots are omitted and the explanation `BASIC_UNDERLAYER_WARMTH` is emitted.
- The protective jacket and riding pants stay required. A T-shirt does not fill the shell slot. Basic jeans do not fill the pants slot, and selecting none does not demand ordinary jeans when protective motorcycle pants are already in the wardrobe.
- Cycling, alpine, snowboard, and cross-country requests ignore these fields. Motorcycle wardrobe isolation is unchanged.

## Checks

API, in `apps/api`:

- `npx jest` on the basic-layer spec, motorcycle engine spec, explanation spec, activity-planning contract, and demo wardrobe spec — 5 suites, 52 tests passed
- `npx tsc --noEmit -p tsconfig.build.json` — passed
- `npm run build` — passed

Flutter, in `apps/mobile`:

- `flutter analyze` on the changed planner, presentation, label, and test files — no issues
- `flutter test test/basic_layers_test.dart test/ride_planner_test.dart` — passed
- `flutter test test/recommendation_presentation_test.dart` — passed

Android, iOS, and live providers were not run.

## Final control state

`MC-BASIC-LAYERS-001` is completed and appended once to `consumed.md`. Automatic promotion authorizes `PRIVACY-DATA-001` at generation 40. This run must not execute generation 40.
