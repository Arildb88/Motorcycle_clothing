# UX-POLISH-001

## Task

`UX-POLISH-001`, generation 31, authorized by the automatic final control update that completed `XC-TRAIL-SYNC-001`. The parent tip held that token at generation 30 with `XC-TRAIL-SYNC-001` active. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/ux-polish-001`
- Implementation commit: `d51e2952a5d8e3bfbb3818d727ace1c2ad85c515`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/61 into `dev_test` only. Not merged to `dev` or `main`.

## Result

Focused MVP polish. Navigation, architecture, and visual identity are unchanged.

- A failed profile load stays on screen with the localized error and a retry button. It no longer leaves a spinner after the request fails.
- A failed wardrobe load offers the same retry. Sharing and garment checkboxes use the standard touch height.
- Strava sync and disconnect sit on their own row so the labels can wrap on a narrow screen.
- Ride analysis uses the profile temperature and wind units, including mountain site lines. Metric display stays the default when no preference is loaded.
- Alpine, snowboard, and cross-country planners no longer show the road heading "Route options" or the commute hint. The saved name field is labeled "Name" / "Navn" for those activities. Road activities still say "Route name" and "e.g. Work commute".
- Departure and arrival share the row width, without a second selected icon, so a 320px-wide planner does not overflow.
- Filled, outlined, and text buttons keep a 48dp minimum. Spinners on dark filled buttons use the light foreground color on login, password, reset, and analyze.
- Login validation stays on the form. Stacked auth and garment fields keep the floating label clear of the outline above.
- Norwegian imperial labels say "Engelske mil" and "Engelske mil (mi)".

## Checks

Flutter, in `apps/mobile`:

- `flutter analyze` — no issues
- `flutter test` — 139 tests passed

Android, iOS, and a physical or emulator visual pass were not run. Spacing, wrapping, and contrast on a real device still need a human look.

## Architecture / config

Flutter -> NestJS -> provider stays the same. Secrets stay server-side. No new provider, dependency, schema migration, or paid service. `dev` and `main` were not modified.

## Final control state

Promotion is automatic. The first queued unconsumed item is authorized. This run does not execute it.

- `UX-POLISH-001` completed and appended once to `consumed.md`
- `DEPARTURE-COMPARE-001` is active
- `active_id: DEPARTURE-COMPARE-001`
- `promotion: automatic` unchanged
- `handoff_generation: 32`
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `DEPARTURE-COMPARE-001`, Generation 32, Handoff-From `UX-POLISH-001`, Authorization `authorized`

## Remaining

Device and emulator visual review was not run. `DEPARTURE-COMPARE-001` is authorized for a later run. This run stops after merge.
