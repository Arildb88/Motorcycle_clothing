# Motorcycle Clothing App — Product & Technical Plan

## Status

**Superseded for product direction** by [`PROJECT_PLAN.md`](../PROJECT_PLAN.md) and [`ARCHITECTURE.md`](../ARCHITECTURE.md) (2026-09-11).

This document remains as historical context for the motorcycle-first **RideWear spike** that was scaffolded in-repo. New milestones should not treat boolean comfort thresholds + AdMob + social OAuth as MVP requirements.

---

## 1. Vision

A cross-platform mobile app (Android + iPhone) that recommends motorcycle clothing for a chosen route based on live weather, the rider’s personal comfort zone, and feedback over time.

**Core loop**

1. User picks a route (default: “normal commute”).
2. App fetches weather along that route.
3. Algorithm suggests gloves / layers / wool / rain gear.
4. User rides and rates comfort.
5. Model adjusts to that user.

---

## 2. Product scope

### 2.1 Must-have (MVP)

| Area | Capability |
|------|------------|
| Auth | Email/password (“standard”), Facebook, Microsoft |
| Profile | Display name, home area, units (°C), default route |
| Routes | Create/edit/delete routes (start → end, optional waypoints); mark one as **Normal commute** (default) |
| Weather | Current + near-term forecast for route: air temp, rain probability/intensity, wind, feels-like if available |
| Comfort | User-tunable thresholds for gloves, extra jacket/pants layer, wool base layers |
| Recommendation | “What to wear” for selected route + departure time |
| Feedback | After ride: too cold / OK / too warm (+ optional notes) |
| Ads | Small, non-intrusive banner for income (see §8.1) |
| Environments | Local + shared **test/staging** + production |

### 2.2 Should-have (v1.1)

- Multi-segment route weather (sample points along polyline)
- Departure-time planning (“leave at 07:15”)
- Rain gear / waterproof callouts
- Push notification: “Tomorrow’s commute: gloves + mid-layer”
- Observed temperatures near route (station data), not only forecasts

### 2.3 Later

- Shared household / club profiles
- Offline last-known recommendation
- Advanced personalization ML (beyond per-user offsets)
- Wearable / connected-gear integrations
- Optional “remove ads” / supporter unlock (only if ads feel necessary long-term)

---

## 3. Weather data strategy

### 3.1 What we can use

| Source | Role | Notes |
|--------|------|--------|
| **MET Norway Locationforecast 2.0** (powers **yr.no**) | Primary forecast | Free (CC license), global; temp, precipitation, wind, symbols. Requires unique `User-Agent`. |
| **MET Norway Nowcast 2.0** | Short-term Nordic rain/now | Good for “is it raining on my ride right now?” |
| **MET Norway Frost** | **Real observations** | Station temperatures, precipitation, history. Client ID required. Ideal for calibration and “actual temp near route”. |
| **pent.no** | Not usable as an API | Consumer app by VG comparing yr + Storm Geo. **No public developer API.** Do not scrape. |

**Recommendation:** Integrate **api.met.no** (Locationforecast + Nowcast) and **Frost** for real station temps. Optionally add a second forecast provider later (Open-Meteo, etc.) for ensemble/comparison—similar spirit to pent.no without depending on it.

### 3.2 Route weather model

1. Geocode / map start–end (Google Maps / Mapbox / Apple MapKit via Flutter plugins).
2. Build route polyline.
3. Sample **N points** along the route (e.g. start, mid, end; denser for long rides).
4. For each sample: forecast at planned departure (± hourly steps).
5. Aggregate for UI:
   - Min / max air temperature along route
   - Highest rain probability / intensity
   - Max wind
   - Worst “feels cold” case (min temp + wind)
6. Optionally: nearest Frost stations → latest observed air temp for “ground truth” comparison.

All MET calls go through **our backend** (not the phone) so we control `User-Agent`, caching, rate limits, and API keys.

---

## 4. Comfort zone & recommendation algorithm

### 4.1 User-configurable comfort profile

Defaults can be sensible for Nordic motorcycle use; every rider edits their own.

Example fields (stored in °C, adjustable):

| Setting | Example default | Meaning |
|---------|-----------------|---------|
| `gloves_below_c` | 10 | Recommend winter gloves at or below |
| `extra_jacket_layer_below_c` | 12 | Extra jacket layer |
| `extra_pants_layer_below_c` | 8 | Extra pants layer |
| `wool_base_below_c` | 5 | Wool / thermal base |
| `rain_prob_threshold` | 40% | Suggest rain gear |
| `wind_chill_sensitivity` | medium | How hard wind affects “feels” |

Also store: typical ride duration, bike type (optional), heated grips (yes/no)—as modifiers later.

### 4.2 Rule engine (v0 — ship this first)

```
effective_temp = min_route_temp - wind_penalty(wind, sensitivity)

recommend gloves     if effective_temp <= gloves_below_c
recommend jacket+    if effective_temp <= extra_jacket_layer_below_c
recommend pants+     if effective_temp <= extra_pants_layer_below_c
recommend wool       if effective_temp <= wool_base_below_c
recommend rain gear  if rain_probability >= rain_prob_threshold
                     OR precipitation_intensity > X
```

