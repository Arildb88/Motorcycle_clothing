# PERFORMANCE-001

## Task

`PERFORMANCE-001`, generation 35, authorized by the automatic final control update that completed `THERMAL-FEEDBACK-001`. The parent tip held that token at generation 34 with `THERMAL-FEEDBACK-001` active. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/performance-001`
- Implementation commit: `90caa71485103d85edd486449d39e72a1f7c5c40`
- PR: into `dev_test` only. Not merged to `dev` or `main`.

## Result

Measured waste, then removed it without a new cache, provider, dependency, or schema change.

Before the change, three route samples at two places made 3 sequential MET locationforecast calls (`max` in flight was 1). The same place at two hours downloaded the full series twice. After the change those samples make 2 calls, and both places are in flight together. A long alpine session is one download per site instead of one per phase.

- `forRouteSamples` and `forRoutePoints` still return points in request order. A fresh per-hour point cache still wins and does not refetch. An empty or failed MET payload still falls back to the existing mock forecast and is not stored as 0 °C. The series cache key already used by departure comparison stores a successful locationforecast so later hours at that place do not download it again. An in-flight download is shared and dropped when it finishes, including failures, so a miss can be retried.
- Departure comparison starts one series download per distinct place before it reads the hours. Out-of-range departures stay unavailable.
- Motorcycle, cycling, alpine, snowboard, and cross-country start the wardrobe and thermal-offset reads while route geometry and weather are still running. The recommendation result is unchanged. `touchLastUsed` still finishes before the response is returned.
- The planner requests a new road preview only when the resolved stops, the motorway switch, or whether the activity uses a road preview changes. Leave-now, arrival versus departure, session length, and the route name do not.

## Checks

API, focused:

- `weather.service`, `altitude-aware-weather`, `departure-compare`, `cycling-recommend`, `alpine-recommend`, `xc-recommend`, `departure-compare.recommend`, and `activity-foundations` — passed
- `nest build` passed
- `tsc --noEmit` still reports the existing spec-file union errors. The new files do not add one.

Flutter, in `apps/mobile`:

- `flutter analyze` on `ride_planner_screen.dart` and `ride_planner_models.dart` — no issues
- `flutter test test/ride_planner_test.dart` — 15 tests passed

Android, iOS, and a live provider call were not run.

## Architecture / config

Flutter -> NestJS -> provider stays the same. Secrets stay server-side. No new provider, dependency, schema migration, or paid service. `dev` and `main` were not modified.

The 15-minute weather cache and the Kartverket elevation cache were already there. This task did not add another cache.

## Measured change

- Same place, two hours, plus a second place: locationforecast calls 3 → 2. Peak in-flight calls 1 → 2.
- Distinct places in one departure comparison now overlap the same way.
- Cycling wardrobe and thermal-offset reads are issued before route weather resolves.
- Schedule-only planner edits no longer call route preview.

## Deferred

- Search fields already debounce and ignore stale responses. That was left as it is.
- Trail XML parsing, OpenRouteService preview versus the later recommendation route, and a national trail download were not changed. A shared route cache would be new infrastructure.
- Device frames and live MET timing were not run.

## Final control state

Promotion is automatic. The first queued unconsumed item is authorized. This run does not execute it.

- `PERFORMANCE-001` completed and appended once to `consumed.md`
- `SECURITY-HARDENING-001` is active
- `active_id: SECURITY-HARDENING-001`
- `promotion: automatic` unchanged
- `handoff_generation: 36`
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `SECURITY-HARDENING-001`, Generation 36, Handoff-From `PERFORMANCE-001`, Authorization `authorized`

## Remaining

A device pass of the planner was not run. `SECURITY-HARDENING-001` is authorized for a later run. This run stops after merge.
