# RideWear real routing v1

## Feature

Road-following route preview and place search go through the NestJS API to HeiGIT OpenRouteService (`https://api.heigit.org/openrouteservice/`) and Pelias (`https://api.heigit.org/pelias/v1`). The schematic Flutter preview draws that driving geometry. Activity plans use provider road distance and duration when ORS succeeds.

The route is **driving-car geometry**. It is not motorcycle-optimized, not turn-by-turn, and not live rerouting.

## Files changed

- API: `apps/api/src/routing/ors-routing.adapter.ts`, `ors-geocoding.service.ts`, `ors.http.ts`, `ors.constants.ts`, `plan-with-routing.ts`, `routing.module.ts`, `location.controller.ts`, `dto/location.dto.ts`, plus specs
- Planning: `apps/api/src/routes/routes.service.ts`, `routes.module.ts`, `routes-provider-plan.spec.ts`
- Config: `apps/api/.env.example` (`ROUTING_PROVIDER=ors`, `ORS_API_KEY=`)
- Flutter: `api_route_geometry_service.dart`, `api_location_search_service.dart`, `location_services.dart`, `main.dart`, planner / route editor / `RouteMapPreview`, en/nb copy
- Docs: `PRIVACY_ARCHITECTURE.md`, `ARCHITECTURE.md`, `PROJECT_PLAN.md`, `DEVELOPMENT_NOTES.md`, `apps/mobile/README.md`

## Architecture decisions

- Flutter → RideWear API → HeiGIT. `ORS_API_KEY` stays on the server. The deprecated `api.openrouteservice.org` host is rejected.
- `RoutingPort` / `RouteAnalysis` stay provider-neutral. `OpenRouteServiceRoutingAdapter` is used when `ROUTING_PROVIDER=ors` and the key is set. `NullRoutingAdapter` remains the fallback for tests and outages.
- `avoidMotorways` maps to ORS `avoid_features: ["highways"]`. Profile is always `driving-car`.
- Full road polylines are returned only from `POST /location/route-preview`. `ActivityPlan.routeAnalysisJson` stores waypoint endpoints, distance, duration, and travel segments. No database migration.
- Place search: `GET /location/places` and `POST /location/places/resolve`. Flutter no longer needs `GOOGLE_MAPS_API_KEY` for normal search or preview. No basemap package.
- Unavailable routing returns `503` `ROUTING_UNAVAILABLE`. Planning then keeps the existing duration hint. Logs record status only (no API key, search text, or coordinates).

## Tests / build

- `apps/api`: `npm test` — 15 suites, 102 tests, passed. `npm run build` — passed.
- `apps/mobile`: `flutter analyze` — no issues. `flutter test` — 54 tests, passed.

## PR / commit

- Branch: `feature/ors-routing-v1` from `dev_test` (`310dc77`)
- Commit: `883bb55` — feat(routing): add HeiGIT road-following routes behind the API
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/21 into `dev_test` only. Not merged to `dev` or `main`.

## Required manual configuration

On the API host:

```bash
ROUTING_PROVIDER=ors
ORS_API_KEY=<HeiGIT key>
```

Restart the API. Sign in on the app and preview a route with at least two places. Confirm the line follows roads and the notice says the geometry is driving, not motorcycle-optimized.

## Still needs attention

- No live HeiGIT call was made in CI; mapping is covered with fixtures. Confirm a real Norway route after the key is set.
- Weather is still sampled at saved waypoints, not along the polyline.
- Turn-by-turn navigation and live rerouting are not implemented.
- The old Google Routes client remains in the tree for polyline-decode tests. It is not the default path.
