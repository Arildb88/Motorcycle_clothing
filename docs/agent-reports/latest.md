# FNUGG-ATTRIBUTION-001

## Task

`FNUGG-ATTRIBUTION-001`, generation 29, authorized by the automatic final control update that completed `TEST-COVERAGE-001`. The parent tip held the unclaimed from-idle token for `TEST-COVERAGE-001` at generation 28. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/fnugg-attribution-001`
- Implementation commit: `54bfc10def7828e855577f4f3f0d149c3bead010`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/59 into `dev_test` only. Not merged to `dev` or `main`.

## Result

Resort names, coordinates, and straight-line distance that come from Fnugg now carry a readable attribution next to that data.

The credit uses 14px body text, underlined, with a 48dp target. It is not microtext. The directory credit says resort information comes from Fnugg.no and links to https://fnugg.no. Each resort row, and the selected resort, links to `https://fnugg.no` plus the documented `site_path` when that path is a single slug such as `/trysil/` or `/al/`. Any other path or host falls back to https://fnugg.no.

Terms checked on 2026-10-02 at https://fnugg.no/artikler/api/ and https://api.fnugg.no/docs/v1. Those pages require a visible statement that the information comes from fnugg.no, at the same size as surrounding text, next to the data, and linked to the source page. The weather-and-conditions sentence that names Yr, Meteorologisk institutt, and NRK applies to vær- og føredata. RideWear does not request or display Fnugg weather, snow, lifts, or conditions. That sentence is not shown. RideWear's own MET forecast and Kartverket elevation credit stay separate and are not labeled as Fnugg data.

The Fnugg logo is not embedded. The terms allow text instead of the logo, and they also say the logo must not be used as part of the service.

## Checks

API, in `apps/api`:

- `npx jest src/resorts/fnugg-resort.adapter.spec.ts` — 7 tests passed

Flutter 3.47.6 / Dart 3.13.5, in `apps/mobile`:

- `flutter analyze` — no issues
- `flutter test` — 132 tests passed

Android, iOS, and live providers were not run. A live read of `site_path` confirmed pages such as https://fnugg.no/trysil/ and https://fnugg.no/al/ before the mapping was written. Those calls were not part of the automated suite.

## Architecture / config

Flutter -> NestJS -> provider stays the same. Secrets stay server-side. No new provider, schema migration, or paid service. `url_launcher` 6.3.2 was already in the lockfile and is now a direct dependency so the attribution link can open. Its version did not change. Android may query an https VIEW intent so that link can open. `dev` and `main` were not modified.

The resort contract adds `sourceUrl`. Weather, lifts, and resort copy are still not mapped.

## Final control state

Promotion is automatic. The first queued unconsumed item is authorized. This run does not execute it.

- `FNUGG-ATTRIBUTION-001` completed and appended once to `consumed.md`
- `XC-TRAIL-SYNC-001` is active
- `active_id: XC-TRAIL-SYNC-001`
- `promotion: automatic` unchanged
- `handoff_generation: 30`
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `XC-TRAIL-SYNC-001`, Generation 30, Handoff-From `FNUGG-ATTRIBUTION-001`, Authorization `authorized`

## Remaining

Device and live-provider checks were not run. `XC-TRAIL-SYNC-001` is authorized for a later run. This run stops after merge.
