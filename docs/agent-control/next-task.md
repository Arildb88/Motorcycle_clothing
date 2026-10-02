# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: WEATHER-VALIDATION-001
## Generation: 14
## Handoff-From: RECOMMENDATION-UX-001
## Authorization: authorized
## Promoted: 2026-10-02T13:01:48Z
## Task: Implement the provider-neutral weather validation harness

Implement the deterministic, provider-neutral measurement/data-shaping foundation described by docs/research/WEATHER_DATA_QUALITY.md using the existing MET baseline and existing weather abstractions. Support paired coordinate/elevation/valid-time observations and measurable comparison outputs that can later accept additional providers without changing production recommendation behavior.

Do not subscribe to or integrate a new provider, make live-network-dependent CI tests, change the production weather provider, add paid services, expose secrets, or declare a provider superior without empirical data. Avoid schema/dependency changes unless the existing research explicitly makes them unnecessary; otherwise BLOCK.

Add focused deterministic tests and update the research/report with what is actually measurable. Follow queue rules.
