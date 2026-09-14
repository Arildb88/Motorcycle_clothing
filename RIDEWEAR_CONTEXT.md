# RideWear Context

This document is a compact working context for developers and coding agents. It does not replace `ARCHITECTURE.md`, `PROJECT_PLAN.md`, `SECURITY.md`, or `PRIVACY_ARCHITECTURE.md`. Those documents remain authoritative for their respective areas.

## Product

RideWear is an outdoor clothing recommendation platform. Its core differentiator is combining weather, route/activity exposure, the user's actual wardrobe, and personal comfort feedback so recommendations can improve over time.

The first complete recommendation engine is **Motorcycle**. The architecture must remain extensible to Hiking, Cycling, Alpine skiing, Snowboarding, Cross-country skiing, and potentially Running, without pretending those activity engines exist before they are implemented.

## Current stack

- Flutter mobile application.
- NestJS API as the business/security boundary.
- Prisma ORM.
- SQLite for local/development today.
- Planned production path: portable PostgreSQL, with Supabase PostgreSQL as the preferred managed database option when appropriate.
- Do not rewrite Flutter to access Supabase directly. Keep the NestJS API boundary.

## Git workflow

- `main` is the stable owner-controlled baseline.
- `dev` is the integration branch.
- Development work starts from current `dev` on a dedicated feature/fix/refactor/docs branch.
- Pull requests target `dev`, not `main`.
- The repository owner manually controls promotion from `dev` to `main`.
- See `.cursor/rules/ridewear-git-workflow.mdc` for mandatory agent rules.

## Implemented foundation

The platform baseline through **M3** includes:

- Core domain and persistence foundations.
- Shared wardrobe and garment CRUD.
- Authentication/account foundation with multiple identities and explicit safe account linking.
- Facebook and Microsoft login foundation; Strava is a connected service rather than the primary RideWear identity.
- Activity launch/current/default/interested activity semantics.
- Norwegian Bokmål (`nb`) and English localization foundation.
- Saved Motorcycle routes with ordered waypoints, ownership, route-to-plan snapshots, and point-to-point/multi-stop/loop support.
- Motorcycle garment configuration foundation separating physical garments from removable components and ride-time configuration such as liners and vents.
- Security and privacy architecture documentation.
- CI smoke diagnostics.
- **M3 Motorcycle Recommendation Engine v1** — duration-weighted exposure/demand pipeline with optional route speed profiles, wardrobe matching, garment configuration instructions, structured wear vs pack, language-neutral reason codes, and LOW/MEDIUM/HIGH confidence.

## Recommendation principles

`/recommend` for Motorcycle uses the M3 pipeline (`motorcycle_v1`), not the old threshold spike.

Pipeline:

1. Route/weather segmentation.
2. Motorcycle-specific exposure calculation (`motorcycleExposureC`).
3. Duration-weighted clothing demand so short extreme segments do not dominate a long ride.
4. Body-zone/layer warmth/wind/water demand (ordinal 1–5).
5. Match demand to the user's wardrobe and valid garment configurations.
6. Clearly distinguish **wear now** from **pack/take with you**.
7. Return structured reason codes/data and confidence so Flutter can localize explanations.

Do not introduce ML merely to extend M3.

## Personalization guardrails

New users start from an explainable baseline/default model. Personal evidence gains influence gradually; a shrinkage form such as `n / (n + k)` is appropriate.

RideWear must earn the right to say "you". Until enough relevant evidence exists, recommendation copy remains generic and confidence reflects uncertainty. M3 may apply shrinkage bias but does **not** emit personal preference claims (reserved for M5).

Future feedback should distinguish too cold, slightly cold, comfortable, slightly warm, and too warm, with optional body zones and sweat information.

Learning must use what the rider **actually wore**, including the actual garment configuration, not merely what RideWear recommended.

Similarity should consider effective temperature, duration, rain/wet exposure, wind protection, speed/exposure, activity, and garment/layer configuration. Activity-specific evidence is stronger than unrelated evidence from another sport.

## Wardrobe and garment configuration

