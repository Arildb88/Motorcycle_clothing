# ARCHITECTURE — Personalized Outdoor Clothing App

Companion to [`PROJECT_PLAN.md`](./PROJECT_PLAN.md).  
Focus: technical structure, adapters, schema, and migration from the current RideWear spike.

---

## 1. Goals for architecture

- Explainable recommendations (no black box in MVP)
- Activity types modular (ship motorcycle first)
- Weather / routing / auth replaceable via adapters
- Personalization with priors + shrinkage (no ML platform)
- Privacy-minimizing storage of location/route data
- Evolve existing NestJS + Flutter code instead of rewrite

---

## 2. System context

```
Mobile (Flutter)
    │  JWT (+ OAuth redirect via app deep link)
API (NestJS)
    ├── RecommendationEngine (pure domain; M3+)
    ├── WeatherPort  → Met | Mock | (later OpenMeteo)
    ├── RoutingPort  → Null | (later ORS/Mapbox)
    ├── Auth         → Email + IdentityProviders (Facebook, Microsoft; Apple/Google later)
    ├── Connections  → ConnectedServices (Strava; Garmin/Health later)
    └── Persistence  → Prisma (SQLite local → Postgres staging/prod)
```

**Rule:** Flutter never holds provider client secrets or refresh tokens for connected services. Identity OAuth uses authorization code + PKCE; token exchange happens on the API.

---

## 3. Bounded contexts (API modules)

| Module | Responsibility |
|--------|----------------|
| `auth` | Email register/login; identity provider status; OAuth start/callback (PKCE); link identity; JWT |
| `users` | UserProfile prefs, motorcycle profile, onboarding, account delete stub |
| `connections` | Connected services (Strava connect/disconnect/status); encrypted token vault |
| `wardrobe` | Garments CRUD + demo seed (shared across activities) |
| `places` / `routes` | Saved locations & **saved motorcycle routes** (waypoints, favorites, plan-from-route) |
| `plans` | ActivityPlan create via `POST /routes/:id/plan` (full plans API still M4) |
| `weather` | Fetch + normalize + cache forecasts |
| `recommend` | **M3 Motorcycle engine v1** (`recommend/motorcycle/*`); spike `recommendClothing` removed |
| `feedback` | Persist ActivityLog/Feedback; full learning in M5 |
| `privacy` | Delete activity / account |

---

## 3.1 Identity providers vs connected services (M2.5)

```
RideWear User
├── AuthIdentity[]          # how you sign in
│     ├── local (email/password)
│     ├── facebook
│     └── microsoft
│     └── (future: apple, google)
│
├── UserProfile             # preferences (not tokens)
├── MotorcycleProfile       # motorcycle-specific only
├── Garment[]               # shared wardrobe
│
└── ConnectedAccount[]      # post-login integrations
      ├── strava
      └── (future: garmin, health_connect, apple_health)
```

**Account linking rules**

1. OAuth **login** resolves only by `(provider, providerSubjectId)`.
2. **Never** silently merge two RideWear users because emails match.
3. If provider subject is new and email already belongs to another user → `409` with guidance to sign in and **link**.
4. **Link** requires an authenticated session (`POST /auth/identities/link`).
5. A provider subject may attach to at most one user (`@@unique([provider, providerSubjectId])`).

**Token security**

| Secret | Where stored |
|--------|----------------|
| FB/MS/Strava client secrets | Server env only |
| RideWear JWT | Flutter secure storage |
| Strava access/refresh tokens | Server DB, AES-GCM encrypted (`TOKEN_ENCRYPTION_KEY`); never returned to clients |
| OAuth `state` / PKCE verifier | Short-lived server `OAuthState` rows |

---

## 3.2 Activity context & navigation (M2.5)

- **defaultActivity** (persisted on `UserProfile`) ≠ **currentActivity** (Flutter session state).
- **showActivityChooserOnLaunch** controls first screen of a fresh app session only.
- Selectable now: `motorcycle` | `hiking` | `cycling`. Engines: **motorcycle_v1** only; others show “coming next”.
- Shell tabs: Activity Home | Routes | Wardrobe | Profile. Home content switches by `currentActivity`.
- No per-sport navigation trees; no cloned wardrobes.

---

## 3.3 Motorcycle recommendation engine (M3)

Pure domain pipeline (no Nest decorators) in `apps/api/src/recommend/motorcycle/`:

