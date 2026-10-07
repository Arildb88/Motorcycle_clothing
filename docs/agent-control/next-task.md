# Authorized RideWear Task
## Type: BUG_FIX
## ID: SNOWBOARD-LABEL-001
## Generation: 51
## Handoff-From: PLACE-UNICODE-RESORT-001
## Authorization: authorized
## Promoted: 2026-10-07T22:07:51Z
## Task: Use Snowboard instead of Snøbrett in Norwegian UI

Replace the Norwegian user-facing activity label "Snøbrett" with "Snowboard" everywhere, including activity chooser, alpine/snowboard planner, wardrobe, profile, recommendations and related compound labels as grammatically appropriate.
Keep language-neutral snowboarding enum values, persisted data and engine routing unchanged. Do not translate user-created names.
Use existing nb localization resources and regenerate via existing tooling if needed. Verify no obsolete Norwegian activity labels remain and activity selection still uses the same engine. This is a label-only change; no schema or recommendation changes.

Execution boundaries and verification:
- Explicitly approved by Arild in chat on 2026-10-07. Read current code and architecture/security/privacy constraints. Existing Flutter -> NestJS -> Prisma boundaries remain.
- No new dependencies, external providers, paid services, credentials or deployment. Keep dev/main untouched.
- Branch from latest dev_test; PR to dev_test; merge only after required checks pass. Follow queue success/blocker protocol, update docs/agent-reports/latest.md, and stop after this ID.
- Run focused regression tests for changed behavior, API tests/build when API changes, Flutter analyze and relevant Flutter tests when mobile changes. Report checks honestly.
