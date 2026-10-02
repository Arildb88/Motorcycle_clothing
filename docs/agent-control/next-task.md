# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: MVP-SMOKE-001
## Generation: 15
## Handoff-From: WEATHER-VALIDATION-001
## Authorization: authorized
## Promoted: 2026-10-02T13:12:57Z
## Task: Run an MVP smoke/readiness pass and fix concrete in-scope defects

Exercise the repository-supported happy paths for auth, profile, wardrobe, route planning, motorcycle recommendations, cycling, alpine/snowboard and cross-country recommendations, plus the ads-off default. Run the strongest existing deterministic API and Flutter checks practical in the repository. Fix concrete regressions that stay within existing architecture and contracts.

Do not add new features, dependencies, providers, schema migrations, paid services or broad refactors. Do not fake successful live-provider behavior. Record any manual/device/live-service checks that still require a human separately instead of claiming they passed.

Leave dev and main untouched. Update the report with exact automated results, remaining manual checks and known MVP issues. Follow queue rules.
