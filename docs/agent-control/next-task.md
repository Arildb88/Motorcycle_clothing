# Authorized RideWear Task

## Type: IMPLEMENTATION

## Task: Altitude-aware route weather foundation

Implement the first evidence-backed follow-up from the weather/geo research: obtain reliable ground elevation for route weather sample coordinates and pass that altitude to MET Locationforecast so temperature/weather is evaluated at the sample point's terrain height.

Read first:
- `docs/agent-control/guardrails.md`
- `docs/research/WEATHER_DATA_QUALITY.md`
- `docs/architecture/GEO_DATA_STRATEGY.md`
- `docs/agent-reports/latest.md`

### Goal

For the existing motorcycle recommendation flow:

road geometry -> route weather samples + ETA -> ground elevation -> MET(lat, lon, altitude, ETA)

Keep the design provider-independent so Cycling, Alpine/Snowboard and Cross-country can reuse elevation later.

### Required investigation before coding

Inspect current `dev_test` and the research documents. Choose the best already-researched free/open Norway-first elevation source/approach that is legally and technically suitable for this implementation.

If the research does not support a sufficiently clear provider/endpoint/licensing choice, STOP and report the exact decision/evidence still needed. Do not invent a provider.

### Implementation requirements

If the prerequisite is satisfied:

- Introduce/extend a provider-independent server-side elevation abstraction/port rather than coupling recommendation logic to a vendor.
- Implement the smallest production adapter needed for the chosen elevation source.
- Keep all provider access server-side.
- Enrich existing route weather samples with ground altitude before MET lookup.
- Pass altitude to MET Locationforecast using the documented parameter/format.
- Preserve ETA-based forecast selection.
- Preserve safe fallback: if elevation lookup fails/unavailable, weather recommendations must still work using the existing lat/lon behavior rather than failing the whole recommendation.
- Use bounded batching/caching where appropriate; do not create one uncontrolled external request per dense geometry vertex.
- Dense route geometry remains ephemeral and must not be persisted.
- Add focused tests for altitude propagation, fallback, caching/batching behavior where applicable, and unchanged ETA behavior.
- Keep existing provider-neutral domain boundaries.

### Explicitly out of scope

- No Cycling/Alpine/XC implementation yet.
- No ski resort UI/data integration.
- No paid provider.
- No ads/ad SDK.
- No DB/schema migration.
- No dependency upgrades unless absolutely required by the selected official API; if a new dependency appears necessary, STOP and report rather than adding it.
- No routing-provider change.
- No unrelated UI changes.
- No live traffic/navigation/rerouting.
- Do not modify `dev` or `main`.

### Verification

Run:
- relevant focused API tests
- `npm test`
- `npm run build`
- existing API smoke test if applicable

If Flutter code is unexpectedly required, STOP and report why before changing it. This task should be server-side.

All required checks must pass before merge.

### Completion

Follow `docs/agent-control/guardrails.md`.

Use a `feature/*` or `fix/*` branch from latest `dev_test`.
PR and merge successful work only to `dev_test`.
Update `docs/agent-reports/latest.md` with:
- selected elevation source and why
- licensing/attribution/config implications
- branch/commit/PR
- files changed
- tests/build/smoke results
- fallback behavior
- manual validation recommended
- remaining issues

Then STOP. Do not begin Cycling, skiing, ads, or another task.
