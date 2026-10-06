# SECURITY-HARDENING-001

## Task

`SECURITY-HARDENING-001`, generation 38, authorized from idle after generation 37 was recovered without consuming the ID. This run did not write a claim commit. The validated `next-task.md` token stayed the ownership record until this branch's final control state.

- Branch: `feature/security-hardening-001`
- Implementation commit: `b911a18ba7ff0fc081fd9862acd6541117b1d0fe`
- PR: into `dev_test` only. Not merged to `dev` or `main`.

## Result

Low-risk fixes on the existing Flutter and NestJS boundaries. No new identity provider, paid service, schema migration, or auth rewrite.

- Production refuses a missing, short, or known example `JWT_SECRET`. Local and test environments keep the existing dev fallback. Access tokens are signed and verified as HS256 only.
- `demo:` OAuth tokens stay available outside production and cannot be enabled by `ALLOW_DEMO_OAUTH` when `NODE_ENV` is production.
- Login compares a dummy bcrypt hash when the account has no local password, and the unknown-email error stays `INVALID_CREDENTIALS`.
- Login, register, forgot-password, and OAuth bodies reject oversized fields before they reach bcrypt or provider calls.
- Auth routes allow 20 attempts per 15 minutes per direct socket address. The limiter is in-memory per process, off when `NODE_ENV` is `test` or `AUTH_RATE_LIMIT=off`, and does not trust `X-Forwarded-For`.
- CORS no longer reflects any origin. Requests without `Origin` still pass for the native app. Production browsers must match `CORS_ORIGINS`. Other environments also allow `localhost` and `127.0.0.1`.
- JSON responses set nosniff, frame denial, a locked-down content security policy, and HSTS only in production. Unexpected errors return `Internal server error` and the log records the error name only.
- Feedback can store a `routeId` only when that route belongs to the same user. A foreign id is `ROUTE_NOT_OWNED` and is not written.
- MET failure logs no longer include coordinates.
- `proxy-addr` is 2.0.8, inside the existing Express range, for GHSA-jqcg-44mw-7w3h. Remaining npm audit findings are moderate Jest and js-yaml issues in the test toolchain, not the API runtime.
- Release Android builds disable cleartext and Android backup. Debug and profile builds still allow cleartext for the local HTTP API. iOS keeps local networking and does not allow arbitrary loads.
- The session token uses Keychain accessibility `first_unlock_this_device` with iCloud sync off. Server secrets are not packaged in the Flutter app; AdMob values in git are Google's public test ids.

## Checks

API, in `apps/api`:

- `npx jest` — 49 suites, 321 tests passed
- `npm run build` — passed

Flutter, in `apps/mobile`:

- `flutter analyze` — no issues
- `flutter test` — 150 tests passed

Android, iOS, and live providers were not run. CI smoke was not re-run here. The generation-36 report already records the pre-existing `seed-demo` activity-parameter failure.

## Follow-ups

These need a product or architecture decision, so they are not queued from this run:

- Access tokens stay valid until expiry after password change, reset, or logout. Revoking them needs a token version or denylist, which is a schema change.
- The auth rate limit is per API process. A shared lockout across instances needs a store this repository does not have.
- `routes.get` still returns 403 when the route exists for another user and 404 when it does not. The body is not returned. Changing that status would change the existing route contract.
- Password reset and OAuth state rows are not swept on a schedule. They expire on use.
- Jest's moderate `js-yaml` advisory is confined to the test runner.

## Final control state

`SECURITY-HARDENING-001` is completed and appended once to `consumed.md`. Automatic promotion authorizes `MC-BASIC-LAYERS-001` at generation 39. This run must not execute generation 39.