1. **segments** — duration-aware weather segments (even split until denser sampling).
2. **exposure** — `motorcycleExposureC` from air temp, wind, assumed cruise airflow, wet penalty (constants in `constants.ts`; not medical “feels like”).
3. **demand** — duration-weighted sustained warmth/wind/water tiers (1–5) per body zone; short extremes recorded separately for PACK.
4. **wardrobe-match** — prefer owned garments + `effectiveGarmentTiers` + liner/vent config instructions; else generic requirement (`source: generic`).
5. **confidence** — LOW/MEDIUM/HIGH from weather/wardrobe/cruise/evidence coverage.
6. **pipeline** — assembles structured `wear` / `pack` / `reasons[]` (language-neutral codes) / `confidence`.

`RecommendService` loads the user’s wardrobe, applies shrinkage bias only, and returns a version-compatible `/recommend` payload (`effectiveTempC` alias + structured fields). Flutter localizes reason codes via ARB (`nb`/`en`).

Motorcycle-specific modules must not be reused as Hiking/Cycling engines.

---

## 4. Provider adapters

### WeatherPort

```ts
interface WeatherPort {
  forecast(points: Array<{ lat: number; lon: number; at: Date }>): Promise<WeatherSample[]>;
}
```

Normalized `WeatherSample`: `airTempC`, `windMs`, `precipProb`, `precipMm`, `humidity?`, `symbol?`, `source`, `fetchedAt`.

Implementations:

- `MockWeatherAdapter` — deterministic for CI
- `MetLocationForecastAdapter` — existing MET integration, cleaned up
- Future: `OpenMeteoAdapter` for redundancy

Cache by geohash + hour bucket (Redis later; Prisma `WeatherCache` is fine early).

### RoutingPort

```ts
interface RoutingPort {
  route(input: { start; end; waypoints?; departAt }): Promise<RouteGeometry | null>;
}
```

MVP: `NullRoutingAdapter` — client/API supplies start, end, optional midpoints, and `durationMin`. Segment ETAs = linear time allocation along points.

Later: OpenRouteService / Mapbox without changing recommend module.

---

## 5. Recommendation engine (domain package)

Keep pure functions in something like `apps/api/src/recommend/engine/` (no Nest decorators) so tests stay fast.

### Pipeline stages

1. `buildSegments(plan, geometry|points) → Segment[]` (ETA per point)
2. `attachWeather(segments, WeatherPort) → ExposedSegment[]`
3. `scoreExposure(activityProfile, segments) → ExposureSummary`  
   - motorcycle: wind chill using speed estimate × windProtection  
   - includes duration weights + wear vs pack split
4. `toSlotDemand(ExposureSummary, priors) → SlotDemand`  
   slots: `base | mid | shell | hands | legs | head | feet | rain`
5. `matchWardrobe(demand, garments[]) → RecommendationItems`  
   fallback generics if empty wardrobe
6. `explain(...) → reasons[] + confidence`

### Motorcycle exposure sketch

```
speed_ms = f(bikeCategory) // defaults table
wind_eff = wind_ms * (1 - protectionFactor[windProtection]) + speed_ms * k
T_eff = T_air - chill(wind_eff) - rainPenalty
severity = max(0, T_ref - T_eff) ** p
weighted = Σ severity_i * durationWeight(duration_i)
```

`protectionFactor`: none 0 → high ~0.5–0.7 (tunable constants, not user-facing).

### Shrinkage personalization

Per `(userId, activityType, zone)` store:

- `n` — effective sample count
- `meanResidual` — average (felt − predicted) in °C-equivalent or warmth points
- update with capped deltas after each feedback

```
appliedOffset = (n / (n + k)) * meanResidual
```

Global overall feedback updates `zone=overall` and lightly couples to hands/torso until zone feedback exists.

---

## 6. MVP schema (Prisma-oriented)

This is the target model to migrate toward. JSON columns are acceptable early; normalize when queries need it.

```
User
AuthIdentity   # login identities (renamed from AuthProvider)
  provider, providerSubjectId, providerEmail?, avatarUrl?
UserProfile
  coldSensitivity, heatSensitivity?
  defaultActivity, showActivityChooserOnLaunch
  interestedActivitiesJson, avatarUrl?, onboardingCompleted
  units, home*, defaultRouteId
MotorcycleProfile
  category, windProtection
Garment
  … material?, hasVentilation, isHeated, activityTagsJson
GarmentComponent
  kind (thermal_liner|waterproof_liner|other), tier deltas
ConnectedAccount
  provider (strava|…), encrypted tokens, status, metadata
OAuthState
  ephemeral PKCE/state for IdP + Strava
Place / Route / RouteWaypoint / ActivityPlan / WeatherSnapshot / Recommendation*
ActivityLog / ActivityFeedback / BodyAreaFeedback / PersonalOffset
WeatherCache
```

