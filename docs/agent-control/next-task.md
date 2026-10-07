# Authorized RideWear Task
## Type: FEATURE_IMPLEMENTATION
## ID: WARDROBE-REMOVE-SHARING-001
## Generation: 49
## Handoff-From: CYCLING-WARDROBE-UX-001
## Authorization: authorized
## Promoted: 2026-10-07T21:38:02Z
## Task: Remove share-this-rating controls from every wardrobe

Remove "Del denne vurderingen / Share this rating" controls and prompts from every activity wardrobe and garment add/edit/detail surface.
Stop shared-rating submission from these mobile flows, including hidden auto-submit handlers: adding/editing personal tiers must not silently contribute to the shared catalogue.
Keep private garment values, ownership, manual edits, existing catalogue data and snapshot defaults intact. Do not delete catalogue tables, erase existing aggregates, or automatically backfill contributions.
Retain truthful privacy documentation about previously collected aggregates; adjust current-flow wording as needed.
Test all activity wardrobe surfaces and verify saving/editing garments does not call a contribution endpoint. This is UI/submission removal, not authorization for a new data-collection mechanism.

Execution boundaries and verification:
- Explicitly approved by Arild in chat on 2026-10-07. Read current code and architecture/security/privacy constraints. Existing Flutter -> NestJS -> Prisma boundaries remain.
- No new dependencies, external providers, paid services, credentials or deployment. Keep dev/main untouched.
- Branch from latest dev_test; PR to dev_test; merge only after required checks pass. Follow queue success/blocker protocol, update docs/agent-reports/latest.md, and stop after this ID.
- Run focused regression tests for changed behavior, API tests/build when API changes, Flutter analyze and relevant Flutter tests when mobile changes. Report checks honestly.
