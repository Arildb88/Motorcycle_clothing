# PROJECT PLAN — Personalized Outdoor Clothing Recommendations

**Status:** M1 + M2 + M2.5 + **M2.6 saved routes** + **garment configuration foundation**. Stopped before M3.  
**Date:** 2026-09-11  
**Product decisions:** Motorcycle is first *implemented recommendation* activity; app UX is multi-activity. Ads still deferred. Facebook/Microsoft are identity providers (config-gated). Strava is a connected service (not login). Saved routes are reusable templates — weather/kit always recalculated. Garment ≠ ride configuration (liners/vents).  
**Companion:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`DEVELOPMENT_NOTES.md`](./DEVELOPMENT_NOTES.md)

---

## 1. Product understanding

### What the product is

A cross-platform mobile app that recommends **what to wear for a planned outdoor activity**, using weather + route/time exposure + activity physics + the user’s **actual wardrobe** + **personal comfort history**.

### Core differentiator

Not “weather → generic clothing checklist.”

It is:

> **Personalized, explainable kit advice that improves from the user’s own activities**, starting from strong defaults when history is thin.

The sentence we are optimizing for:

> “Based on your previous motorcycle rides, you often feel cold in this jacket below ~8°C with wind. Add your fleece mid-layer for the mountain section.”

### What already exists in this repository

The repo already contains a **motorcycle-first scaffold** branded **RideWear**:

| Layer | Status |
|-------|--------|
| Flutter Android/iOS app | Login, Today, Routes, Comfort sliders, Profile, AdMob banner, feedback sheet |
| NestJS API + Prisma/SQLite | Auth (email + demo Facebook/Microsoft), routes, comfort thresholds, mock/MET weather, boolean clothing rules, overall feedback → `personalColdBiasC` |
| Docs / scripts | `docs/PLAN.md`, QUICKSTART, start scripts, CI smoke test |

This is useful as a **spike**, not as the final domain model.

### Critical assessment of the current implementation

**Keep**

- Flutter + NestJS monorepo (fits Android Studio; backend already centralizes weather secrets)
- Weather provider switch (`mock` / `met`) and server-side caching idea
- Explainable rule-based recommendations (right philosophy for MVP)
- Lightweight post-activity feedback loop

**Replace / redesign before scaling features**

| Current | Problem | Better direction |
|---------|---------|------------------|
| Boolean thresholds (`glovesBelowC`, etc.) | Not garment-aware; hard to personalize per body area; motorcycle-hardcoded item strings | Continuous **insulation demand** mapped to wardrobe slots / generic categories |
| Single global `personalColdBiasC` | Overfits overall feeling; ignores “cold hands only” | Per-zone offsets with **sample-size weighting** |
| Start/end points only for weather | Misses demanding mid-route segments | Time-aware segment sampling + duration-weighted exposure |
| No wardrobe | Cannot recommend *your* fleece | Simple garment inventory with optional attributes |
| Motorcycle-only schema | Blocks modular activities | `ActivityType` + activity-specific exposure profiles |
| Comfort sliders as primary UX | Exposes model knobs too early | Hidden defaults; optional advanced settings later |
| AdMob in early prototype | Distracts from validating personalization | Defer until recommendation quality is proven |
| Facebook + Microsoft OAuth as MVP requirement | High setup friction for little learning value | Email/password first; OAuth as later milestone |

---

## 2. Biggest risks

| Risk | Why it matters | Mitigation |
|------|----------------|------------|
| **Personalization never feels better than defaults** | Core differentiator fails | Ship feedback + confidence UI early; measure “would wear this again”; require N≥3 similar sessions before strong personal claims |
| **Overfitting after 1 ride** | Users lose trust | Priors + shrinkage; never claim “you always…” from one sample |
| **Worst 5-minute cold segment dictates a 6-hour kit** | Over-dressing → sweat → worse comfort | Duration × severity exposure scoring; “pack optional” vs “must wear” |
| **Wardrobe UX too heavy** | Users never add garments | 20-second add flow: category + name + warmth tier; details optional |
| **Route/weather complexity blocks MVP** | No validated loop | Milestone order: single location → saved start/end → full polyline later |
| **Multi-activity too early** | Dilutes learning | Motorcycle only for first validation; second activity only after feedback loop works |
| **Privacy of precise routes** | Sensitive data | Prefer weather snapshots + coarse summaries; allow delete; avoid permanent full polylines in MVP |
| **Stack rewrite temptation** | Wastes existing working spike | Evolve Nest/Flutter; introduce adapters; don’t restart in Expo/Supabase unless blocked |