### Garment vs ride configuration

- **Garment** = owned physical item (one row).
- **GarmentComponent** = removable liner belonging to that garment (not a separate wardrobe “outfit”).
- **Ride configuration** (liners installed, vents open/closed) belongs on activity worn-evidence later — not duplicated as extra garments.
- UX presets map mesh/leather/jeans/heated gloves → category + material + defaults.
- M3 consumes effective tiers = base ± installed component deltas.

### Route vs plan vs log (do not conflate)

| Model | Meaning |
|-------|---------|
| **Route** | Reusable saved route template (private to user). Ordered `RouteWaypoint` coords are canonical. Optional `category`, `isFavorite`, `routeKind`. **Never stores weather or clothing recommendations.** |
| **ActivityPlan** | A specific planned ride (`departureAt`, `durationMin`, optional `routeId`). `snapshotJson` freezes the route definition used at plan time so later edits/deletes do not rewrite history. |
| **ActivityLog** | What the user actually did. May keep `routeId` (SetNull on route delete) plus weather/recommendation summary JSON for learning. |

**Route kinds** (`point_to_point` | `multi_stop` | `loop`) are conceptual labels over the same ordered-waypoint model — no separate route engines.

**Geometry compromise:** store ordered waypoints (and denormalized start/end). Do **not** permanently store full provider polylines in MVP. Future M7 samples weather along provider geometry at recommendation time; waypoints remain the saved definition.

**Privacy:** saved routes reveal home/work habits. Private by default; no public sharing; ownership checks on every API; avoid logging exact coordinates in app logs; account deletion cascades routes.

### Migration from current schema

| Old | New |
|-----|-----|
| `ComfortSettings` thresholds | Removed; sensitivity → `UserProfile.coldSensitivity`; engine defaults live in code until M3 |
| `personalColdBiasC` | `PersonalOffset(overall)` with shrinkage fields `n`, `meanResidual` |
| `RideFeedback` | `ActivityLog` + `ActivityFeedback` (+ `BodyAreaFeedback`) |
| `Profile` | `UserProfile` |
| `Route` | Kept; extended with description, activityType, routeKind, category, isFavorite, lastUsedAt + **RouteWaypoint** children; plan snapshot on ActivityPlan |
| Boolean recommend items | Replaced by M3 structured wear/pack + reason codes (legacy `items`/`effectiveTempC` kept as compatibility aliases) |

**M1 applied:** migration `20260911084843_m1_domain_foundations`. Wardrobe module owns garment CRUD; category → layer/zone defaults in `apps/api/src/domain`.

---

## 7. Flutter app structure (target)

```
lib/
  config/
  data/          // API client, DTOs
  domain/        // entities used by UI
  features/
    auth/
    home/        // today's recommendation
    plan/        // create activity plan
    wardrobe/
    routes/
    feedback/
    profile/
  ui/            // theme, shared widgets
```

**Primary flow (MVP):** Plan ride → Recommendation → (later) Feedback.

Avoid exposing warmth math. Optional “Advanced” can come later.

Ads: keep code path behind `ADS_ENABLED=false` by default until product validation.

---

## 8. Confidence model (simple)

Score 0–1 from weighted factors:

- Forecast freshness / provider success
- Number of weather samples along route
- Wardrobe coverage for required slots
- `n/(n+k)` personalization strength for relevant bucket

Map to UI: Low / Medium / High (+ optional percent).  
Uncertainty copy examples: “Few similar rides logged,” “Only start/end weather sampled.”

---

## 9. Privacy design

| Data | MVP policy |
|------|------------|
| Account email | Required |
| Home coordinates | Optional |
| Route geometry | Ordered waypoints (coords) + labels; **no mandatory full GPS polyline**; snapshot on ActivityPlan when launching |
| Saved routes | Private per user; ownership enforced; delete does not erase ActivityLog history |
| Weather | Store summary snapshot with activity log (needed for learning); never cache “the” recommendation on Route |
| Feedback | Retained until user deletes activity |
| Delete | Delete activity log → cascades feedback; account deletion removes user graph |
| Ads/tracking | Off in MVP |

Avoid collecting height/weight until a clear model need exists (it does not for v1).

---

## 10. Environments

| Env | DB | Weather | Auth |
|-----|----|---------|------|
| Local | SQLite or local Postgres | mock | email |
| Staging | Postgres (compose) | met | email |
| Prod | Postgres | met (+ cache) | email (+ later OAuth) |

