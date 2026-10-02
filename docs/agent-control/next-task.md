# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: DEMO-WARDROBE-ACTIVITY-001
## Generation: 21
## Handoff-From: XC-TRAIL-DISCOVERY-001
## Authorization: authorized
## Promoted: 2026-10-02T18:43:57Z
## Task: Expand demo wardrobe with activity-relevant garments

Improve demo wardrobe data so motorcycle, cycling, alpine skiing, snowboarding and cross-country skiing can be tested with realistic activity-relevant clothing choices.

Requirements:
- Keep demo garments clearly identifiable as demo data and separate from personal garments.
- Preserve the existing idempotent demo-data behavior.
- Demo garments must be useful to the existing recommendation model; do not create unsupported garment capabilities or a new recommendation engine.
- Provide reasonable coverage across the currently supported activities and layering/body-area concepts already represented by the domain model.
- Do not remap hiking into another activity.
- Preserve localization and existing personal wardrobe behavior.
- No schema migration, new provider, paid service or broad architecture change.

Tests:
- Add/update focused deterministic tests for demo generation, idempotency, coexistence with personal garments and activity coverage.
- Run relevant API/Flutter tests and Flutter analyze where affected.

Keep dev and main untouched. Follow queue rules.