---

## 3. What existing APIs/libraries can reasonably provide

| Need | Viable providers | Notes |
|------|------------------|-------|
| Forecast (temp, precip, wind) | **MET Norway Locationforecast** (yr.no), Open-Meteo | MET already partially integrated; keep behind adapter |
| Nowcast / rain | MET Nowcast (Nordic) | Nice-to-have after baseline forecast |
| Observed temps | MET Frost | Calibration later, not MVP-critical |
| Routing / ETA | OpenRouteService, Mapbox, Google Directions, OSRM | MVP can use **manual start/end + estimated duration** without full routing |
| Maps UI | flutter_map / Mapbox / Google | Defer rich maps until segment weather exists |
| Auth | Local JWT (current), later Apple/Google | Keep secrets server-side |
| Product clothing DB | None reliable free | Do **not** depend on barcode DB for MVP |

**Recommendation:** Continue MET (+ mock) for weather. Delay paid routing until Milestone on segment weather. Use estimated duration + 3–5 waypoints typed or picked as interim “route.”

---

## 4. Recommended MVP scope

### First activity: **Motorcycle only**

**Why motorcycle first (agree with your hypothesis)**

1. Strong thermal signal (wind + speed) → feedback is clearer than hiking.
2. Validates personalization faster (hands/torso differences are common).
3. Repo already has motorcycle UX/API surface to evolve.
4. Useful immediately for Nordic riders.

**Why not two activities in MVP**

Second activity doubles profile fields, wardrobe tags, and thermal models before the learning loop is proven. Prove motorcycle personalization first.

**Second activity (post-MVP validation):** **Hiking**  
Simpler intensity model than XC/alpine (no lifts/sweat race cases), good test of modular `ActivityType` without motorcycle wind physics.

**Explicitly not in first MVP:** alpine, snowboard, XC, cycling (architect for them; don’t ship UX).

### MVP user outcomes (definition of done)

A new user can:

1. Create account (email/password).
2. Set motorcycle profile basics (bike category + cold sensitivity coarse: colder / average / warmer).
3. Add 5–15 garments quickly (or use generic placeholders).
4. Plan a ride: departure time + start/end (or saved commute) + duration.
5. Get an **explainable** recommendation: wear / pack / why / confidence.
6. After ride, give **10-second** overall feedback (+ optional hands/torso).
7. See personalization language only when confidence warrants it.

Ads, Facebook/Microsoft OAuth, full polyline routing, product search, heated-gear battery planning: **out**.

---

## 5. Technology stack recommendation

### Options compared

| Option | Pros | Cons |
|--------|------|------|
| **A. Evolve current Flutter + NestJS + Prisma** | Already works on your machine; Android Studio friendly; weather behind API; CI exists | Nest is heavier than serverless; SQLite is local-dev oriented |
| B. Rewrite Expo + Supabase | Faster CRUD auth; less backend code | Throws away working spike; weaker fit if you already invested in Flutter tooling |
| C. Flutter + Firebase | Easy push/auth | Weather/recommendation still need Cloud Functions; vendor lock-in |

### Recommendation: **Option A — evolve Flutter + NestJS**

Reasons:

- You already run Android Studio + this repo successfully (after env setup).
- Recommendation + weather adapters belong on a real API (not only client rules).
- Flutter remains the right choice for Android + iOS with one codebase.
- Replace SQLite with **PostgreSQL in staging/prod** when you leave single-dev mode; keep SQLite for local if desired.

**Deliberate simplifications vs earlier plan**

- Drop Facebook/Microsoft from near-term milestones (keep interface hooks).
- Pause AdMob until personalization is validated.
- Prefer Postgres in `docker-compose` for shared test env when collaborating; SQLite OK solo.

---

## 6. High-level architecture

```
┌──────────────────────┐
│ Flutter app          │  plan activity → show recommendation → capture feedback
│ (Android / iOS)      │  wardrobe CRUD, profile, saved places/routes
└──────────┬───────────┘
           │ HTTPS JWT
┌──────────▼───────────┐
│ NestJS API           │
│  Auth                │
│  Profile / Preferences
│  Wardrobe            │
│  Activities (plans)  │
│  Recommendation engine
│  Feedback / learning │
│  Weather (adapter)   │
│  Routing (adapter*)  │
└──────┬───────┬───────┘
       │       │
   PostgreSQL  External APIs
   (+ cache)   MET / mock / later Open-Meteo, routing
```