Explainability in UI: “Gloves because 4°C + wind 8 m/s on the hill stretch.”

### 4.3 Learning from feedback (v1)

After each ride, collect:

- Rating: too cold / slightly cold / OK / slightly warm / too warm
- Which recommended items they actually wore (confirm/adjust)
- Actual departure time / duration (optional)

**Personalization algorithm (iterative):**

1. For each feedback, compute error: recommended vs felt.
2. Maintain per-user **offsets** (e.g. `personal_cold_bias_c = +2` means this rider feels colder → treat as 2°C colder).
3. Optionally adjust individual thresholds with bounded updates (never jump more than ±1°C per feedback; clamp to safe ranges).
4. Store anonymized aggregates later for better **global defaults** by region/season.

No heavy ML required for MVP—threshold + bias works well and is easy to test.

---

## 5. Authentication

### 5.1 Methods

1. **Standard** — email + password (or magic link / OTP)
2. **Facebook Login** — OAuth
3. **Microsoft** — Microsoft identity platform / Azure AD (personal + work accounts as needed)

### 5.2 Recommended approach

Use a managed IdP so mobile + backend stay clean:

- **Auth0**, **Firebase Auth**, or **Supabase Auth** (all support email, Facebook, Microsoft with configuration).

Flow:

1. App authenticates via IdP SDK.
2. App sends ID token to our API.
3. API verifies token, upserts `users` row, issues our session/JWT.
4. Profile data lives in our DB (not only in the IdP).

**Test environment:** separate IdP tenants/apps (dev Facebook app, Azure app registration for test, sandbox users).

---

## 6. Recommended tech stack

### 6.1 Mobile (Android + iPhone)

**Flutter** (Dart) — one codebase for Android and iOS.

Why Flutter here:

- You already have **Android Studio** (excellent Flutter tooling).
- iOS builds via Xcode when available (CI or Mac).
- Fast UI iteration, good maps/weather UX patterns.

Alternatives: React Native / Expo — also fine if the team prefers TypeScript end-to-end.

### 6.2 Backend

**NestJS (Node/TypeScript)** or **FastAPI (Python)** — either works.

Suggested: **NestJS + PostgreSQL + Redis**

| Piece | Choice |
|-------|--------|
| API | REST (+ optional GraphQL later) |
| DB | PostgreSQL |
| Cache | Redis (weather responses 10–30 min) |
| Jobs | Queue for route weather refresh / notifications |
| Hosting | e.g. Fly.io / Railway / AWS / Azure |
| Maps | Mapbox or Google Directions for route geometry |

### 6.3 Repo layout (monorepo)

```
/
  apps/
    mobile/          # Flutter
    api/             # NestJS (or FastAPI)
  packages/
    shared/          # Shared types, comfort constants
  docs/
    PLAN.md          # This document
  docker-compose.yml # Local Postgres + Redis + API
```

---

## 7. Data model (sketch)

```
users
  id, auth_provider_ids, email, display_name, created_at

profiles
  user_id, home_lat, home_lon, units, default_route_id

comfort_settings
  user_id,
  gloves_below_c, extra_jacket_layer_below_c,
  extra_pants_layer_below_c, wool_base_below_c,
  rain_prob_threshold, wind_chill_sensitivity,
  personal_cold_bias_c

routes
  id, user_id, name, is_default_commute,
  start_lat, start_lon, end_lat, end_lon,
  waypoints_json, polyline_json, typical_duration_min

ride_feedback
  id, user_id, route_id, departure_at,
  weather_snapshot_json, recommendation_json,
  rating, worn_items_json, notes, created_at

weather_cache
  geohash, valid_until, payload_json
```

---

## 8. App screens (MVP)

1. **Login / Register** — email, Facebook, Microsoft  
2. **Home** — default commute + today’s recommendation (one clear action)  
3. **Routes** — list, set default commute, add/edit  
4. **Route detail** — map + weather strip + clothing recommendation  
5. **Comfort settings** — sliders for thresholds  
6. **Profile** — account, units, logout  
7. **Post-ride feedback** — quick rating sheet  

Design principle: first screen after login = brand + today’s commute recommendation, not a dashboard of widgets.

### 8.1 Monetization — small ad block

Goal: modest income without blocking the ride-prep flow.

**Provider:** Google **AdMob** (standard Flutter plugin; works on Android + iOS). One mediation setup is enough for MVP.

**Ad format (MVP):** anchored **banner only** (typically ~50–60 dp / ~320×50). No full-screen interstitials, no rewarded video, no ads on login, and no ads that cover CTAs or map controls.

**Placement rules (keep it out of the way):**

| Allowed | Not allowed |
|---------|-------------|
| Thin banner pinned to the **bottom** of secondary screens: Routes list, Profile, Comfort settings | Overlay on the clothing recommendation or primary CTA |
| Optional: bottom of Home **below** the fold / after the recommendation content (never competing with “what to wear”) | Interstitial when opening the app or before viewing weather |
| Fail silently if ad fails to load (no empty grey box) | Auto-playing video / expandable takeovers |

