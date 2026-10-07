# COMMUTE-ROUNDTRIP-001

## Task

`COMMUTE-ROUNDTRIP-001`, generation 45, authorized from idle by `8f74609039cb5a3161804677e37fe11b7a52a86b`. This run did not write a claim commit. The validated `next-task.md` token stayed the ownership record until this branch's final control state.

- Branch: `feature/commute-roundtrip-001`
- Implementation commit: `d4166b412cc7cb3ce8fbd25bae3747d38b88bcd0`
- Migration: `apps/api/prisma/migrations/20261007200000_commute_roundtrip`
- PR: against `dev_test` only. Not merged to `dev` or `main`.

## Result

Motorcycle route creation can save a named private commute with From and To endpoints, existing waypoints and preferences, and editable Europe/Oslo outbound and return clock templates. The templates are not forecasts, and the endpoints are not labeled as the rider's actual home or work. `isDefaultCommute` stays the default-route flag.

Planning a commute chooses a civil date and two clock times. The return defaults to that day's saved return time and can be the next civil day. A return that departs before the outbound arrival is rejected. Europe/Oslo spring-forward gaps are rejected. An autumn overlap uses the earlier instant.

Each leg calls routing and weather on its own departure and direction. The return reverses waypoints and does not reuse the outbound duration. The response is one block with Til jobb / Outbound and Hjem / Return. Wear follows the outbound leg. Rain gear and other return-only garments are packed before leaving. A different liner or vent setup for a garment already worn is a return adjustment, not a second copy of that garment. Morning weather is not averaged with the afternoon and is not copied when the return forecast is missing or out of range.

Each leg is its own activity plan in one commute group. Feedback sent with that plan id updates the motorcycle offset once. A second submission for the same plan is rejected. Route edits do not rewrite the stored plan snapshot. Stored route analysis drops dense provider geometry. Ordinary one-way planning is unchanged.

## Checks

- `npm test`: 369 passed
- `npm run build`: passed
- `npx prisma generate` and `npx prisma validate`: passed
- `npx prisma migrate deploy`: 4 migrations applied on local Postgres 16, including `20261007200000_commute_roundtrip`
- `npx prisma migrate diff`: no difference
- `flutter analyze`: no issues found
- `flutter test test/commute_roundtrip_test.dart`: 7 passed
- Android and iOS were not run

## Limitations

Commute planning is motorcycle only. Saved times are Europe/Oslo templates even if the phone is set to another zone. The autumn overlap uses the earlier of the two possible instants. A missing return forecast does not invent clothing for that leg. No notification, background refresh, or daily schedule was added.

## Final control state

`COMMUTE-ROUNDTRIP-001` is completed and appended once to `consumed.md`. `active_id` is `REAL-DATA-ONLY-001`. `handoff_state` is `authorized`. `handoff_generation` is 46. `promotion` stays `automatic`. `next-task.md` authorizes `REAL-DATA-ONLY-001` with `Handoff-From: COMMUTE-ROUNDTRIP-001`. This run does not execute that ID.
