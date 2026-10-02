# Authorized RideWear Task
## Type: PRODUCT_SIMPLIFICATION
## ID: ALPINE-SNOWBOARD-UNIFY-001
## Generation: 25
## Handoff-From: STABILIZATION-001
## Authorization: authorized
## Promoted: 2026-10-02T19:41:19Z
## Task: Present alpine skiing and snowboarding as one shared resort activity flow while preserving useful internal distinctions

Simplify the RideWear user experience so alpine skiing and snowboarding no longer appear as unnecessarily separate planning categories.

Product behavior:
- Present one shared user-facing activity entry for resort snow sports, preferably localized as "Alpint & snowboard" / "Alpine & snowboard" where appropriate.
- Use the same resort discovery, selected resort, time, MET weather/elevation and recommendation planning flow for both.
- Do not duplicate planner screens or resort-provider calls merely to distinguish skiing from snowboarding.
- Preserve the existing Fnugg-backed resort discovery and attribution.
- Preserve current personal thermal-profile behavior so user feedback/personalization can account for whether a person tends to run warmer or colder.
- Do not encode an unsupported blanket rule that snowboard is always warmer or more strenuous than alpine skiing.

Internal compatibility:
- Do not remove or destructively migrate existing ALPINE_SKIING / SNOWBOARDING domain values merely for UI simplification.
- Keep existing stored/API data compatible.
- If an existing internal distinction can be retained cheaply for future recommendation tuning/analytics, retain it without forcing the user through two separate planner categories.
- Do not add a schema migration for this simplification.

Scope:
- Update home/activity selection and relevant labels/navigation so users see one coherent resort-snow-sports choice.
- Reuse existing alpine/snowboard recommendation capabilities rather than adding a new recommendation engine.
- Ensure hiking remains unavailable and cross-country skiing remains a separate activity.
- Preserve Norwegian Unicode/localization.
- Add/update focused Flutter tests for the unified entry and shared planner behavior.
- Run Flutter analyze and relevant tests; run API tests only if API behavior changes.
- No new provider, paid service, dependency, schema migration or broad architecture change.

Keep dev and main untouched. Follow queue rules.
