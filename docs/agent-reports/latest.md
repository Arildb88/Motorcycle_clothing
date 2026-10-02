# TEST-COVERAGE-001

## Task

`TEST-COVERAGE-001`, generation 28, authorized from idle after generation 27 was recovered without being consumed. The parent tip was idle: `handoff_state: idle`, `active_id: none`, next-task ID `none`, `handoff_generation: 27`. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/test-coverage-001`
- Implementation commit: `a47f401cf871e53441b221f275ce01fb5c9edb5b`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/58 into `dev_test` only. Not merged to `dev` or `main`.

## Result

Tests were added only where important MVP behavior was still unprotected.

Profile reads omit the password hash. A partial profile update keeps the saved activity and motorcycle setup. Alpine, snowboard, and cross-country are rejected as stored profile defaults. Onboarding accepts only the profile activity list. Deleting an account removes that user and leaves another account in place.

Login, a stored token, and a failed session restore stay consistent. Logout clears the token and the user. A password change keeps the session. The change-password form stays put for an empty current password, a short new password, or a mismatched confirmation. Sign-out and account deletion clear the session. A Norwegian display name is saved unchanged.

Unknown or cross-activity planner values are treated as assumed defaults. `hard` is not an alpine exposure mode, and `lift` is not a cycling intensity. Classic and skate stay cross-country styles.

An empty MET timeseries, or a payload with no temperature, uses the same forecast fallback as a failed MET request and still keeps a known height. A reported temperature of 0 °C stays 0 °C.

Wardrobe and demo coexistence, resort and trail discovery, and Norwegian place search were already covered and were not duplicated.

## Checks

API, in `apps/api`:

- `npm test` — 36 suites, 258 tests passed

Flutter 3.47.6 / Dart 3.13.5, in `apps/mobile`:

- `flutter analyze` — no issues
- `flutter test` — 127 tests passed

Android, iOS, and live providers were not run.

## Architecture / config

Flutter -> NestJS -> provider stays the same. Secrets stay server-side. No new provider, dependency, schema migration, or paid service. `dev` and `main` were not modified.

The MET empty-payload path now follows the existing failure fallback. It does not add a provider or change a successful forecast.

## Final control state

Promotion is automatic. The first queued unconsumed item is authorized. This run does not execute it.

- `TEST-COVERAGE-001` completed and appended once to `consumed.md`
- `FNUGG-ATTRIBUTION-001` is active
- `active_id: FNUGG-ATTRIBUTION-001`
- `promotion: automatic` unchanged
- `handoff_generation: 29`
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `FNUGG-ATTRIBUTION-001`, Generation 29, Handoff-From `TEST-COVERAGE-001`, Authorization `authorized`

## Remaining

Device and live-provider checks were not run. `FNUGG-ATTRIBUTION-001` is authorized for a later run. This run stops after merge.
