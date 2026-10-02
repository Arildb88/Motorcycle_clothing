# MANUAL-REGRESSION-001

## Task

`MANUAL-REGRESSION-001`, generation 16, authorized by the from-idle human token on `dev_test` commit `74025d088a7d36d3c7fb8cfb1420a8e1f773fff5`. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/manual-regression-001`
- Implementation: `dd83c2188daf7c3e2953aa116c52fd623342b6aa`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/49 into `dev_test` only. Not merged to `dev` or `main`.

## Implementation

Place search applies only the latest request. A successful result clears the error. A real provider failure still clears suggestions and shows the localized error, including "Stedsøk er midlertidig utilgjengelig." / "Place search is temporarily unavailable."

Selecting a concrete place keeps the richer label. Pelias labels such as "Kristiansand lufthavn, Kjevik" stay the display label when the short name is only the locality. The typed query stays separate from the selected place. Coordinates and provider place id come from resolve.

"Bytt om" copies each stop's local id, so the field, label, coordinates, and provider id move together.

Alpine skiing and snowboarding plan from one place. Extra places stay optional. They do not show start/destination, the motorway toggle, round trip, or the road map. Motorcycle, cycling, and cross-country still need two points. Cycling and cross-country keep their existing intensity, style, and exposure controls. Road preview stays for motorcycle and cycling.

Hiking has no recommendation engine. The coming-soon home no longer offers "Open Motorcycle today". The routes screen does not remap hiking to motorcycle or load motorcycle routes.

"Legg til demo-klær" / "Add demo clothes" is available when the wardrobe has personal garments and no demo rows. Repeating the seed does not insert another demo set. Replacing demo clothes deletes only demo rows.

"Endre passord" / "Change password" is a filled RideWear button at least 48dp tall. Navigation, validation, and localization are unchanged.

## Final control state

Promotion is automatic. No queued unconsumed item remains, so this close is idle and authorizes nothing.

- `MANUAL-REGRESSION-001` completed and appended once to `consumed.md`
- `active_id: none`
- `promotion: automatic` unchanged
- `handoff_generation: 16`
- `handoff_state: idle`
- `paused: false`
- `next-task.md`: idle, Generation 16, Handoff-From `none`, Authorization `none`

## Checks

Flutter 3.47.6 (Dart 3.13.5), in `apps/mobile`:

- `flutter test test/manual_regression_flow_test.dart test/ride_planner_test.dart test/wardrobe_demo_test.dart test/waypoint_draft_test.dart test/activity_context_test.dart test/nb_localization_test.dart` — 40 tests passed
- `flutter analyze` — no issues

Node, in `apps/api`, after `npx prisma generate`:

- `npm test -- src/routing/ors-geocoding.service.spec.ts src/routes/routes.service.spec.ts src/wardrobe/wardrobe.service.spec.ts --runInBand --no-coverage` — 3 suites, 32 tests passed

## Architecture / config

No new dependency, provider, paid service, schema migration, or secret. Existing ORS/HeiGIT mapping is unchanged except that a concrete Pelias label is kept as the display label. `dev` and `main` were not modified.

## Remaining

Live or device checks this run did not perform:

- A device or emulator pass against live OpenRouteService / HeiGIT geocoding and routing.
- Live place search for Kristiansand lufthavn, Kjevik and Arendal Trefoldighetskirke. The regression tests use fixtures and fakes.

No further queued task is authorized.
