# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: MANUAL-REGRESSION-002
## Generation: 18

## Handoff-From: none

## Authorization: authorized

## Promoted: 2026-10-02
## Task: Fix remaining location, Norwegian input and profile UX regressions

Fix the concrete defects confirmed during the manual emulator verification after MANUAL-REGRESSION-001.

Location search:
- Fix the state where successful/selectable location search results can still show "Stedsøk er midlertidig utilgjengelig."
- Preserve real provider/network errors when a request actually fails. Do not merely hide the error widget.
- Verify the fix for start, destination and single-location activity planners.
- Preserve the selected-place label, coordinates, provider id and typed-query separation fixed by MANUAL-REGRESSION-001.
- Preserve the now-working complete-state "Bytt om" behavior.

Current position:
- Fix "Bruk nåværende posisjon" / current-position selection in the Flutter planner.
- Use the existing device location/permission architecture if present.
- Handle denied/unavailable location explicitly rather than silently failing.
- A successful position selection must provide usable coordinates to the existing planner.
- Do not add a new location provider or dependency unless already present architecture requires none; otherwise BLOCK and report the boundary.

Norwegian text input:
- Ensure RideWear location/search text fields accept normal Norwegian Unicode characters including æ, ø and å, both uppercase and lowercase.
- Do not normalize Norwegian place names into ASCII-only strings.
- Ensure search requests encode Unicode input correctly.
- Add focused regression coverage using realistic Norwegian place-name strings.

Profile:
- Add clear visual spacing between the "Endre passord" and "Logg ut" buttons while preserving the existing RideWear styling and minimum touch targets.
- Preserve navigation, password behavior, logout behavior and localization.

Tests:
- Add focused Flutter/widget/domain tests for the corrected search state, Unicode input and current-position state where deterministic testing is practical.
- Run Flutter analyze and relevant Flutter tests.
- Run focused API tests only if backend behavior changes.
- Record emulator/device/live-provider checks separately instead of claiming they passed when they were not run.

Do not add schema migrations, new external providers, paid services, recommendation engines or broad refactors. Keep dev and main untouched. Follow queue rules.
