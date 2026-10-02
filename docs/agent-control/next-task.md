# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: GEO-ELEVATION-002
## Generation: 1
## Handoff-From: none
## Promoted: 2026-10-02T09:55:00Z
## Task: Validate altitude-aware weather behavior

Validate the existing Kartverket elevation -> MET altitude foundation with focused automated tests and deterministic fixtures/mocks. Cover low/high elevation cases, coordinate/rounding behavior, cache/fallback behavior, partial elevation failure, and that MET receives altitude only when valid elevation exists.

Do not add providers, paid services, dependencies, schema changes, or live-network-dependent CI tests. Do not claim measured forecast accuracy from mocked tests. Add only minimal production changes if validation exposes a concrete defect.

Run focused API tests for touched geo/weather code; broader suites only if the change materially affects them. Update report and follow queue rules.
