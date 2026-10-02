# Demo wardrobe identity migration

## Task

Give seeded demo garments a durable identity (`Garment.isDemo`) so they can be badged and removed without deleting personal garments, including after the user renames or edits them.

## Migration / schema

Prisma `Garment` on the current SQLite setup:

```prisma
/// Inserted by the demo wardrobe seed. Survives rename and edit.
/// Clients cannot set or clear this value.
isDemo Boolean @default(false)
```

Migration: `apps/api/prisma/migrations/20261002100000_garment_is_demo/migration.sql`

```sql
ALTER TABLE "Garment" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
```

Existing rows default to `false`. Historical demo rows are not guessed or backfilled from names or other editable fields.

## How demo identity is protected from client writes

- Create and update DTOs have no `isDemo` field.
- The global `ValidationPipe` uses `whitelist` and `forbidNonWhitelisted`, so a body that includes `isDemo` is rejected.
- `WardrobeService.create` and `update` never write `isDemo`. Create relies on the database default (`false`). Update leaves the stored flag unchanged.
- `seedDemo` is the only writer that sets `isDemo = true`.
- The garment response includes read-only `isDemo` for the Flutter UI.

## Deletion safety

`DELETE /api/wardrobe/actions/demo` deletes with `where: { userId, isDemo: true }`.

- Only the authenticated user's demo rows are removed.
- Personal garments (`isDemo = false`) stay.
- Another user's demo rows stay.
- This path does not use seed `force=true`, which still deletes the whole wardrobe when explicitly requested by the existing seed endpoint.
- `DELETE /api/wardrobe/:id` still deletes one owned garment.

## Localization

Seed names are chosen from `?lang=nb` or `?lang=en` (anything else, including omission, uses English). Examples: `Demo – Touringjakke` / `Demo – Touring jacket`. The Flutter seed action sends the current UI language.

New ARB strings (generated with `flutter gen-l10n`, not hand-edited):

- Badge: `DEMO` (en and nb)
- Action: `Delete demo wardrobe` / `Slett demo-garderobe`
- Confirmation explains that only demo-added garments are removed and personal garments stay

The badge and delete action use `isDemo`, so they still apply after a rename.

## Commit / PR

- Branch: `feature/demo-wardrobe-identity` from `dev_test` (`f509a6671765c08f2180bd0c9e43632d12a98295`)
- Implementation commit: `5da3415b005f840c4a03b08bdbfdada9814f95d1` — feat: identify demo garments and delete them safely
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/26
- Merge target: `dev_test` only. `dev` and `main` are unchanged.

## Files changed

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20261002100000_garment_is_demo/migration.sql`
- `apps/api/src/domain/demo-wardrobe.ts`
- `apps/api/src/domain/enums.spec.ts`
- `apps/api/src/wardrobe/wardrobe.controller.ts`
- `apps/api/src/wardrobe/wardrobe.service.ts`
- `apps/api/src/wardrobe/wardrobe.service.spec.ts`
- `apps/api/src/wardrobe/wardrobe.dto.spec.ts`
- `apps/mobile/lib/domain/garment.dart`
- `apps/mobile/lib/features/wardrobe/wardrobe_screen.dart`
- `apps/mobile/lib/l10n/app_en.arb`
- `apps/mobile/lib/l10n/app_nb.arb`
- `apps/mobile/lib/l10n/app_localizations.dart`
- `apps/mobile/lib/l10n/app_localizations_en.dart`
- `apps/mobile/lib/l10n/app_localizations_nb.dart`
- `apps/mobile/test/nb_localization_test.dart`
- `apps/mobile/test/wardrobe_demo_test.dart`
- `scripts/smoke-api.sh`
- `docs/agent-reports/latest.md`

## Tests / build / smoke

- `npm test`: 21 suites, 136 tests passed.
- `npm run build`: passed.
- `flutter analyze`: no issues.
- `flutter test`: 60 tests passed, including badge visibility, confirmation cancel/confirm, action hidden when no demo rows remain, and the Norwegian action label.
- `scripts/smoke-api.sh` (`SMOKE_SKIP_UNIT=1`, `SMOKE_SKIP_BUILD=1`): passed. Applied `20261002100000_garment_is_demo`. Seeded wardrobe contains `Demo – Insulated winter gloves` and `isDemo: true`. A personal garment created afterward survives `DELETE /api/wardrobe/actions/demo`.

## Architecture / config

No new provider, dependency, or auth change. Identity is a boolean on the existing `Garment` model. Demo display names are stored strings chosen at seed time; they are not a second source of identity.

## Fallback

- Unknown or missing `lang` seeds English demo names.
- Flutter treats a missing `isDemo` field as `false`.
- Rows that existed before the migration stay `isDemo = false`.

## Manual testing recommended

- With the app in Norwegian, load the demo wardrobe on an empty wardrobe and confirm names such as `Demo – Touringjakke`, the `DEMO` badge, and `Slett demo-garderobe`.
- Switch to English, seed again on an empty wardrobe, and confirm `Demo – Touring jacket` and `Delete demo wardrobe`.
- Rename a demo garment, confirm the badge remains, then confirm deletion still removes that renamed demo garment.
- Add a personal garment first if the wardrobe is not empty, or add one after seeding, and confirm it remains after demo deletion and the bottom action disappears.

## Remaining issues

- Garments seeded before this migration cannot be classified as demo, because names are editable and this task does not backfill.
- Demo notes, brands, and models stay English. Only the garment name is localized at seed time.
- The load-demo action is still shown only on an empty wardrobe. `force=true` on seed still replaces the entire wardrobe and is not used by the app.
- No Supabase/PostgreSQL migration in this task. The SQL is the repository's current SQLite migration and should be revisited when the database moves.
