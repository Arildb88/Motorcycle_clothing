# Authorized RideWear Task

## Type: IMPLEMENTATION

## Task: Demo wardrobe identity migration and safe removal

Continue the previously blocked demo-wardrobe task. The investigation established that reliable demo identity requires a minimal schema change. This task explicitly authorizes that migration.

Read first:
- `docs/agent-control/guardrails.md`
- `docs/agent-control/next-task.md`
- `docs/agent-reports/latest.md`

### Authorized schema change

Add a non-client-writable field to Prisma `Garment`:

```prisma
/// Inserted by the demo wardrobe seed. Survives rename and edit.
/// Clients cannot set or clear this value.
isDemo Boolean @default(false)
```

Create the normal Prisma migration for the repository's current database setup. Existing rows must safely default to `false`. Do not attempt to guess/backfill historical demo rows from names or other editable fields.

### API behavior

- `seedDemo` must set `isDemo = true` for garments it creates.
- Normal user-created garments remain `isDemo = false`.
- Create/update DTOs must not allow clients to set or clear `isDemo`.
- Editing/renaming a demo garment must preserve `isDemo = true`.
- Expose read-only `isDemo` in the garment response needed by the Flutter UI.
- Add a safe delete-demo operation that deletes only rows matching the authenticated user AND `isDemo = true`.
- Never use the existing destructive force behavior to implement delete-demo if it can delete user garments.
- Preserve existing normal single-garment deletion.

### Flutter behavior

- Give seeded demo garments clear localized names, e.g. `Demo – Touringjakke` / appropriate English equivalent.
- Show a small visible `DEMO` badge on demo garment cards.
- When at least one demo garment exists, show a bottom action:
  - nb: `Slett demo-garderobe`
  - en: `Delete demo wardrobe`
- Show a confirmation dialog explaining that only demo-added garments will be removed and personal garments remain.
- On confirmation call the safe API operation.
- Refresh state after deletion.
- Hide the delete-demo action when no demo garments remain.
- Demo identity must still work after the user edits/renames a demo garment.

### Localization

Use the existing ARB/gen-l10n system for all new user-visible Norwegian Bokmål and English strings. Do not manually edit generated localization files.

### Tests

Add focused API and Flutter tests covering at minimum:
- seed creates `isDemo = true`
- normal create remains false
- update/rename preserves demo identity
- client cannot set/clear demo identity
- delete-demo removes only authenticated user's demo rows
- personal garments survive demo deletion
- UI badge/action visibility
- delete action disappears when no demo rows remain
- confirmation flow where practical

### Explicitly out of scope

- No unrelated schema changes.
- No attempt to classify/backfill old rows as demo.
- No Supabase/PostgreSQL migration yet; keep this task compatible with the repository's current database setup.
- No auth redesign.
- No unrelated wardrobe redesign.
- No recommendation/routing/weather/elevation changes.
- No dependency/package upgrades.
- No ads.
- No Cycling/Alpine/XC implementation.
- Do not modify `dev` or `main`.

### Verification

Run relevant focused tests plus:
- API: `npm test`, `npm run build`, and smoke test if applicable.
- Flutter: `flutter analyze`, `flutter test`.

All required checks must pass before merge.

### Completion

Follow `docs/agent-control/guardrails.md`.
Use a `feature/*` or `fix/*` branch from latest `dev_test`.
PR and merge successful work only to `dev_test`.
Update `docs/agent-reports/latest.md` with:
- migration/schema details
- how demo identity is protected from client writes
- branch/commit/PR
- files changed
- localization changes
- tests/analyze/build/smoke results
- deletion safety behavior
- manual validation recommended
- remaining issues

Then STOP. Do not begin another task.
