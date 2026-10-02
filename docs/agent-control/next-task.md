# Authorized RideWear Task
## Type: FEATURE
## ID: DEPARTURE-COMPARE-001
## Generation: 32
## Handoff-From: UX-POLISH-001
## Authorization: authorized
## Promoted: 2026-10-02T22:56:32Z
## Task: Let users compare a small set of departure times using existing route-weather capabilities

Implement a lightweight departure-time comparison for route-oriented activities where the existing data supports it.

Requirements:
- Reuse existing route geometry, route-weather sampling, MET integration and activity planning; do not introduce a new weather/provider stack.
- Present 2–4 useful nearby departure alternatives with concise comparable conditions (temperature, precipitation, wind and other already-supported material conditions).
- Make clear which time each forecast applies to and handle unavailable/out-of-range forecast data gracefully.
- Do not invent a single opaque “best” score; users should be able to compare the factual conditions.
- Keep provider/API calls bounded and avoid obvious duplicate calls; preserve existing caching/provider boundaries.
- Norwegian localization and focused Flutter/API tests as applicable.
- No new provider, paid service, schema migration or broad redesign.
- Keep dev/main untouched and follow queue/control rules.
