# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: MOBILE-ACTIVITIES-001
## Generation: 12
## Handoff-From: INTEGRATION-001
## Authorization: authorized
## Promoted: 2026-10-02T12:37:11Z
## Task: Connect supported activity recommendations to the existing mobile planning flow

Integrate the existing cycling, alpine skiing, snowboarding and cross-country skiing recommendation foundations into the existing Flutter activity/planning UI. Reuse existing activity values, route/planning models and API contracts. Let the user select only inputs already supported by the completed foundations, including applicable intensity/style inputs, and request/display the matching recommendation.

Do not redesign navigation, add schema changes, dependencies, providers, live tracking, power-meter support, grooming data, wax advice, or new activity types. Preserve motorcycle behavior. If an existing API/mobile contract is insufficient without an unauthorized model decision, BLOCK and report it.

Add focused Flutter/API contract tests for changed behavior and run Flutter analyze on touched code. Follow queue rules.
