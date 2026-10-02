# MANUAL-REGRESSION-002

## Task

`MANUAL-REGRESSION-002`, generation 18, authorized by the from-idle human token on `dev_test` commit `472fa3f55e2b64e3da3aa4668fde97632f4d5e2e`. Generation 17 had been recovered and remains spent. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/manual-regression-002`
- Implementation: `312f34423d803cab79ce020668d1d91e07b0a784`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/50 into `dev_test` only. Not merged to `dev` or `main`.

## Implementation

Place search publishes one outcome at a time. Selectable suggestions clear the provider error, including "Stedsøk er midlertidig utilgjengelig." / "Place search is temporarily unavailable." A real failure still clears suggestions and shows the localized error. The same field behavior is covered for start, destination, and the single-place alpine planner. A typed Norwegian query is kept when editing a selected place. Swap still moves the selected place.

"Bruk nåværende posisjon" / "Use current location" is its own 48dp control. A successful fix writes the device coordinates and the current-location label onto the first planner stop, including snowboard's single place. Permission denial, a blocked permission, disabled location services, and a failed read set an explicit message beside the control.

Location search sends the query through one UTF-8 percent-encoding. `Tromsø`, `Ålesund`, `Ærøy`, and `Øvre Åmot` are not folded to ASCII. The place field does not autocorrect those characters. The API geocoding request uses the same Unicode text.

"Endre passord" / "Change password" and "Logg ut" / "Sign out" stay filled RideWear buttons at least 48dp tall, with 12dp between them. Navigation, password behavior, logout, and localization are unchanged.

## Final control state

Promotion is automatic. The first queued unconsumed item is authorized. This run does not execute it.

- `MANUAL-REGRESSION-002` completed and appended once to `consumed.md`
- `ALPINE-RESORTS-001` is active
- `active_id: ALPINE-RESORTS-001`
- `promotion: automatic` unchanged
- `handoff_generation: 19`
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `ALPINE-RESORTS-001`, Generation 19, Handoff-From `MANUAL-REGRESSION-002`, Authorization `authorized`

## Checks

Flutter 3.47.6 (Dart 3.13.5), in `apps/mobile`:

- `flutter test test/manual_regression_flow_test.dart test/ride_planner_test.dart` — 26 tests passed
- `flutter analyze` — no issues

Node, in `apps/api`:

- `npx jest src/routing/ors-geocoding.service.spec.ts --runInBand --no-coverage` — 1 suite, 6 tests passed

## Architecture / config

No new dependency, provider, paid service, schema migration, or secret. Current position still uses the existing Geolocator adapter. Place search still goes through the RideWear API. `dev` and `main` were not modified.

## Remaining

Live or device checks this run did not perform:

- An emulator or device pass for "Bruk nåværende posisjon" against a real location permission prompt.
- Live place search for Norwegian names such as Tromsø, Ålesund, and Ærøy.
- A visual check of the profile button spacing on a device.

`ALPINE-RESORTS-001` is authorized for a later run. This run stops after merge.
