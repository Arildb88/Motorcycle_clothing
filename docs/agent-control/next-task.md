# Authorized RideWear Task
## Type: PRIVACY_REVIEW_AND_FIX
## ID: PRIVACY-DATA-001
## Generation: 40
## Handoff-From: MC-BASIC-LAYERS-001
## Authorization: authorized
## Promoted: 2026-10-06T09:07:00Z
## Task: Review RideWear personal-data lifecycle and implement safe privacy-readiness improvements

Inventory what personal/user-linked data RideWear currently stores or transmits (account/profile, wardrobe, routes/activity plans, location-related data, auth/reset data, logs/telemetry if any).

Requirements:
- document data category, purpose, storage location, retention/deletion behavior and external provider exposure
- verify production logs/errors do not unnecessarily expose credentials, tokens, precise location or other personal data
- inspect account deletion/data deletion behavior; identify gaps without pretending legal compliance
- minimize provider payloads and persisted location data where not required by existing product behavior
- ensure demo data remains distinguishable from personal user data
- add safe tests/docs for changes
- produce a concise privacy/data-flow readiness section in latest report

Constraints:
- This is engineering/privacy readiness, not a claim of GDPR/legal compliance.
- No analytics/advertising SDK, new provider, schema migration or destructive data migration unless already explicitly authorized.
- Preserve existing user data; if deletion semantics require a schema/architecture decision, document/block rather than guess.
- Run relevant tests/checks and follow queue/control rules.
