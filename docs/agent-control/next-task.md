# Authorized RideWear Task
## Type: FEATURE
## ID: RECOMMENDATION-EXPLAIN-001
## Generation: 33
## Handoff-From: DEPARTURE-COMPARE-001
## Authorization: authorized
## Promoted: 2026-10-02T23:13:51Z
## Task: Explain why RideWear recommends clothing and distinguish wear-now from useful bring-along items

Build on the existing recommendation output and wardrobe/activity rules.

Requirements:
- Add concise user-facing reasons tied only to inputs/rules RideWear actually used (for example temperature, wind, precipitation, activity/intensity, elevation or personal thermal settings when present).
- Never fabricate causal explanations from data the recommendation engine did not use.
- Where existing recommendation logic/data supports it, distinguish garments to wear from optional items worth bringing for changing conditions.
- Respect activity-specific wardrobe availability, MC isolation, personal/demo separation and Alpint & snowboard/XC/cycling behavior.
- Keep explanations simple and Norwegian-localized; handle missing inputs gracefully.
- Prefer extending the existing recommendation contract/model minimally rather than creating a parallel recommendation engine.
- Add deterministic tests covering explanation correctness and garment eligibility.
- No new provider, paid service, schema migration or unrelated redesign unless the existing model makes the task impossible; if so BLOCK rather than guess.
- Follow queue/control rules.
