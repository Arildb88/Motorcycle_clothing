# Authorized RideWear Task
## Type: VALIDATION_AND_FIX
## ID: STABILIZATION-001
## Generation: 23
## Handoff-From: DEPENDENCY-MAINTENANCE-001
## Authorization: authorized
## Promoted: 2026-10-02T19:08:30Z
## Task: Run consolidated RideWear regression and fix in-scope defects

After the queued feature and dependency work, perform one broad stabilization pass over the MVP instead of another feature expansion.

Coverage:
- Authentication/profile/password/logout.
- Wardrobe, personal garments and demo garments.
- Motorcycle and cycling route planning, place search, Norwegian Unicode, current position, swap, waypoints, route preview/save/analyze and weather/elevation integration.
- Alpine skiing and snowboarding resort discovery/selection and recommendation flow.
- Cross-country nearby-trail/manual-route flows and recommendation flow.
- Empty/error/provider-unavailable states and Norwegian localization.
- Verify hiking remains unavailable unless a separately authorized engine exists.
- Check important touch targets/layout regressions found during earlier emulator testing.

Fix policy:
- Fix reproducible defects within existing architecture and dependency set.
- Prefer root-cause fixes over hiding errors.
- Do not add new product features, providers, schema migrations, paid services or broad architecture changes.
- If a defect requires one of those decisions, document it as blocked/remaining rather than inventing the change.

Validation:
- Run the broadest practical API and Flutter automated suites, Flutter analyze, API build/type checks and relevant Prisma validation.
- Run Android build/emulator checks where the available environment supports them.
- Distinguish deterministic automated checks from live provider/device checks.
- Produce a concise remaining-issues list suitable for the next human manual regression pass.
- Do not claim iOS validation from Windows.

Keep dev and main untouched. Follow queue rules.
