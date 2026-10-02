# Authorized RideWear Task
## Type: VALIDATION_AND_FIX
## ID: TEST-COVERAGE-001
## Generation: 27
## Handoff-From: WARDROBE-SHARING-001
## Authorization: authorized
## Promoted: 2026-10-02T20:10:46Z
## Task: Close meaningful automated-test gaps in critical RideWear MVP flows

Review existing automated coverage after STABILIZATION-001 and add tests only where important MVP behavior remains materially unprotected.

Prioritize:
- Authentication/profile/password/logout.
- Wardrobe and demo-garment coexistence/idempotency.
- Motorcycle/cycling planning and recommendation inputs.
- Alpine/snowboard resort discovery and selection.
- Cross-country trail/manual planning.
- Weather/elevation/provider error and empty states.
- Norwegian Unicode/location handling and important state/race regressions.

Requirements:
- Prefer deterministic unit/widget/integration/API tests over brittle snapshot or timing-dependent tests.
- Do not chase a numeric coverage percentage or add tests that only execute lines without checking behavior.
- Fix small reproducible defects uncovered by the new tests when they fit existing architecture.
- No new product features, providers, schema migrations, paid services or broad refactors.

Run relevant/full Flutter and API suites and Flutter analyze. Keep dev and main untouched. Follow queue rules.