\*Routing adapter may return “null provider” in early milestones (manual points + duration).

Detailed components, adapters, and schema: see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## 7. Domain model (MVP proposal)

Simplified vs the long entity list in the prompt — enough for personalization, not a clothing ERP.

**Core**

- `User`, `AuthProvider`
- `UserProfile` — units, coldSensitivity (−1/0/+1), sweatTendency optional later
- `MotorcycleProfile` — category (naked/sport/touring/…), windProtection (none/low/med/high)
- `Garment` — name, category, warmthTier, optional wind/water scores, activity tags
- `Place` / `Route` — **saved route templates** with ordered `RouteWaypoint` (coords canonical); optional category/favorite; **no weather or recommendations stored on Route**
- `ActivityPlan` — activityType, departureAt, durationMin, optional `routeId`, `snapshotJson` (route geometry snapshot at plan time)
- `ActivityLog` — what actually happened; may retain `routeId` (nullable after delete) + weather/recommendation summaries
- `WeatherSnapshot` — normalized segment forecasts (JSON OK early)
- `Recommendation` + `RecommendationItem` — wear/pack, reasons, confidence
- `ActivityLog` — completed plan + actual worn garment IDs (or generics)
- `ActivityFeedback` — overall rating; optional zone ratings; optional sweat
- `PersonalPrior` / derived `ComfortState` — per activityType × bodyZone offsets + sample counts (can start as JSON on profile)

**Deferred tables:** product catalog, community ratings, Health/Strava links, full `RoutePoint` history retention.

---

## 8. Recommendation algorithm v1 (explainable, non-ML)

### Conceptual pipeline

1. **Build exposure timeline**  
   For each route segment (or single location): forecast at ETA → temp, wind, precip, duration.

2. **Compute segment cold stress**  
   Motorcycle-specific effective temperature:

   ```
   T_eff = T_air
           - windChill(wind, ridingSpeedEstimate, windProtection)
           - rainPenalty(precip)
   ```

   Riding speed can be a profile default by bike category until GPS exists.

3. **Duration-weighted demand (not pure minimum)**  

   ```
   demand = Σ severity(segment) * weight(duration)
   wearDemand  = percentile-ish blend favoring hard segments but clipped
   packDemand  = harder tail (e.g. top severity if duration ≥ threshold)
   ```

   Example weight: severity ∝ max(0, T_comfort_ref − T_eff)^1.2; short spikes get lower weight unless extreme.

4. **Convert demand → insulation slots**  
   Continuous **warmth points** for: base, mid, shell, hands, legs, head, feet, rain.

5. **Map to wardrobe**  
   Pick best matching owned garments; if missing, recommend generic category (“Light fleece mid-layer”).

6. **Apply personalization with shrinkage**  

   ```
   offset = prior_default + (n / (n + k)) * personal_mean_error
   ```

   `k` ≈ 5–8 sessions. Until `n` is small, copy stays generic (“typical rider…”), not “you always…”.

7. **Emit explanation + confidence**  
   Confidence from: forecast age, segment coverage, wardrobe completeness, `n` for relevant condition bucket.

### Why not ML yet

- Too little data per user.
- Need trust and debugability.
- Deterministic model + shrinkage is enough to validate the product.

### Motorcycle wind protection (architecture hook)

Store `windProtection` enum now; later replace with windscreen height / fairing model without changing the demand interface.

---

## 9. Personalization without ML

| Mechanism | Behavior |
|-----------|----------|
| Priors | Activity-specific default comfort curves |
| Feedback | Overall (−2…+2) updates global offset slowly |
| Zone feedback | Hands/torso/legs/feet/head update zone offsets |
| Condition buckets | Coarse bins (e.g. T_eff 0–5°C, windy/not) — only when n≥3 |
| Worn kit linkage | Learn garment-specific residuals later (“this fleece runs warm”) once garment IDs are logged |
| Anti-overfit | Cap per-update delta; require shrinkage; decay old sessions optionally |

UI rule: **personal phrasing only if confidence ≥ medium and n≥3 in relevant bucket.**

---

## 10. Assumptions that need validation

