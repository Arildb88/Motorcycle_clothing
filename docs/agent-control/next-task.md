# Authorized RideWear Task
## Type: RELEASE_VALIDATION
## ID: RELEASE-READINESS-001
## Generation: 42
## Handoff-From: SOCIAL-AUTH-RESEARCH-001
## Authorization: authorized
## Promoted: 2026-10-06T09:28:51Z
## Task: Prepare and validate RideWear for a human-controlled beta/release step

Perform a final release-readiness pass after feature, dependency, stabilization, coverage, UX and performance work.

Validate:
- Flutter analyze and full practical Flutter test suite.
- API tests, production build/type checks and Prisma generate/validate as applicable.
- Android release build where the available environment supports it.
- Environment/config expectations for API, PostgreSQL/Supabase, routing, weather/elevation and resort/trail providers.
- Secrets remain server-side and no credentials are committed.
- Production-facing error handling does not expose secrets/internal stack data.
- Database migration state is documented and consistent with the repository.
- Existing ads/config behavior is appropriate for the current MVP configuration.
- Produce/update a concise release checklist covering remaining human steps, Android signing/distribution, hosted API/database configuration and later iOS/TestFlight work.

Boundaries:
- Do not deploy to production, publish an app, create paid infrastructure, rotate credentials or modify external services/accounts.
- Do not claim iOS build/test validation from Windows.
- Fix small release-blocking repository defects that fit existing architecture; document anything requiring human credentials, provider accounts, macOS/iOS tooling or a product decision.
- No new product features.

Keep dev and main untouched. Follow queue rules.
