# Authorized RideWear Task
## Type: PERFORMANCE_AND_DATA
## ID: XC-TRAIL-SYNC-001
## Generation: 30
## Handoff-From: FNUGG-ATTRIBUTION-001
## Authorization: authorized
## Promoted: 2026-10-02T22:31:27Z
## Task: Make nearby cross-country trail retrieval fast while keeping Geonorge Turrutebasen data fresh

Use the authoritative Geonorge Turrutebasen dataset:
https://kartkatalog.geonorge.no/metadata/turrutebasen/d1422d17-6d95-4ef1-96ab-8af31744dd63

Primary UX requirement:
- A user requesting nearby ski trails must get the nearby result quickly; do not make the request wait for a national dataset refresh/download.
- Flutter continues to call the RideWear NestJS API. Do not fetch Geonorge directly from Flutter.

Before changing architecture:
- Inspect the completed XC-TRAIL-DISCOVERY-001 implementation and verify which Geonorge endpoint/service it currently uses.
- Verify current official Turrutebasen access methods and metadata before selecting WFS/download/ATOM or another documented official interface.
- Reuse the existing implementation where it already satisfies the requirements.

Fast read path:
- Serve nearby-trail queries from a server-side cache/local indexed representation when practical.
- If the existing official API supports sufficiently fast bounded spatial queries, it may be used behind a short-lived server cache instead of importing all Norway.
- Prefer bounded geographic queries (position/radius or bbox) and only the Skiløype features/fields needed by RideWear.
- Add suitable spatial/indexing strategy only when supported by the current architecture and measured need.
- Do not block a user request on a full refresh.

Refresh:
- Check for fresh source data at most once per 24 hours by default; a refresh check must not make the interactive nearby-trail request wait for a full national update.
- Refresh asynchronously/server-side where the current deployment model supports it.
- Keep serving the last known-good data while refresh is running.
- If Geonorge is unavailable or refresh fails, retain and serve last known-good data and report/log freshness rather than emptying the trail map.
- Avoid duplicate concurrent refreshes.
- Do not claim real-time grooming/preparation status unless the verified source actually supplies current operational status.

Performance and correctness:
- Measure the nearby-trail path before/after and document timings/test method; optimize based on evidence.
- Preserve XC manual-route fallback.
- Preserve Norwegian characters/localization.
- Preserve Kartverket/Geonorge attribution and license requirements.
- No scraping, fabricated trails, paid providers, unrelated features or broad architecture changes.
- Do not modify motorcycle/cycling/alpine wardrobe behavior.

Validation:
- Deterministic tests for cache hit, stale cache, refresh failure/stale-data fallback, duplicate-refresh suppression and geographic filtering.
- API tests/build and Prisma validation if persistence is touched.
- Flutter tests/analyze for any client changes.
- Clearly distinguish tests from live-provider checks.

Keep dev and main untouched. Follow queue rules.
