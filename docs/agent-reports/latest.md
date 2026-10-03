# PERFORMANCE-001

## Task

`PERFORMANCE-001`, generation 36, re-authorized from idle after the abandoned generation-35 Cursor run. ChatGPT performed this implementation after Arild explicitly approved takeover while the Cursor quota was exhausted.

- Branch: `feature/performance-001-chatgpt`
- Implementation commits: `cbadbf4e2424983226098b85ec2b1ca2d292cb42`, `c93c112839286a8b570cd91b5d0919b93728697b`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/66 into `dev_test` only.

## Evidence and result

`WeatherService.forRoutePoints` and `forRouteSamples` awaited independent weather/cache lookups one at a time. Route weather therefore paid the sum of sample latency even though samples have no ordering dependency. Existing route sampling is bounded, but the important path can still contain several independent provider/cache lookups.

The two paths now start those independent lookups with `Promise.all`. Returned point order is unchanged, so summary and route semantics are preserved. No cache infrastructure, provider, dependency, schema, or Flutter behavior changed.

A regression test holds three MET responses unresolved and verifies all three provider calls have started before any response is released. It then releases them and verifies the returned route order remains 58, 59, 60. This demonstrates the latency shape changed from serial accumulation toward the slowest independent sample.

## Checks

GitHub Actions `api-ci` run 37087279095 on PR #66:
- `npm ci`: passed
- `prisma generate`: passed
- `npm test`: passed, including the new concurrency regression
- `npm run build`: passed
- smoke: failed at `POST /api/wardrobe/actions/seed-demo` with HTTP 400 `Invalid activity:`

The smoke failure is not introduced by this performance branch: generation-34 parent commit `751f5e1efc7219811f443a57eea1b26906c60bca` has the same API-CI pattern (unit/build pass, smoke fail). Fixing that unrelated smoke contract is outside PERFORMANCE-001 scope.

No Flutter files changed. Flutter analyze was not rerun in this environment; the immediately preceding generation-34 report records a clean Flutter analyze baseline.

## Deferred

- Departure comparison still performs some cache writes sequentially. It was left unchanged because the current task requires evidence before broader optimization and its provider-series memoization already prevents duplicate MET network requests.
- Mobile search already has debounce and stale-request generation guards, so no speculative rewrite was made.

## Final control state

`PERFORMANCE-001` is completed and appended once to `consumed.md`. Automatic promotion authorizes `SECURITY-HARDENING-001` at generation 37. This run must not execute generation 37.
