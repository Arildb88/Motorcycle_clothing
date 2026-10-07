# Authorized RideWear Task
## Type: FEATURE_IMPLEMENTATION
## ID: COMMUTE-ROUNDTRIP-001
## Generation: 45
## Handoff-From: none
## Authorization: authorized
## Task: Saved commute with outbound and return weather in one recommendation block

Arild authorized this task in chat on 2026-10-07: add a commute route with home/work endpoints and a combined outbound/return recommendation, including dry morning versus rainy afternoon. Implement within existing Flutter -> NestJS -> Prisma/PostgreSQL architecture. Minimal additive migrations needed for commute settings or paired plan linkage are authorized. No new dependencies, providers, paid services or deployment.

Product requirements:
- Offer "Pendlerrute / Commute" in route creation for motorcycle first. Save a user-named private commute with From and To endpoints, optional existing waypoints/preferences, and editable default outbound and return departure times. Do not force users to label endpoints as their actual home/work.
- When planning a commute choose a date and two departure date/times. Default return to the chosen day's saved return time, but allow an explicit next-day return for overnight shifts. Validate return departure is after outbound arrival; handle Europe/Oslo daylight-saving transitions using existing timezone conventions. Saved times are templates, not stored forecasts.
- Calculate each leg separately using existing routing, ETA/weather sampling, activity exposure and wardrobe logic. Return reverses ordered endpoints/waypoints, but must request its own direction-specific route analysis: one-way roads and direction-dependent travel times mean outbound geometry/duration cannot simply be reused.
- Show ONE combined commute block with clearly labeled "Til jobb / Outbound" and "Hjem / Return" sections, each with its own departure, estimated arrival, forecast temperature/rain/wind, clothing/configuration and confidence/limitations.
- Explain differences, e.g. "Opphold på morgenen, regn meldt på hjemturen – ta med regntøy", only when supported by actual forecast data. Forecasts are forecasts, not guarantees. Missing/out-of-range return forecast must be explicitly unavailable; do not substitute morning conditions.
- Combined preparation separates wear for outbound from pack before leaving for items/configuration needed on return. Deduplicate physical garments and respect existing protective gear, liners/vents and wear/pack engine rules. Do not average morning/afternoon weather or force maximum warmth on the morning leg; preserve appropriate changes for the return.
- Use latest forecasts when analyzing again. Route edit/delete must not rewrite past plan snapshots. Keep the two legs associated so UI and existing feedback identify the actual leg/activity; do not apply one feedback event twice.
- Preserve existing one-way, loop, multi-stop routes and default-route behavior. Resolve existing isDefaultCommute/defaultRouteId overlap only if necessary for this task; no unrelated refactor.
- Norwegian Bokmål and English localization. Reuse existing route/planner/recommendation UI and APIs where practical.
- Scope all commute/plan resources to authenticated owner. No background location tracking, notifications, automatic daily scheduling, continuous forecast refresh, or extra home/work logging. No permanent dense provider geometry or raw forecast storage.

Acceptance and verification:
- Deterministic API tests: dry outbound/rainy return puts rain equipment in pack before leaving; warm outbound/cold return recommends appropriate extra layer/configuration; each leg uses its own datetime/ETA/direction; missing return forecast is explicit; invalid sequence, next-day return, timezone/DST handling; owner isolation and snapshot stability; ordinary routes remain unchanged.
- Flutter tests: commute creation and saved defaults, two date/time selections, one combined block with two clearly labeled sections, deduped preparation, missing data, localized copy and existing one-way flow.
- Run focused API tests and production build, Flutter analyze and relevant tests. If schema changes, Prisma generate/validate and additive migration verification against disposable local Postgres. Report unsupported checks honestly.
- Read current source and architecture/security/privacy docs; preserve current implemented engines rather than relying on stale context summaries.
- Feature branch from latest dev_test, PR to dev_test only, merge after required checks. Keep dev/main untouched. Follow existing queue completion/blocker protocol; update docs/agent-reports/latest.md and stop after this task.