**UX constraints:**

- Single banner slot max per screen; never stack ads.
- Reserve a fixed small height so content doesn’t jump when the ad loads.
- High contrast outdoor UI remains readable; ad stays visually secondary (no glow, no fake “card promo” framing around core content).
- Safe for quick glove use: banner is not a required tap target for any core action.

**Privacy / compliance:**

- Show a consent / ATT flow where required (GDPR/EEA, Apple App Tracking Transparency).
- Privacy policy must mention AdMob / advertising identifiers.
- Prefer non-personalized ads until consent is granted.

**Environments:**

| Env | Ads behavior |
|-----|----------------|
| local / CI | Ads **off** or AdMob **test unit IDs** only |
| staging | Test unit IDs |
| production | Real AdMob unit IDs |

Config via Flutter flavors / remote config flags: `ADS_ENABLED`, `ADMOB_BANNER_ID`.

---

## 9. Environments & testing

### 9.1 Environments

| Env | Purpose | Config |
|-----|---------|--------|
| **local** | Developer machines | docker-compose, `.env.local`, mock weather flag |
| **test / staging** | Shared QA, OAuth test apps, MET calls with test User-Agent | Separate DB, staging URL |
| **production** | Real users | Locked secrets, monitoring |

Backend config via env vars: `DATABASE_URL`, `REDIS_URL`, `MET_USER_AGENT`, `FROST_CLIENT_ID`, `AUTH_*`, `MAPS_API_KEY`.

### 9.2 Mobile flavors

Flutter flavors / schemes:

- `dev` → staging API  
- `prod` → production API  

Android Studio run configurations for `dev` and `prod`.

### 9.3 Test strategy

| Layer | What |
|-------|------|
| Unit | Comfort algorithm, weather aggregation, bias updates |
| Integration | API + DB; MET client with recorded fixtures (VCR-style) |
| E2E | Detox/Patrol or Flutter integration tests for login → recommend → feedback |
| Manual | Android emulator (Studio) + iOS simulator when Mac available |
| OAuth | Test users on Facebook / Microsoft app registrations |

**Weather mocking:** `WEATHER_PROVIDER=mock|met` so CI never depends on live MET.

---

## 10. Delivery phases

### Phase 0 — Foundations
- Monorepo, CI, docker-compose, staging project
- Auth (email + Facebook + Microsoft) wired end-to-end
- Empty Flutter shells for Android + iOS

### Phase 1 — Routes & weather
- CRUD routes + default commute
- MET Locationforecast (+ cache) for sampled points
- Home screen: temp, rain, wind for default route

### Phase 2 — Comfort & recommendations
- Comfort settings UI + persistence
- Rule engine + explanation text
- Feedback capture + personal bias updates

### Phase 3 — Real observations, ads & polish
- Frost nearest-station temps
- Departure-time picker, notifications
- AdMob banner slot on secondary screens (test IDs in staging)
- Hardening, analytics, store readiness (Play + App Store)

---

## 11. Non-functional requirements

- **Privacy:** location and routes are sensitive; minimize retention; clear privacy policy (include ads/ATT where required)  
- **MET terms:** identify app with unique User-Agent; cache aggressively; no abusive polling  
- **Security:** secrets only on server; OAuth correctly configured per platform  
- **Performance:** recommendation on home screen &lt; ~2s with warm cache; ads must not block first paint of recommendation  
- **Accessibility:** large tap targets for gloved use; high contrast outdoor readability  
- **Monetization:** banner-only ads; never interrupt the core “what to wear” path  

---

## 12. Risks & decisions

| Risk / decision | Mitigation |
|-----------------|------------|
| pent.no has no API | Use MET (+ optional second open API); never scrape pent |
| iOS builds need Mac/Xcode | Use CI Mac runners or borrow Mac for store builds; develop Android-first in Studio |
| OAuth app review (Facebook) | Start early; use email login as fallback in test |
| Overfitting comfort model | Bound learning steps; keep manual override of thresholds |
| Route sampling cost | Cache by geohash + TTL; limit samples for short routes |
| Ads annoying riders | Banner only, secondary screens, no interstitials; consider optional remove-ads later |
| Store policy / privacy | Consent + ATT; AdMob test IDs in non-prod; declare ads in store listings |

---

## 13. Immediate next steps (when building)

1. Confirm Flutter + NestJS (or preferred stack).  
2. Scaffold monorepo + docker-compose test env.  
3. Implement auth + profile.  
4. Wire MET Locationforecast behind the API with fixtures.  
5. Ship routes + default commute + first recommendation UI.  
6. Add comfort sliders + feedback loop.  
7. Add AdMob banner on secondary screens (test IDs first).

---

## Appendix A — Useful API references

- MET Weather API: https://api.met.no/  
- Locationforecast 2.0: https://api.met.no/weatherapi/locationforecast/2.0/documentation  
- Nowcast 2.0: https://api.met.no/weatherapi/nowcast/2.0/documentation  
- Frost (observations): https://frost.met.no/  
- pent.no info (data sources only; no public API): https://pent.no/info  