Config via env: `DATABASE_URL`, `JWT_SECRET`, `WEATHER_PROVIDER`, `MET_USER_AGENT`, `ADS_ENABLED`.

---

## 11. Testing strategy

| Layer | Focus |
|-------|-------|
| Unit | Exposure weighting, shrinkage, wardrobe matching, motorcycle chill |
| Integration | Plan → recommend → feedback → offset update |
| Contract | Weather adapter fixtures (recorded MET JSON) |
| Smoke | Existing `scripts/smoke-api.sh` extended for new endpoints |
| Manual | Android emulator via QUICKSTART |

Golden tests: fixed weather fixtures → stable explanation strings for key scenarios (cold mountain segment, warm start + cold mid, rain).

---

## 12. Extensibility for other sports

Each activity registers an `ActivityExposureProfile`:

```ts
interface ActivityExposureProfile {
  activityType: string;
  scoreSegments(segments, userCtx): ExposureSummary;
  defaultSlotPriorities(): Slot[];
}
```

Motorcycle implements first. Hiking later: metabolic intensity multiplier, less wind-from-speed. XC/alpine add stationary/lift factors afterward without rewriting the wardrobe or feedback modules.

---

## 13. What not to abstract prematurely

- Don’t build a plugin marketplace for activities
- Don’t introduce a ML training pipeline
- Don’t microserve the engine
- Don’t normalize every weather field into 15 tables on day one (JSON snapshots are fine)

Optimize for **clear module boundaries** and **tested pure functions**, not for hypothetical scale.

---

## 14. Production topology (target)

```
Flutter (iOS/Android)
    │ HTTPS + JWT
NestJS API (authz, recommend, wardrobe, routes, connections)
    │ Prisma
PostgreSQL (Supabase-hosted OK; portable SQL preferred)
    │
External: MET weather · FB/MS IdP · Strava (tokens encrypted at rest)
```

**Supabase timing:** local SQLite now; **Postgres before beta**; production backups before public launch. Do **not** connect Flutter to Postgres with privileged credentials. See [`SECURITY.md`](./SECURITY.md).

---

## 15. Alpine / Snowboard (FUTURE engines — document only)

Motorcycle remains the first full engine. Alpine is next vertical-weather sport after motorcycle personalization validates.

**Ski area model (future):** base + summit coordinates/elevations; period start/end; weather at base and top (do not assume village = summit). Lift/queue exposure vs active descent. Snowboard may share `AlpineExposureEngine` but remains a distinct `ActivityType`.

**Clothing:** shared wardrobe; shell vs insulated jackets/pants must remain distinguishable via warmth + material/category semantics (already supported by ordinal tiers + material). Do not mix Alpine feedback blindly into motorcycle offsets.

**Do not implement Alpine now.**

---

## 16. Responsible advertising

| Rule | Decision |
|------|----------|
| Default | `ADS_ENABLED=false` until core loop validated |
| Allowed format | Small banner / native-banner only |
| Forbidden | Interstitials, app-open, rewarded-to-unlock kit, ads covering content, ads before recommendation |
| Ad-free surfaces | Login/OAuth, consent/privacy, account/security, active navigation, safety/weather alerts, **primary recommendation card** |
| Independence | Ad domain never feeds recommendation scoring |
| Abstraction | `AdBannerSlot` / config flag — screens request placements |
| Premium (FUTURE) | Optional no-ads; never degrade safety for free users |
| Consent | EEA/Norway CMP **BEFORE PRODUCTION** if ads on |

---

## 17. Localization (platform capability)

Supported UI languages: **Norwegian Bokmål (`nb`)**, **English (`en`)**.

- Flutter gen-l10n / ARB — no `if (lang == …)` forks.
- `UserProfile.preferredLanguage` syncs across devices; local cache for startup + pre-login.
- First launch: device Norwegian → `nb`, else `en`; explicit choice wins.
- Language ≠ units.
- Domain enums stay language-neutral (`motorcycle`, reason codes).
- Engine emits structured reason codes; UI localizes presentation.
- User-entered names never auto-translated.
- New screens must use l10n; legacy hard-coded English tracked as debt.

---

## 18. Safety language

Clothing advice is guidance, not a guarantee. Prefer probabilistic copy. Separate weather/safety warnings from kit lists. Appropriate clothing does not make unsafe conditions safe.

See also [`PRIVACY_ARCHITECTURE.md`](./PRIVACY_ARCHITECTURE.md).

