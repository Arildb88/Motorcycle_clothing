# DEMO-WARDROBE-ACTIVITY-001

## Task

`DEMO-WARDROBE-ACTIVITY-001`, generation 21, authorized by the automatic final control update on `dev_test` from `02015c470b638fcb390c5d6e89fe4e1ce77e57d5` to `293d49fff8edfbfe0d3a4c020f8b7368fbb57cff`. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/demo-wardrobe-activity-001`
- Implementation: `bc47b4fffeb7ded0de698a1dd7733d34749be728`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/53 into `dev_test` only. Not merged to `dev` or `main`.

## Implementation

Demo seeding still adds one idempotent set and leaves personal garments in place. Every demo name stays prefixed with `Demo –`, in English and Norwegian.

The catalog now covers the clothing the existing engines already match:

- Motorcycle keeps the touring shell, liners, mesh jacket, pants, gloves, neck tube, and heated vest, and adds boots, socks, a balaclava, and a rain suit.
- Cycling adds a base layer, vest, vented shell, tights, shorts, gloves, shoe covers, socks, a cap, and a packable rain shell.
- Alpine skiing and snowboarding share the same rows, because that exposure engine already treats them as one clothing family. The rows are base, light and insulated mids, shell, pants, gloves, mittens, socks, a helmet liner, and a neck gaiter.
- Cross-country adds a thin base, vest, shell, tights, light and warmer gloves, socks, and a thin hat.

Hiking is not tagged and is not remapped onto another activity. Alpine and cross-country feet stay socks, because those engines already treat boots as equipment. No new category, component kind, provider, or recommendation engine was added.

## Final control state

Promotion is automatic. The first queued unconsumed item is authorized. This run does not execute it.

- `DEMO-WARDROBE-ACTIVITY-001` completed and appended once to `consumed.md`
- `DEPENDENCY-MAINTENANCE-001` is active
- `active_id: DEPENDENCY-MAINTENANCE-001`
- `promotion: automatic` unchanged
- `handoff_generation: 22`
- `handoff_state: authorized`
- `paused: false`
- `next-task.md`: `DEPENDENCY-MAINTENANCE-001`, Generation 22, Handoff-From `DEMO-WARDROBE-ACTIVITY-001`, Authorization `authorized`

## Checks

Node, in `apps/api`:

- `npx jest src/domain/demo-wardrobe.spec.ts src/domain/enums.spec.ts src/wardrobe/wardrobe.service.spec.ts --runInBand --no-coverage` — 3 suites, 24 tests passed
- `npx eslint src/domain/demo-wardrobe.ts src/domain/demo-wardrobe.spec.ts` — no issues

Flutter was not changed, so Flutter analyze and Flutter tests were not run.

## Architecture / config

Demo garments are still created only by the existing wardrobe seed, with `isDemo: true`. Activity tags use the existing activity values. No schema migration, dependency, paid service, provider, or secret. `dev` and `main` were not modified.

## Remaining

No device check of the wardrobe screen was run. `DEPENDENCY-MAINTENANCE-001` is authorized for a later run. This run stops after merge.
