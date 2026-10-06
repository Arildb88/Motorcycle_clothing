# PRIVACY-DATA-001

## Task

`PRIVACY-DATA-001`, generation 40, authorized by the automatic final control update that completed `MC-BASIC-LAYERS-001`. This run did not write a claim commit. The validated `next-task.md` token stayed the ownership record until this branch's final control state.

- Branch: `feature/privacy-data-001`
- Implementation commit: `8786a949e66d293b2252222265cf18561ab3f5b7`
- PR: pending, into `dev_test` only. Not merged to `dev` or `main`.

## Result

Engineering privacy-readiness pass. This is not a GDPR or legal-compliance claim.

- `PRIVACY_ARCHITECTURE.md` section 8 inventories account, auth, profile, wardrobe, routes, plans, weather cache, feedback, Strava, trail and resort lookups, and the mobile session. Each row names purpose, storage, retention, and whether data leaves RideWear.
- New access tokens carry only the user id. The login response still returns email, and `/users/me` still loads the profile. Older tokens that already contain email keep working until they expire.
- Shared weather-cache points store coordinates at the existing 0.001° cache-key precision. A cache hit returns the caller's own sample coordinate. Stored MET series keep time, temperature, wind speed, precipitation probability, precipitation amount, and symbol. Humidity, pressure, cloud, wind direction, and thunder probability are not stored. Expired cache rows are deleted on the next cache write.
- MET and Kartverket still receive the sample coordinates the planner already sends. Rounding those requests would change the forecast or elevation point, so it was not changed.
- Expired password-reset hashes and expired OAuth PKCE rows are deleted when a reset is requested or a login/Strava connect starts.
- Account deletion deletes `OAuthState` rows for that user. Those rows have no foreign key, so the user cascade did not remove them. No schema migration was added.
- Strava metadata keeps username and country. City is not stored. Account deletion still does not call Strava deauthorize; disconnect does. A failed provider call must not decide whether the local account can be removed.
- Ski-trail refresh failures log age, not the map cell.
- Demo garments stay `isDemo: true` with `Demo –` names. Clients still cannot set or clear `isDemo`.

## Privacy / data-flow readiness

RideWear stores account, profile, optional home coordinates, wardrobe, saved places and route waypoints, plan snapshots, recommendations, feedback, personal offsets, and encrypted Strava tokens. Password reset secrets are stored as hashes. The mobile access token is in secure storage. Place search and routing go to HeiGIT when configured. Forecasts go to MET Norway. Elevation goes to Kartverket. Resorts go to Fnugg. Ski trails go to Geonorge. Preview geometry is not persisted. Production logs that were inspected do not include passwords, reset tokens, API keys, or waypoint coordinates. Gaps that remain: no foreign key on `OAuthState`, no Strava deauthorize during account deletion, weather-cache cleanup only on the next write, and plan snapshots kept after a route is deleted.

## Checks

API, in `apps/api`:

- `npx jest` — 52 suites, 334 tests passed
- `npx tsc --noEmit -p tsconfig.build.json` — passed
- `npm run build` — passed

Flutter files were not changed. Android, iOS, live providers, and the local HTTP smoke were not run. Postgres is not available in this environment. `api-ci` runs the unit suite, the build, and the smoke script.

## Final control state

`PRIVACY-DATA-001` is completed and appended once to `consumed.md`. Automatic promotion authorizes `SOCIAL-AUTH-RESEARCH-001` at generation 41. This run must not execute generation 41.