1. Users will add at least a minimal wardrobe (or accept generics).
2. 10-second feedback is enough signal to beat static defaults within ~5–10 rides.
3. Duration-weighted exposure matches rider intuition better than min-temp rules.
4. Motorcycle category + coarse wind protection is accurate enough without vehicle telemetry.
5. MET forecast skill for inland mountain routes (e.g. toward Hovden) is “good enough” for clothing decisions.
6. Users trust explanations more than accuracy percentages — verify with friends/testers.

---

## 11. Implementation roadmap (small milestones)

Each milestone should be **demoable and verifiable** before the next.

| # | Milestone | Verify | Status |
|---|-----------|--------|--------|
| **M0** | Align docs + freeze MVP scope (this plan) | Stakeholders agree motorcycle-only MVP | Done |
| **M1** | Domain migration foundations | New Prisma models for ActivityPlan, Garment, Feedback zones; keep app compiling | Done |
| **M2** | Wardrobe MVP | Add/edit/delete garments in <30s; generics/demo seed | Done |
| **M2.5** | Profile, auth identities, activity context, connected services | Startup chooser, default activity, FB/MS IdP architecture, Strava connect foundation | **Done** |
| **M2.6** | Saved motorcycle routes | CRUD routes + waypoints; favorites; plan-from-route; Motorcycle quick-launch UX; ownership tests | **Done** |
| **M2.7** | Motorcycle garment configuration | Material, liners as components, vent capability, presets; worn-config shape documented for M5 | **Done** (this branch) |
| **M3** | Recommendation engine v1 | Unit tests for demand, weighting, shrinkage; explainable API response | Next |
| **M4** | Plan ride UX | Departure + duration + start/end → recommendation screen (wear/pack/why/confidence) | Partially started via saved-route launch; full plan UI still pending |
| **M5** | Feedback loop v1 | Overall + optional hands/torso; priors update; personal copy gated | Pending |
| **M6** | Live MET default in staging | Side-by-side mock vs MET; cache OK | Pending |
| **M7** | Segment weather v1 | 3–5 samples along route with ETA; duration weighting visible in “why” | Pending |
| **M8** | Privacy + delete | Delete activity; export/delete account basics | Pending |
| **M9** | Hardening | Postgres staging, CI coverage for engine, QUICKSTART update | Pending |

**Stop after M5** for first user tests if possible — that is the personalization hypothesis gate.

---

## 12. Deliberately NOT in MVP

- Alpine / snowboard / XC / cycling UX
- Full GPX, Strava, Health Connect, Garmin
- Product barcode/search clothing database
- AI photo garment recognition
- Community ratings
- Push notifications / “best departure time”
- Interstitial ads / monetization push
- Facebook & Microsoft login (until email flow is solid)
- Height/weight collection (not justified yet)
- Black-box ML recommender
- Permanent high-resolution route history
- Perfect windscreen physics

---

## 13. Product improvements you may have overlooked

1. **Wear vs Pack split** — critical for mountain spikes without forcing sweat on warm starts.
2. **Confidence + silence** — don’t claim personalization early; show “based on typical riders” vs “based on your rides.”
3. **Garment logging at feedback time** — “Did you wear what we suggested?” one toggle — huge for learning.
4. **Condition buckets** — personalization is local in weather space, not one global bias.
5. **Sweat as first-class later** — overheating from over-dressing is as common as cold on multi-hour rides.
6. **Commute presets** — keep “normal commute” — high retention loop for daily learning.
7. **Offline last recommendation** — useful when parking garage has no signal (simple cache).
8. **Safety disclaimer** — clothing advice ≠ safety certification (CE armor, etc.).
9. **Test cohort protocol** — 5 riders × 10 rides beats building 6 sports early.

---

## 14. Open decisions (only the important ones)

Locked:

1. Motorcycle is first *recommendation* activity — yes (engines for hiking/cycling deferred).
2. Ads deferred — yes.
3. **Updated M2.5:** Facebook & Microsoft are identity providers (config-gated), not deferred forever.
4. **Updated M2.5:** App launches as multi-activity product with chooser / default preference.
5. App name: RideWear — still open to rename before store listing.

---

## 15. Architecture changes accepted in M2.5

