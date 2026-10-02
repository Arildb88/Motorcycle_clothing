# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: ALPINE-RESORTS-001
## Generation: 19
## Handoff-From: MANUAL-REGRESSION-002
## Authorization: authorized
## Promoted: 2026-10-02T18:08:58Z
## Task: Replace generic alpine place planning with ski-resort discovery

Implement a resort-oriented planning flow for alpine skiing and snowboarding using the Fnugg open API behind the existing NestJS API architecture.

User experience:
- Alpine skiing and snowboarding must ask which ski resort the user will use rather than presenting the generic motorcycle-style route planner.
- Support two discovery paths:
  1. Search for a ski resort by name.
  2. Use the user's selected/current coordinates to show nearby ski resorts.
- When several resorts are near the same area, show the alternatives and let the user explicitly choose the actual resort.
- Show resort name and useful distance/location context where available.
- Preserve Norwegian characters such as æ, ø and å in resort names and search.
- After a resort is selected, continue into the existing alpine/snowboard time, weather/elevation and recommendation flow.
- Do not require artificial start/destination routing for alpine or snowboard.

Provider:
- Use the documented Fnugg v1 open API.
- Resort-name typeahead may use /suggest/autocomplete and/or the resort search endpoint.
- Nearby discovery must use the documented /geodata/getnearest semantics with latitude/longitude and a bounded radius.
- Treat straight-line Fnugg distance as straight-line distance; do not label it driving distance.
- Keep Fnugg access server-side through NestJS and expose a provider-neutral RideWear contract to Flutter.
- Do not call Fnugg directly from Flutter.
- Request only fields RideWear actually needs.
- Include required user-visible attribution that resort information is sourced from Fnugg.no.
- Do not reproduce Fnugg.no as a competing clone or copy unrelated Fnugg content.
- Do not use Fnugg weather as a silent replacement for RideWear's existing weather architecture. Existing RideWear/MET weather and elevation logic remains authoritative for the clothing recommendation unless a separately authorized provider decision changes it.
- Handle Fnugg unavailable/empty responses without fabricating resorts.

Architecture:
- Preserve existing alpine and snowboard recommendation engines.
- No database/schema change unless strictly unnecessary; if persistence requires a new product/schema decision, BLOCK rather than inventing one.
- No paid service or secret should be introduced.
- Keep the provider adapter isolated so another resort source could replace or supplement Fnugg later.

Tests:
- Add deterministic provider/contract tests using fixtures/mocks.
- Add focused Flutter tests for resort search, multiple nearby resort choices, selection and empty/error states.
- Include Norwegian resort names such as names containing Å/å in deterministic test data.
- Run relevant API tests, Flutter tests and Flutter analyze.
- Do not claim live Fnugg/device GPS verification unless actually performed.

Do not implement cross-country trail discovery in this task. That will be handled separately. Do not add unrelated features or broad refactors. Keep dev and main untouched. Follow queue rules.
