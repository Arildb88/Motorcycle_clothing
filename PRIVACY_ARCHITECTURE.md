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
