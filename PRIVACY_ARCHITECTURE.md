# PRIVACY ARCHITECTURE — RideWear

Companion to [`SECURITY.md`](./SECURITY.md) and [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## 1. Data minimization principle

Store **evidence useful for clothing personalization**, not raw sensor dumps.

**Do not permanently store by default**

- Second-by-second GPS traces
- Massive raw weather provider payloads
- Dense unused route polylines
- Duplicate geometry for every ActivityPlan (prefer snapshot of waypoints only)
- Redundant full recommendation recalculation blobs

**Prefer ActivityLog evidence such as**

- activity type, duration, departure window
- temperature / wind / precip exposure summaries
- clothing actually worn **including configuration** (liners, vents)
- body-zone feedback
- recommendation reference + saved route id/snapshot
- aggregated / duration-weighted speed summaries where useful (not raw GPS traces)

---

## 2. Location data — what / why

| Data | Why stored | Policy |
|------|------------|--------|
| Home lat/lon (optional) | Default start suggestions | Optional; user-deletable |
| Saved Route waypoints | Reusable commute/tour templates | **Private by default**; ownership on every API |
| ActivityPlan `snapshotJson` | Preserve planned geometry + preferences after route edit/delete | Minimal waypoint snapshot (+ preference flags), not full GPS |
| ActivityPlan `routeAnalysisJson` | Optional distance/duration/segment speed summary for exposure/weather | Derived summary; not dense polylines |
| Route `preferencesJson` | Reusable avoidMotorways / tolls / ferries flags | Non-location; still private with the route |
| Weather cache (coarse keys) | Performance | Short TTL; not a location history product |
| Exact historical GPS | Not required for MVP clothing advice | **Do not retain** unless a future feature justifies it |

Saved routes may reveal home, workplace, and habits → treat as sensitive.

---

## 3. Privacy rules

1. Saved routes and activity history are private to the account.
2. No public sharing by default (**FUTURE** if ever shared — explicit opt-in).
3. Delete route must work; historical logs keep snapshot / SetNull `routeId`.
4. Account deletion removes or anonymizes personal graph per retention policy (**BEFORE PRODUCTION**).
5. Avoid logging exact coordinates in application logs.
6. Authorization mistakes must not expose another user’s routes/wardrobe (**tests required**).

---

## 4. Personalization & activities

- Motorcycle evidence must not blindly mix with Alpine/Hiking evidence.
- Shared tendencies may transfer cautiously; activity-specific evidence weighs more (M5).

---

## 5. Ads & consent

If ads are enabled in production:

- Document SDK data collection in privacy policy
- Consent management for EEA/Norway where required
- Prefer non-personalized defaults where possible
- Never sell recommendation influence to advertisers

---

## 6. Language vs units

Language preference (`nb` / `en`) is separate from measurement units. User-entered names (routes, garments) are never auto-translated.

---

## 7. Map / place-search providers (server)

Route creation uses provider-neutral mobile abstractions (`LocationSearchService`, `RouteGeometryService`). Normal place search and route preview call the **RideWear API only**. The API calls **HeiGIT OpenRouteService** (directions) and **HeiGIT Pelias** (geocoding). Flutter does not hold `ORS_API_KEY` and does not require a Google Maps key for this flow.

| Flow | Data sent | Destination | Retention in RideWear |
|------|-----------|-------------|------------------------|
| Place autocomplete | Typed search text | RideWear API → Pelias (`api.heigit.org`) | Not stored by RideWear |
| Place resolve | Selected place id | RideWear API → Pelias | Label/address + lat/lon stored on owned `RouteWaypoint` only after save |
| Route preview | Ordered waypoint coordinates, avoid-motorways flag | RideWear API → OpenRouteService (`https://api.heigit.org/openrouteservice/`) | Preview polyline is ephemeral in the UI; not persisted |
| Plan ride | Saved waypoints | RideWear API → OpenRouteService when configured | Provider-neutral distance, duration, and travel segments on `ActivityPlan.routeAnalysisJson`. Waypoint endpoints only — not the full road polyline |
| Save route | Waypoints via RideWear API | RideWear backend | Same ownership/privacy rules as §2–3 |

**Rules**

1. Do **not** send route/location payloads to additional third parties beyond HeiGIT (when routing is configured) and the RideWear API.
2. Do **not** log API keys, search text, or exact waypoint coordinates.
3. `ORS_API_KEY` stays in server environment only. Do not put it in Flutter, git, or client logs. Do not call the deprecated `api.openrouteservice.org` host.
4. Preview geometry is **road-following driving geometry** (`driving-car`). The UI must say so and must not claim the route is motorcycle-optimized.
5. When the provider is unset or unavailable, planning falls back to the duration hint and the preview shows a safe unavailable error. Straight segments are only a local drawing fallback, not a claimed road route.
6. Saved Route still stores **route definition only** (waypoints/labels), not weather, clothing, or full provider polylines. Device GPS for “current location” stays on the device until the rider saves or previews a waypoint.

---

## 8. Personal-data inventory (engineering readiness)

Reviewed 2026-10-06 in `PRIVACY-DATA-001`. This is a description of the current repository. It is not a GDPR determination, a privacy policy, or a statement that retention is legally sufficient.

| Category | Purpose | Storage | Retention / deletion | Leaves RideWear |
| --- | --- | --- | --- | --- |
| Account | Sign-in and display name | `User.email`, `User.passwordHash` (bcrypt), `User.displayName` | Account deletion deletes the user row. Related profile, wardrobe, places, routes, plans, logs, offsets, identities, reset tokens, and connected accounts cascade with it | Email is in the login response body. New access tokens carry only the user id. Older tokens may still contain email until they expire |
| Auth identities | Which login method is linked | `AuthIdentity` provider, subject id, provider email, avatar URL | Cascade on account deletion | Facebook and Microsoft receive the OAuth code exchange when those providers are configured. Demo `demo:` tokens work only outside production |
| Password reset | One-hour reset link | `PasswordResetToken.tokenHash` only | Unused hashes for that user are replaced on a new request. Expired hashes and expired OAuth rows are deleted on the next forgot-password, login OAuth start, or Strava connect start. Account deletion cascades the rows | The raw token is in the email link when SMTP is configured. It is not written to application logs |
| OAuth / PKCE state | Short login or connect handshake | `OAuthState` state, code verifier, optional user id, redirect | 10-minute expiry. Expired rows are deleted by the sweep above. Account deletion deletes rows whose `userId` matches, because this table has no foreign key | The authorization URL goes to Facebook, Microsoft, or Strava when that flow is started |
| Profile and home | Units, language, optional home point, activity defaults | `UserProfile`, including optional `homeLat` / `homeLon` | Cascade on account deletion. Home coordinates are optional and user-editable | Not sent to providers by themselves |
| Motorcycle setup | Wind and category for clothing | `MotorcycleProfile` | Cascade on account deletion | No |
| Wardrobe | Clothing the rider owns | `Garment` and `GarmentComponent` | Cascade on account deletion. A rider can delete one garment | No |
| Shared garment catalogue | Community starting estimates already stored for a product | `GarmentCatalogueEntry`: normalized brand, model, category, activity scope, heated flag, liner key, material key, and counts of scores 1–5 for warmth, wind, and water | The row has no user, garment, name, note, or contribution time. Current wardrobe add, edit, and detail screens do not submit new counts. Deleting an account or a garment does not remove a count that was already stored, and those rows are not erased or backfilled. Personal garment rows stay private | No |
| Demo wardrobe | Sample clothes beside personal clothes | Same tables, `isDemo: true`, names prefixed `Demo –` | The server sets `isDemo`. Clients cannot set or clear it. Demo rows can be removed without deleting personal garments | No |
| Saved places and routes | Reusable start, finish, and waypoints | `Place`, `Route`, `RouteWaypoint` | Cascade on account deletion. Deleting a route keeps historical plans with `routeId` set null and the waypoint snapshot left in place | Place search text and selected coordinates go to HeiGIT Pelias. Saved waypoint coordinates go to OpenRouteService when routing is configured. Preview geometry is not stored |
| Activity plan | The planned departure and the waypoint snapshot | `ActivityPlan.snapshotJson`, `routeAnalysisJson` | Cascade on account deletion. The snapshot is waypoints and preferences, not a GPS trace or a provider polyline | No, beyond the provider calls made while planning |
| Weather cache | Reuse a forecast for about 15 minutes | `WeatherCache`, keyed by provider and coordinates rounded to 0.001°, plus altitude and hour when present | Rows are ignored after `validUntil`. The next cache write deletes expired rows. The cache is shared and is not a per-user history. Stored point coordinates use that same 0.001° precision. A cache hit returns the caller's own sample coordinate. Stored MET series keep time, temperature, wind speed, precipitation probability, precipitation amount, and symbol | MET Norway receives the sample coordinate and ground altitude the planner already uses. Kartverket receives elevation sample coordinates. Those calls are required for the current forecast |
| Recommendation and feedback | What was suggested and how the ride felt | `Recommendation`, `RecommendationItem`, `ActivityLog`, `ActivityFeedback`, `BodyAreaFeedback`, `PersonalOffset` | Cascade on account deletion, directly or through the plan and log | No |
| Connected Strava account | Optional activity connection | Encrypted access and refresh tokens, display name, scopes, username, country | Disconnect deletes the local row and attempts Strava deauthorize. Account deletion removes the local row by cascade and does not call Strava | Strava receives the OAuth code and later the bearer token for the athlete call. City is not stored |
| Trail and resort directories | Find a trail or resort | Process memory for trail collections. No user id | At most 32 trail cells, refreshed at most every 24 hours. Failure logs include age, not coordinates | Geonorge Turrutebasen and Fnugg receive the search area or resort query |
| Mobile session | Stay signed in | Access token in `FlutterSecureStorage` | Logout deletes the token | The token is sent only to the RideWear API |

Production API logs that were inspected do not include passwords, reset tokens, API keys, or waypoint coordinates. Unexpected errors log the error name and return a fixed message. MET failures log a fixed sentence. A failed ski-trail refresh logs age, not the map cell.

### Gaps left in place

- `OAuthState` still has no foreign key. Deletion is application code. A schema change was not made.
- Account deletion does not call Strava deauthorize. Disconnect does. Adding that call inside deletion was not guessed here, because a failed provider call must not decide whether the local account can be removed.
- Expired weather-cache rows remain until a later cache write. There is no separate retention job.
- Activity-plan snapshots remain after the saved route is deleted. That is existing product behavior: the plan keeps the waypoints it was made from.
- MET and Kartverket still receive the sample coordinates the product already sends. Rounding those provider requests would change which forecast or elevation point is requested, so it was not changed.
- There is no analytics SDK and no advertising SDK in this change.

### Shared catalogue estimates

Wardrobe add, edit, and detail screens no longer show “Share this rating” / “Del denne vurderingen”, and saving or editing a garment does not submit a shared rating. A warmth, wind, or water change stays on that rider’s private garment.

Counts already stored for a curated brand and product model remain. RideWear does not delete catalogue tables, erase those aggregates, or backfill contributions from existing garments. A stored row still holds only how many times each score from 1 to 5 was submitted for that product identity. It does not include a user id, garment id, email, free-text garment name, notes, route, weather, location, IP address, or a contribution timestamp. Deleting an account or a garment does not remove a count that was already stored.

Those existing counts can still be offered as a starting estimate when someone adds a matching product and leaves a tier untouched. Automatic defaults, demo clothes, catalogue seeds, and copied values are not new counts. With five or more stored counts for one metric, the estimate drops one lowest score and one highest score, then averages the rest. That average is a snapshot default for a new garment only. It is labeled as an estimate, and the number shown is a count of contributions, not of different people. Trimming extremes is not fraud resistance and does not prove the ratings came from different people. This section describes previously collected aggregates and the current wardrobe flow. It is not a GDPR compliance claim, and it does not say the historical counts were removed.
