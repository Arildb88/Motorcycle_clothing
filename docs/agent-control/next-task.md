# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: CYCLING-001
## Generation: 4
## Handoff-From: none
## Authorization: authorized
## Promoted: 2026-10-02T12:30:00Z
## Task: Implement cycling recommendation foundation

Implement the first cycling-specific recommendation foundation according to docs/product/CYCLING_PLAN.md, reusing shared route/weather/elevation infrastructure but not motorcycle clothing rules. MVP scope: cycling route/weather along route at ETA, ground elevation where available, cycling intensity inputs already supported/authorized by the plan, wear/pack reasons and confidence with safe fallbacks.

Do not add turn-by-turn navigation, live rerouting, power-meter integration, unsupported surface-quality claims, new paid providers, dependencies, or schema changes unless the existing plan explicitly makes them unnecessary. If a required schema/dependency/provider decision appears, BLOCK instead of inventing it.

Use focused domain/API tests. Mobile work is allowed only if the plan and existing activity UI support it without schema/dependency expansion; otherwise block/report the boundary. Follow queue rules.
