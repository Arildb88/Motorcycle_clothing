# Authorized RideWear Task

## Type: IMPLEMENTATION

## Task: Clearly marked demo wardrobe with safe removal

Improve the existing demo wardrobe experience so demo garments are visually obvious and can be removed together without deleting any user-created wardrobe items.

Read first:
- `docs/agent-control/guardrails.md`
- `docs/agent-control/next-task.md`
- `docs/agent-reports/latest.md`

### Required investigation before coding

Inspect the current wardrobe/demo implementation on latest `dev_test` before choosing an implementation.

Determine how demo wardrobe items are currently created, stored, updated and deleted.

Use the smallest reliable existing mechanism to identify demo-created garments. Do NOT identify demo items only by their display name.

If the current data model cannot reliably preserve demo identity after a garment is renamed/edited without a DB/schema migration, STOP and report the exact minimal schema change that would be required. Do not create a migration in this task.

### User-visible behavior

- Demo garments must have clear, natural demo names, for example `Demo – Touring jacket`, `Demo – Motorcycle trousers`, etc., localized appropriately.
- Demo garments must also show a small visible `DEMO` marker/badge in the wardrobe UI so they are immediately distinguishable from real garments.
- When at least one demo-created garment exists, show a bottom action/button for deleting the demo wardrobe.
- Norwegian Bokmål text: `Slett demo-garderobe`.
- Provide the corresponding English localization.
- Pressing the delete action must show a confirmation dialog explaining that only garments added by the demo wardrobe will be removed and the user's own garments will remain.
- After confirmation, delete only demo-created garments.
- User-created garments must never be deleted by this action.
- Demo identity must remain reliable even if the user edits/renames a demo garment.
- When no demo garments remain, the delete-demo action should no longer be shown.
- Preserve existing load-demo behavior and normal wardrobe editing unless a minimal adjustment is required for the above.

### Implementation requirements

- Follow existing Flutter/NestJS/domain patterns; do not invent a parallel wardrobe architecture.
- Reuse existing data fields/metadata if they provide reliable demo identity.
- Keep display naming separate from technical demo identification.
- Add/update Norwegian Bokmål and English localization through the existing ARB/gen-l10n system. Do not edit generated localization files manually.
- Add focused tests for:
  - demo identification
  - user garments surviving demo deletion
  - renamed/edited demo garments still being removable
  - delete action visibility when demo items exist / disappear when none remain
  - confirmation flow where practical in the existing test structure
- Keep the UI consistent with the current wardrobe screen.

### Explicitly out of scope

- No DB/schema migration in this task.
- No unrelated wardrobe redesign.
- No recommendation-engine changes.
- No routing/weather/elevation changes.
- No dependency/package upgrades.
- No ads.
- No Cycling/Alpine/XC implementation.
- Do not modify `dev` or `main`.

### Verification

Run the relevant focused tests plus the normal checks required for changed packages.

For Flutter changes, at minimum run:
- `flutter analyze`
- `flutter test`

If API code is changed, also run relevant API tests/build required by guardrails.

All required checks must pass before merge.

### Completion

Follow `docs/agent-control/guardrails.md`.

Use a `feature/*` or `fix/*` branch from latest `dev_test`.
PR and merge successful work only to `dev_test`.
Update `docs/agent-reports/latest.md` with:
- how demo items are technically identified
- branch/commit/PR
- files changed
- localization changes
- tests/analyze/build results
- deletion safety behavior
- manual validation recommended
- remaining issues

Then STOP. Do not begin another task.
