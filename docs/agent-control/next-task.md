# Authorized RideWear Task
## Type: UX_AND_COMPLIANCE
## ID: FNUGG-ATTRIBUTION-001
## Generation: 29
## Handoff-From: TEST-COVERAGE-001
## Authorization: authorized
## Promoted: 2026-10-02T22:18:00Z
## Task: Add clear Fnugg attribution wherever RideWear presents Fnugg-sourced resort data

Implement attribution for the existing Fnugg integration.

Requirements:
- Verify the current official Fnugg API/terms immediately before implementation and follow the applicable attribution wording/link requirements.
- Wherever user-visible resort/facility/conditions data originates from Fnugg, show a clear but visually unobtrusive attribution in proximity to that data.
- Attribution must not be hidden as microtext or made materially less readable than surrounding secondary text.
- Link Fnugg attribution to the relevant Fnugg destination when the integration provides a reliable relevant URL; otherwise use the official Fnugg destination allowed by the terms.
- Keep RideWear-fetched MET weather clearly distinct from Fnugg-sourced data; do not label RideWear's direct MET data as Fnugg data.
- If RideWear displays Fnugg fields whose terms require additional weather/conditions attribution (for example Yr/Meteorologisk institutt/NRK), implement the currently required wording rather than guessing.
- Preserve provider-neutral backend boundaries and existing alpine/snowboard behavior.
- Add focused Flutter tests for attribution visibility and relevant link/conditional behavior.
- Run Flutter analyze/tests and API tests if server/provider mapping changes.
- No new provider, paid service, schema migration or unrelated redesign.
- Keep dev and main untouched. Follow queue rules.
