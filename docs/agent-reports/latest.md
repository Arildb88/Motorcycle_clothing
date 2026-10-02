# XC-TRAIL-SYNC-001

## Task

`XC-TRAIL-SYNC-001`, generation 30, authorized by the automatic final control update that completed `FNUGG-ATTRIBUTION-001`. The parent tip held that token at generation 29 with `FNUGG-ATTRIBUTION-001` active. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/xc-trail-sync-001`
- Implementation commit: `1caefa3acc02232b57eecbac67d7e2bafeec1cda`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/60 into `dev_test` only. Not merged to `dev` or `main`.

## Result

Nearby cross-country trails still come from the official Geonorge Turrutebasen WFS (`app:Skiløype` on `https://wfs.geonorge.no/skwms1/wfs.turogfriluftsruter`). Flutter still calls the RideWear API. A nearby search reads a process-local collection for a 0.01-degree map cell and filters it to the existing 8 km straight-line radius.

The first search in a cell performs one bounded query, because there is no older collection to serve. That query is not a national download. Later searches in the same cell return the stored collection. Each cell is checked against Geonorge at most once per 24 hours. When a check is due, the stored collection is returned immediately and one refresh runs beside the request. A failed refresh keeps that collection, logs the fetch time and age, and does not empty the list. Concurrent callers share one cold fetch or one refresh. A cold outage still fails closed instead of caching an empty list.

Manual start and finish planning was not changed. Norwegian names still pass through the existing XML decoder. Kartverket remains the attribution. Preparation codes are still not returned as grooming status.

## Checks

Metadata and the live query were read on 2026-10-02. They are not part of the automated suite.

Geonorge metadata `d1422d17-6d95-4ef1-96ab-8af31744dd63`:

- `DateUpdated`: 2026-09-29. Maintenance frequency: weekly.
- Access: open data. Other constraints: "No conditions apply to access and use".
- Distributions: Geonorge download order and ATOM feeds for FGDB, GML, GPX, PostGIS, and SOSI, including national files. The WFS used by `XC-TRAIL-DISCOVERY-001` still answers `GetFeature`.

Live bounded query, Python urllib, one GET, 30 s timeout, User-Agent `RideWear/1.0 (cross-country trail discovery)`, WFS 2.0.0 `GetFeature`, `typeNames=app:Skiløype`, `count=80`, EPSG:4326 bbox around 59.98, 10.70:

- First call: HTTP 200, 1.453 s, 179035 bytes, 67 features.
- Repeat call: HTTP 200, 1.172 s, 179035 bytes, 67 features.

Cached-path timing, local only: `ts-node` ran `mapGeonorgeSkiTrails` on that saved collection at 59.98, 10.70. Five warmup calls, then 20 timed calls: 23.01 ms total, 1.15 ms per call, 20 hits after the existing result cap. A cache hit does this filtering and does not call Geonorge.

API, in `apps/api`:

- `npx jest --no-coverage` — 267 tests passed
- `npx nest build` — passed

Prisma was not validated. Persistence was not touched. Flutter analyze and Flutter tests were not run. The client was not changed. Android, iOS, and a live cache-hit request were not run.

## Architecture / config

Flutter -> NestJS -> provider stays the same. Secrets stay server-side. No new provider, dependency, schema migration, or paid service. The cache is process-local, the same shape as the elevation cache, and holds at most 32 cells. A national file import and a spatial database were not added. The bounded WFS query is already about one second, and a stored cell filters in about a millisecond. `dev` and `main` were not modified.

## Final control state

Promotion is automatic. The first queued unconsumed item is authorized. This run does not execute it.

- `XC-TRAIL-SYNC-001` completed and appended once to `consumed.md`
- `UX-POLISH-001` is active
- `active_id: UX-POLISH-001`
- `promotion: automatic` unchanged
- `handoff_generation: 31`
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `UX-POLISH-001`, Generation 31, Handoff-From `XC-TRAIL-SYNC-001`, Authorization `authorized`

## Remaining

Device checks and a live cache-hit request were not run. The first search in an empty process still waits for one bounded WFS query. `UX-POLISH-001` is authorized for a later run. This run stops after merge.
