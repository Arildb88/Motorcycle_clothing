# DEVELOPMENT NOTES — M1 / M2

Implementation notes that do not belong in ARCHITECTURE.md.

## Completed

- **M1 Domain foundations** — Prisma migration `20260911084843_m1_domain_foundations`
- **M2 Wardrobe** — Nest `wardrobe` module + Flutter Wardrobe tab

## Domain decisions (M1/M2)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rider profile name | `UserProfile` | Matches ARCHITECTURE.md (not a separate RiderProfile table) |
| Property scales | Ordinal tiers 1–5 | Avoid fake clo precision; category supplies defaults |
| Layer vs category | Both stored | `category` is specific; `layer` + `primaryBodyZone` derived from category for engine slots |
| Future sports | `activityTags` + `ActivityType` enum includes hiking/ski/etc. | Motorcycle-only UX; tags ready for later |
| Demo seed | Explicit `POST /wardrobe/actions/seed-demo` | Never auto-seed on register |

## Spike leftovers (intentional debt until M3/M5)

- `recommend/clothing.engine.ts` boolean thresholds still power `/api/recommend`
- Response now includes `personalization.voice = baseline` and never claims personal copy
- Feedback writes `ActivityLog` / `ActivityFeedback` and lightly updates `PersonalOffset`, but similarity bucketing is **not** implemented yet
- Auth `/api/auth/oauth` endpoints remain as hooks; Flutter social buttons removed
- AdMob code paths remain behind `ADS_ENABLED` (default **false**)

## Local DB note

M1 migration drops `ComfortSettings`, `Profile`, `RideFeedback`. Reset local SQLite if migrate fails:

```bash
cd apps/api
rm -f prisma/dev.db prisma/dev.db-journal
npx prisma migrate deploy
```

## Flutter analyze

As of M2 completion: clean after mounted-guard fix. Tests: brand smoke only (no wardrobe widget tests yet).
