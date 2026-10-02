# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: INTEGRATION-001
## Generation: 11
## Handoff-From: none
## Authorization: authorized
## Promoted: 2026-10-02T14:30:00Z
## Task: Run integration/regression pass for the new activity foundations

Validate the completed cycling, alpine/snowboard, cross-country skiing, route/weather/elevation, recommendation and mobile ad-policy foundations together. Run the existing API test/typecheck/lint commands and Flutter analyze/tests that are supported by the repository. Add focused integration/regression tests where concrete coverage gaps are found and fix concrete regressions within the existing architecture.

Do not add product features, dependencies, schema changes, providers, paid services, or broad refactors. Do not contact live external providers when deterministic mocks/fixtures exist. If a failure requires an architectural/provider/schema decision, BLOCK and report the exact boundary instead of inventing it.

Update the agent report with exact commands and results. Follow queue rules.
