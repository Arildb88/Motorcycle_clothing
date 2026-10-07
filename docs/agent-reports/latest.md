# PLACE-SEARCH-AVAILABILITY-001

## Task

`PLACE-SEARCH-AVAILABILITY-001`, generation 47, authorized from `REAL-DATA-ONLY-001`. This run did not write a claim commit. The validated `next-task.md` token stayed the ownership record until this branch's final control state.

- Branch: `fix/place-search-availability-001`
- Implementation commit: `4e26287eabb38bd24d924d9f8263435aec07b87b`
- PR: targeting `dev_test` only. Not merged to `dev` or `main`.

## Result

Searching could return suggestions while choosing one did not select a place, and the Norwegian UI could say "Stedsøk er midlertidig utilgjengelig."

HeiGIT Pelias autocomplete, search, reverse, and structured search are real routes. Without a key they return HTTP 401 JSON (`Authorization field missing`). `GET /pelias/v1/place` returns the same nginx HTML 404 as a path that does not exist. Resolve called that missing route and the API mapped every non-success, including that 404, to a temporary outage. This is not a key-scope failure: autocomplete and `/place` do not fail the same way.

`GET /location/places` now returns the coordinates, label, and address Pelias autocomplete already had. The app selects those coordinates and does not call resolve for that suggestion. Canonical latitude and longitude update the start, destination, stop, and commute fields through the existing callback. A suggestion without coordinates still uses resolve. A resolve HTTP 404 or an empty feature collection is `PLACE_NOT_FOUND`, not a temporary outage. A missing key or HTTP 401/403 is `GEOCODING_NOT_CONFIGURED`. Provider 5xx, timeout, and network failures stay `GEOCODING_UNAVAILABLE`.

No matches stay "Ingen steder funnet" / "No places found". Failures show localized nb/en copy and a Retry button. The raw exception is not shown. Logs name autocomplete or resolve and the HTTP status, timeout, network, authentication, empty body, or not_configured. They do not include the key, the search text, or coordinates.

Tapping a suggestion does not dismiss the field before the tap, including while the keyboard is open. Clear, edit, and swap still drop a resolve that finishes late, and the field stays usable.

Pull request 76's selection-state fixes were already on `dev_test` (`ffcf2b1`). They were not copied again.

## Checks

- `flutter analyze`: no issues found
- `flutter test test/place_search_availability_test.dart test/manual_regression_flow_test.dart test/api_route_geometry_service_test.dart test/location_services_test.dart test/nb_localization_test.dart`: passed
- Focused API tests passed: `ors-geocoding.service.spec.ts`, `location.controller.spec.ts`
- API production build: passed (`npm run build` in `apps/api` after `prisma generate`)
- Live keyed search: not verified. This environment has no `ORS_API_KEY` and no `apps/api/.env`. No keyed request was sent for Arendal or Kristiansand.
- Unauthenticated probe only: autocomplete, search, reverse, and structured search returned HTTP 401 JSON. `/pelias/v1/place` returned nginx HTML 404. No place coordinates were recorded from that probe.

## Final control state

`PLACE-SEARCH-AVAILABILITY-001` is completed and appended once to `consumed.md`. `active_id` is `CYCLING-WARDROBE-UX-001`. `handoff_state` is `authorized`. `handoff_generation` is 48. `promotion` stays `automatic`. `next-task.md` authorizes `CYCLING-WARDROBE-UX-001` with `Handoff-From: PLACE-SEARCH-AVAILABILITY-001`. This run does not execute that ID.
