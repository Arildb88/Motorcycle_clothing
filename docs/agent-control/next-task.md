# Authorized RideWear Task
## Type: FEATURE_IMPLEMENTATION
## ID: THERMAL-ZONE-FEEDBACK-001
## Generation: 52
## Handoff-From: SNOWBOARD-LABEL-001
## Authorization: authorized
## Promoted: 2026-10-07T22:16:13Z
## Task: Optional torso and legs comfort feedback linked to the actual trip

Extend "Hvordan kjentes antrekket?" after a trip with optional separate Overkropp / Upper body and Bein / Legs ratings: kaldt / comfortable / varmt (correct nb labels Kaldt / Passe / Varmt and English Cold / Comfortable / Hot).
Preserve existing overall feedback; users may omit zone ratings. Tie feedback to authenticated owner, actual activity/trip and correct outbound/return leg for commutes.
Reuse existing body-area feedback/personal offset structures and activity-specific engines. Learn from recorded actual worn kit/configuration when available; do not silently claim a recommendation was worn. Do not turn this into shared garment ratings.
Apply conservative existing learning/shrinkage and limits to the corresponding body zone. Torso-cold feedback must not directly warm legs, and legs-cold must not warm torso; no cross-activity leakage. Preserve existing overall behavior and avoid applying the same event twice through overall-plus-zone updates or retries.
Persist zone feedback through existing APIs when possible. Minimal additive migration is authorized only if needed; no unrelated personalization rewrite or unsupported personal claims.
Test optional zone input, cold/comfortable/hot for each zone, owner/trip/leg binding, duplicate submission handling, activity isolation, overall compatibility, targeted future recommendation changes and unchanged unrelated zones/new-user defaults. If migrating, verify Prisma generate/validate and additive migration on disposable local Postgres.

Execution boundaries and verification:
- Explicitly approved by Arild in chat on 2026-10-07. Read current code and architecture/security/privacy constraints. Existing Flutter -> NestJS -> Prisma boundaries remain.
- No new dependencies, external providers, paid services, credentials or deployment. Keep dev/main untouched.
- Branch from latest dev_test; PR to dev_test; merge only after required checks pass. Follow queue success/blocker protocol, update docs/agent-reports/latest.md, and stop after this ID.
- Run focused regression tests for changed behavior, API tests/build when API changes, Flutter analyze and relevant Flutter tests when mobile changes. Report checks honestly.