| Prior decision | Change | Why |
|----------------|--------|-----|
| Motorcycle-only app UX | Multi-activity shell + session `currentActivity` | Product is outdoor platform; motorcycle remains first full engine |
| Defer social OAuth | Enable FB/MS as **identity providers** behind env config | Required for account UX; secrets stay server-side |
| Auth = email JWT + demo oauth hook | Auth identities + PKCE authorize/callback; **no silent email merge** | Safe multi-provider accounts |
| (none) | **Connected services** (`ConnectedAccount`) separate from login | Strava ≠ RideWear identity |
| Profile = sensitivity/units | + defaultActivity, showChooser, avatarUrl, onboarding | Startup preferences |

**Not changed:** Flutter+Nest+Prisma stack; wardrobe shared across activities; recommendation engine still deferred to M3; ads remain off.

---

## 16. Saved motorcycle routes (M2.6)

**Problem:** Commuters and regular riders should not re-enter the same route every time.

**Architecture choice:** Extend existing Prisma `Route` + add `RouteWaypoint`. Do **not** introduce a competing `SavedRoute` entity. Docs may say “saved route”; the model name remains `Route`.

| Concept | Role |
|---------|------|
| **Route** (saved) | Reusable template: name, waypoints, category/favorite |
| **ActivityPlan** | One planned ride at a date/time; `routeId` + `snapshotJson` |
| **ActivityLog** | What happened; may reference `routeId` (nullable) |

**Rules**

- Weather and clothing recommendations are **never** stored on `Route`.
- Launch = create plan (snapshot) → fresh `/recommend?routeId=…`.
- Edit route = future plans use new geometry; past plans keep `snapshotJson`.
- Delete route = `routeId` SetNull on plans/logs; history remains via snapshot/summaries.
- Ownership enforced on every route API; routes are private by default.
- Map search / routing-provider geometry deferred (form + lat/lon foundation now).

**API:** `GET/POST /routes`, `GET/PATCH/DELETE /routes/:id`, `POST /routes/:id/plan`.

---

## 17. Next step after saved routes

**Before M3:** motorcycle garment configuration (liners/vents) — see §18.

**M3:** demand-based motorcycle recommendation engine. Do not build hiking/cycling engines yet.

---

## 18. Garment vs configuration (M2.7)

**Critical review outcome:** M2 static garments were insufficient for touring jackets whose warmth depends on removable liners and vents. We did **not** duplicate wardrobe rows (“Klim warm” / “Klim cold”).

| Concept | Meaning |
|---------|---------|
| **Garment** | Physical item owned (one Klim jacket) |
| **GarmentComponent** | Removable liner belonging to that garment |
| **Ride configuration** | Which liners installed + vents open/closed *on that ride* |

**Model choices**

- Coarse categories + optional `material` (textile/leather/mesh/denim/…) rather than many jacket enums.
- Gloves stay one category; summer/winter/heated via tiers + `isHeated`.
- `hasVentilation` = capability; open/closed is ride config (deferred storage until worn evidence in M5).
- UX presets (mesh jacket, jeans, winter gloves…) apply defaults without bloating the DB.
- New category: `one_piece_suit` (`full_body`).
- M3 should use `effectiveGarmentTiers(base, installedComponents)` and emit structured reason codes (INSTALL_THERMAL_LINER, VENTS_CLOSED).
- Personalization must learn from **actual worn config**, not the recommendation.

**Deferred:** ActivityGarment table, partial vent positions, clo science, product catalogs.

---

## 19. Platform roadmap (accepted direction — not all implement now)

Priority remains Motorcycle MVP → M3 → feedback → personalization. Do not derail for Alpine/ads/Postgres.

| Topic | Timing |
|-------|--------|
| M3 motorcycle demand engine | **NEXT** |
| Garment config + saved routes | Done (prerequisites) |
| Localization `nb`/`en` foundation | **IMPLEMENT NOW** (this branch) |
| Postgres/Supabase staging | **BEFORE BETA** |
| Alpine/Snowboard engines | **FUTURE** (architecture reserved) |
| AdMob banner (responsible rules) | **BEFORE PRODUCTION** / after core validation |
| Full SECURITY/PRIVACY production controls | See [`SECURITY.md`](./SECURITY.md) / [`PRIVACY_ARCHITECTURE.md`](./PRIVACY_ARCHITECTURE.md) |

**Companion docs:** `SECURITY.md`, `PRIVACY_ARCHITECTURE.md`.

---

## 20. Localization requirement

RideWear UI supports **Norsk Bokmål** and **English**. See ARCHITECTURE §17. Domain values stay English/canonical; presentation is localized.