The wardrobe is shared across activities. A physical garment is not duplicated just because it can be configured differently.

For Motorcycle gear, removable thermal/waterproof liners belong to the garment. Ride-time state such as installed components and vent state forms a garment configuration. M3 recommendations may say to install/remove a liner or open/close vents.

Canonical enums and domain values remain language-neutral. User-created garment/route names are never translated.

## Routes and activity history

A `Route` is a reusable private route definition (ordered waypoints, optional routing preferences such as `avoidMotorways`). An `ActivityPlan` is a date/time-specific planned activity (`planningMode` departure or arrival). An `ActivityLog` represents an actual activity.

Routes do not store recommendation or weather results. Plans/logs retain sufficient snapshots/derived evidence (including optional provider-neutral route analysis summaries) so historical activity does not become misleading if a route is edited or deleted.

RideWear analyzes routes for weather, exposure, and clothing. It is not a turn-by-turn navigation product — external apps handle navigation after handoff.

Exact route coordinates can reveal home/work patterns and are sensitive user data. Scope all user-owned resources to the authenticated user and avoid unnecessary location logging/storage. “Use current location” is plan-time only, not continuous tracking.

## Authentication and security

Authentication and authorization are separate concerns. Every user-owned resource must be authorization-scoped to the authenticated user.

Do not auto-merge accounts solely because OAuth providers return matching email addresses. Account linking must be explicit and safe.

Provider/Strava secrets and tokens stay server-side and must not be returned to Flutter or logged. Use appropriate OAuth protections such as PKCE, state, and nonce. No privileged Supabase/service credentials belong in the Flutter app.

Follow `SECURITY.md` and `PRIVACY_ARCHITECTURE.md` before changing authentication, location handling, connected services, storage, or privacy behavior.

## Data minimization

Do not store second-by-second GPS, dense weather samples, massive raw weather payloads, or duplicate route geometry without a demonstrated need.

Prefer derived evidence needed for recommendations and learning: temperature/exposure ranges, rain/wind conditions, duration, representative speed/exposure, actual garments/configurations, feedback, and appropriate route references/snapshots.

## Localization

RideWear supports Norwegian Bokmål and English. Use Flutter localization resources rather than scattered language conditionals.

Recommendation engines emit structured reason codes/data rather than hard-coded final English sentences. Language and measurement units are separate concerns. Explicit user language preference overrides device-language fallback.

## Advertising

The intended free-tier monetization model is modest banner/native-banner advertising, maximum one visible ad per eligible screen. Ads must never overlay content or affect recommendation ranking.

Safety/trust-critical surfaces are ad-free, including active route/navigation, weather warnings, safety alerts, login/OAuth/security/privacy flows, and the strongly final recommendation card. Do not add interstitials, app-open ads, forced video, or paywall essential weather/safety information.

## Future activities

Hiking and Cycling may expose shared product foundations before their recommendation engines exist, but must not show fake recommendations.

Alpine skiing and Snowboarding may eventually share an alpine exposure engine while remaining distinct activity types. Alpine weather must account for elevation/top-vs-base conditions and active descent versus stationary lift/queue exposure. Motorcycle evidence must not be blindly reused as Alpine evidence.

## Known technical debt / non-blockers

`UserProfile.defaultRouteId` and `Route.isDefaultCommute` currently represent overlapping default-route state. Treat this as known technical debt. Do not casually refactor it during unrelated work; resolve it deliberately when required.

M3 supports route-aware, duration-weighted speed exposure when a provider-neutral speed profile is supplied. Without it, the engine falls back to an explicit cruise speed or the documented assumed default. Production recommend currently uses the assumed-default path until routing adapters emit travel segments. Weather↔travel mapping is still a deterministic duration-fraction association until denser route sampling (M7).

## Current milestone boundary

**M3 is complete.** Next planned milestone is **M4: Plan Ride UX**.

Do not silently expand into M5 feedback/personalization completion, additional sport engines, production Supabase migration, historical Strava import, advertising SDK integration, or unrelated platform rewrites.

At the end of each milestone, run verification, report results and remaining risks, and STOP before the next milestone.
