# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: XC-TRAIL-DISCOVERY-001
## Generation: 20
## Handoff-From: ALPINE-RESORTS-001
## Authorization: authorized
## Promoted: 2026-10-02T18:24:02Z
## Task: Add nearby cross-country ski trail discovery with manual route fallback

Improve cross-country skiing planning so users can either discover suitable ski trails near a location/current position or continue planning a manual start/end trip.

Provider and data constraints:
- Prefer authoritative GeoNorge/Kartverket sources and the existing RideWear Flutter -> NestJS -> provider architecture.
- Use only a source/API whose access, data fields and reuse terms are verified during implementation.
- Do not scrape UT.no, Skisporet.no or other websites.
- If no verified production-usable trail source is available, implement the provider-neutral contract and UX/fallback that can be supported safely, document the missing provider decision, and do not fabricate live trail data.
- Keep external-provider access server-side.
- No paid provider, secret, schema migration or new dependency unless already authorized by existing architecture; BLOCK if one is truly required.

UX:
- Offer "Finn løype i nærheten" and "Planlegg egen tur".
- Nearby discovery must use real coordinates and clearly identify returned trail candidates.
- Manual planning keeps the existing cross-country start/end flow.
- Preserve Norwegian Unicode place/trail names.
- A selected trail must integrate with existing RideWear weather/elevation/recommendation concepts where supported; do not invent geometry or grooming status.

Tests:
- Add deterministic API/provider-contract and Flutter tests for available, empty and error/fallback states.
- Run relevant API tests, Flutter tests and Flutter analyze.
- Record live-provider/device checks separately; do not claim them if not run.

Do not implement unrelated activities or broad refactors. Keep dev and main untouched. Follow queue rules.
