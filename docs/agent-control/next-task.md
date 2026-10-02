# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: ROUTING-WEATHER-002
## Generation: 3
## Handoff-From: none
## Authorization: authorized
## Promoted: 2026-10-02T12:00:00Z
## Task: Improve route ETA and weather sampling

Improve the current road-geometry weather sampling and ETA distribution using the existing provider-neutral routing/weather architecture. Preserve ephemeral dense geometry and the current provider boundary. Focus on segment-aware distance/progress and deterministic sampling/ETA behavior, including short routes and fallbacks.

No live traffic, new routing/weather provider, paid service, schema change, dependency, or persisted polyline. Do not invent per-leg timing when provider data does not contain it.

Use focused routing/weather tests first. Run broader API checks only when needed for changed behavior. Update report and follow queue rules.
