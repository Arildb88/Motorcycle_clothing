# PLACE-UNICODE-RESORT-001

## Task

`PLACE-UNICODE-RESORT-001`, generation 50, authorized from `WARDROBE-REMOVE-SHARING-001`. This run did not write a claim commit. The validated `next-task.md` token stayed the ownership record until this branch's final control state.

- Branch: `feature/place-unicode-resort-001`
- Implementation commit: `e9fa6587f8cb147bc73cd73a9f021f0c78f2c0eb`
- PR: pending, into `dev_test` only. Not merged to `dev` or `main`.

## Result

Place, resort, and route-name fields keep keyboard suggestions enabled. Turning suggestions off hides Norwegian layouts on some Android keyboards, so æ, ø, and å could not be typed. No input formatter strips those letters. A cleared selection or an open composing range does not replace the typed query. Åmli, Øyer, Sæby, and ÆØÅ are percent-encoded once on the place and resort requests.

Live Fnugg `GET /search?type=resort&q=Kongsberg` and `GET /suggest/autocomplete?q=Kongsberg` on 2026-10-07 both returned zero hits. The current resort index has no Kongsberg record, and `https://fnugg.no/kongsberg/` returned HTTP 410. Nearby resorts inside 50 km were Storeskar (Notodden) and Fagerfjell (Flesberg). Those were not substituted for the town name, and no resort record or coordinates were invented. An empty name search stays the localized no-match result. An outage shows retry. A selected resort still returns its provider coordinates to the existing planner flow.

## Checks

- `flutter analyze` on the changed mobile files and `test/place_unicode_resort_test.dart`: no issues found
- `flutter test test/place_unicode_resort_test.dart test/resort_discovery_test.dart test/place_search_availability_test.dart test/manual_regression_flow_test.dart test/ride_planner_test.dart`: passed (47 tests)
- `npx jest src/resorts/fnugg-resort.adapter.spec.ts src/resorts/resort-query.dto.spec.ts src/routing/ors-geocoding.service.spec.ts`: passed (18 tests)
- `npm run build` in `apps/api`: passed
- Live Fnugg name search and autocomplete were queried with the existing public resort API. Pelias was not called. Android and iOS devices were not run

## Final control state

`PLACE-UNICODE-RESORT-001` is completed and appended once to `consumed.md`. `active_id` is `SNOWBOARD-LABEL-001`. `handoff_state` is `authorized`. `handoff_generation` is 51. `promotion` stays `automatic`. `next-task.md` authorizes `SNOWBOARD-LABEL-001` with `Handoff-From: PLACE-UNICODE-RESORT-001`. This run does not execute that ID.
