# Authorized RideWear Task
## Type: BUG_FIX
## ID: PLACE-UNICODE-RESORT-001
## Generation: 50
## Handoff-From: WARDROBE-REMOVE-SHARING-001
## Authorization: authorized
## Promoted: 2026-10-07T21:51:26Z
## Task: Fix Norwegian place input and Kongsberg resort discovery

User reports that typing Åmli fails and æ/ø/å cannot be entered in place fields. Alpine/snowboard selection can show temperatures but Kongsberg is not found. Causes are unverified.
Trace text entry (including keyboard composition/input formatters), mobile URL encoding, API validation/normalization, provider queries, resort naming/aliases and displayed results.
Allow æ ø å Æ Ø Å in every relevant place/resort/route planner input without stripping characters or resetting typing. Encode Unicode once, preserve selected label/coordinates and latest-query handling.
Investigate Kongsberg resort discovery specifically against the existing resort provider. If its documented resort name differs from town name, support a justified provider-name alias/matching path within the existing integration; do not invent a resort record or misrepresent generic town search as resort data.
Separate ability to type arbitrary place names from available provider results: Åmli need not be an alpine resort. No matches must remain a legitimate localized result, with retry for actual outage.
Test typing and roundtrip encoding of Åmli, Øyer, Sæby and uppercase letters, searching Kongsberg with a real documented provider fixture when available, empty results, stale requests and current resort weather/elevation flow.
Attempt live lookup only with existing authorized configuration/network; explicitly state if only fixtures were verified. No new provider or schema changes. Coordinate with completed PLACE-SEARCH-AVAILABILITY-001 rather than duplicating its fix.

Execution boundaries and verification:
- Explicitly approved by Arild in chat on 2026-10-07. Read current code and architecture/security/privacy constraints. Existing Flutter -> NestJS -> Prisma boundaries remain.
- No new dependencies, external providers, paid services, credentials or deployment. Keep dev/main untouched.
- Branch from latest dev_test; PR to dev_test; merge only after required checks pass. Follow queue success/blocker protocol, update docs/agent-reports/latest.md, and stop after this ID.
- Run focused regression tests for changed behavior, API tests/build when API changes, Flutter analyze and relevant Flutter tests when mobile changes. Report checks honestly.
