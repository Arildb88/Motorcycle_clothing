# Authorized RideWear Task
## Type: FEATURE_IMPLEMENTATION
## ID: CYCLING-WARDROBE-UX-001
## Generation: 48
## Handoff-From: PLACE-SEARCH-AVAILABILITY-001
## Authorization: authorized
## Promoted: 2026-10-07T21:15:18Z
## Task: Cycling-specific garment choices and simple seasonal defaults

Add cycling-specific selectable garment types: long cycling trousers/tights, short cycling shorts, triathlon suit, short-sleeve technical T-shirt, long-sleeve technical jersey, thin cycling jacket, fingerless cycling gloves, thin full-finger gloves. "Fingerhansker" is interpreted as fingerless alongside the separate thin full-finger option; use unambiguous nb/en labels.
Reuse existing canonical categories/body zones with cycling presets/subtypes where possible. Preserve physical garment identity and existing garments; do not mix motorcycle gear into cycling. Triathlon suit must cover torso and legs without double counting.
Brand/model must be optional and unobtrusive for cycling; free-text garment registration works without catalogue selection. Untouched category defaults must not become explicit community ratings.
Use category-appropriate simple defaults: short technical T-shirt is light insulation, not automatically treated as a warm winter layer. Long trousers, long jersey and jacket expose thin/medium/warm choices mapped to existing tiers.
Put detailed warmth/wind/water and winter adjustments in a collapsed "Avanserte innstillinger / vinter" section. Do not add a second warmth scale; preserve existing 1–5 semantics. Defaults are estimates, not measured manufacturer values.
Recommendation logic must use temperature, wind, precipitation and intensity, not assume summer/cycling always needs a T-shirt or block warmer gear.
Verify all eight choices, optional brand, advanced controls, saving/editing, presets mapped to correct zones, and existing cycling/non-cycling garments and recommendation flows. Minimal additive schema migration is authorized only if existing fields cannot preserve these distinctions; verify Prisma generate/validate and migration on disposable local Postgres if used.

Execution boundaries and verification:
- Explicitly approved by Arild in chat on 2026-10-07. Read current code and architecture/security/privacy constraints. Existing Flutter -> NestJS -> Prisma boundaries remain.
- No new dependencies, external providers, paid services, credentials or deployment. Keep dev/main untouched.
- Branch from latest dev_test; PR to dev_test; merge only after required checks pass. Follow queue success/blocker protocol, update docs/agent-reports/latest.md, and stop after this ID.
- Run focused regression tests for changed behavior, API tests/build when API changes, Flutter analyze and relevant Flutter tests when mobile changes. Report checks honestly.
