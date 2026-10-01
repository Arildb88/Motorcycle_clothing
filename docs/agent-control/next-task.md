# Authorized RideWear Task

## Task: Route weather sampling using real route geometry + ETA

This is an already-approved follow-up to RideWear real routing v1.

### Prerequisite
First inspect latest `dev_test` and verify that real server-side road routing is present and provides road-following geometry plus route distance/duration.

If that prerequisite is NOT present or is incomplete, DO NOT redesign or reimplement routing. STOP and update `docs/agent-reports/latest.md` with the missing prerequisite.

### Goal
Improve RideWear weather sampling so route recommendations use positions along the real road-following route geometry and estimated arrival time at those positions, rather than sparse saved waypoints / simple duration fractions.

### Scope
- Reuse the existing routing/provider abstractions and real route analysis.
- Derive a reasonable set of weather sample points along the road geometry.
- Associate each sample with an ETA based on route progress and provider route duration.
- Feed those samples into the existing recommendation/weather flow.
- Keep behavior provider-independent above the routing adapter.
- Preserve safe fallback behavior when real routing/geometry is unavailable.
- Add focused tests for geometry sampling, ETA progression, endpoints/short routes, and fallback behavior.
- Keep the implementation modest; do not build turn-by-turn navigation or live rerouting.

### Explicitly out of scope
- No dependency/package upgrades.
- No DB migration or schema redesign.
- No new routing provider.
- No paid service.
- No Flutter map/tile package.
- No turn-by-turn navigation.
- No live rerouting.
- No unrelated UI redesign.
- Do not modify `dev` or `main`.

### Tests
Run relevant API tests plus:
- `npm test`
- `npm run build`

If Flutter code is changed, also run:
- `flutter analyze`
- `flutter test`

All required tests must pass before merge to `dev_test`.

### Completion
Follow `docs/agent-control/guardrails.md`.
Update `docs/agent-reports/latest.md`, merge successful work only to `dev_test`, then STOP.
