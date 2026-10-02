# Authorized RideWear Task

## Type: IMPLEMENTATION

## ID: MANUAL-REGRESSION-001

## Generation: 16

## Handoff-From: none

## Authorization: authorized

## Promoted: 2026-10-02T13:54:09Z

## Task: Fix concrete regressions found during manual Flutter emulator testing

Reproduce and fix the concrete defects found during the post-MVP manual emulator pass.

Route/location flow:
- Place search currently returns selectable results while the UI can simultaneously show "Stedsøk er midlertidig utilgjengelig." Fix the underlying success/error state handling; do not merely hide real provider/network errors.
- When a concrete place result is selected, preserve the selected result's meaningful display label and coordinates instead of degrading it to the typed query text. For example, selecting "Kristiansand lufthavn, Kjevik" must not result in the field displaying only "Kristiansand". The same applies to concrete POIs such as Arendal Trefoldighetskirke.
- Keep the user's typed search query separate from the selected provider result. The selected place label, coordinates and any existing provider metadata needed by the planner must remain associated with the selected place.
- Fix "Bytt om" so start and destination swap correctly, including labels, coordinates and associated selected-place state.
- Verify the complete existing route flow with valid selected places: search -> select -> swap -> route preview -> save -> analysis -> recommendation.
- Use the existing ORS/HeiGIT integration. Do not add another routing/geocoding provider.

Activity planning:
- Do not force every activity through a motorcycle-shaped planning flow.
- Cycling, alpine skiing, snowboarding and cross-country skiing already have completed recommendation foundations and must expose a usable Flutter recommendation/planning flow instead of a placeholder that redirects the user to motorcycle.
- Preserve each activity's existing recommendation engine and already-supported intensity/style/exposure inputs.
- Preserve existing motorcycle behavior.
- Do not build the future resort-search or nearby-cross-country-trail integrations in this task. Those require separate product/data-source work.
- For the current UI, alpine skiing and snowboarding must not require an artificial motorcycle-style start/destination route when the existing recommendation contract can operate from the activity/location inputs already supported.
- Hiking currently has no separate recommendation engine and must not be presented as a completed recommendation flow that silently uses motorcycle_v1. Clearly mark it unavailable/coming later or remove it from active recommendation choices. Do not implement a new hiking engine in this task.

Wardrobe test UX:
- During the current development/test phase, make "Legg til demo-klær" available even when the wardrobe already contains garments.
- Preserve personal garments and existing demo-garment identification/removal behavior.
- Avoid accidental duplicate demo garments when demo seeding is repeated.
- Keep the existing demo implementation functional. Do not implement the future activity-specific demo wardrobes in this task; that will be handled separately with the redesigned activity flows.

Profile UX:
- Make the existing "Endre passord" action visually identifiable as a normal RideWear button with an adequate touch target.
- Preserve the existing password-change behavior, navigation, validation and localization.

Regression coverage:
- Add focused Flutter/widget/domain regression tests for the defects fixed.
- Specifically cover preservation of a selected concrete place label independently of the typed query where practical.
- Cover swapping complete selected-place state, not only visible text.
- Run Flutter analyze and the relevant Flutter tests.
- Run focused API tests if backend behavior is changed.
- Record any live ORS/device checks that cannot be deterministic instead of claiming they passed.

Do not add dependencies, schema migrations, new external providers, paid services, new recommendation engines or broad refactors. Do not expose secrets. Keep dev and main untouched. Follow queue rules.
