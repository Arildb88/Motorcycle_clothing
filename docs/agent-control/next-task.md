# Authorized RideWear Task
## Type: BUG_FIX
## ID: PLACE-SEARCH-AVAILABILITY-001
## Generation: 47
## Handoff-From: REAL-DATA-ONLY-001
## Authorization: authorized
## Promoted: 2026-10-07T20:56:59Z
## Task: Diagnose and fix temporarily unavailable place search

Arild explicitly authorized this queued task in chat on 2026-10-07. Investigate the reported Norwegian UI error "Stedsøk er midlertidig utilgjengelig" and restore working place search through the existing Flutter -> NestJS -> configured provider integration. The cause is unverified; do not assume this feature is unimplemented.

Scope:
- Trace search from all relevant route/planner fields through mobile requests, API configuration and provider adapter. Check missing/invalid server configuration, current documented endpoint/auth usage, timeout/rate-limit/error mapping, Unicode and encoding, and whether a stale/incorrect API base URL or session failure is being masked as a provider outage.
- Correct repository defects within existing architecture. No new provider, dependency, schema change, paid service, deployment or credential creation/rotation. Never print or commit secrets. Provider keys stay server-side.
- If the cause is missing/invalid operator credentials or inaccessible external service, document the exact environment variable/setup needed and a sanitized diagnostic, distinguish that from a code defect, and follow the queue blocker rule when required verification cannot be completed. Do not invent a working key or claim a live success from mocks.
- Retain legitimate unavailable/empty-result states. Distinguish no matches, temporarily unavailable provider, and configuration problems safely; no internal stack trace or credential exposure in UI.
- Preserve latest-query result handling, Unicode Norwegian names, selected coordinates/labels, and single-location/multi-stop/commute flows. Offer clear localized nb/en retry behavior.
- Update relevant local-start/configuration documentation only as needed to prevent recurrence.

Concrete selection failure reported by Arild on 2026-10-07:
- Concrete fix branch prepared by ChatGPT: fix/place-selection-state (commit 0c8cc3d). Draft PR targets dev_test. Review/cherry-pick the focused state/error-handling fixes rather than duplicate them; Flutter/Dart were unavailable so checks remain pending. This is not a verified reproduction or full resolution of the user's live Arendal failure. Run focused widget checks before merge; preserve this task's final control close.

- Searching "arendal" returns suggestions, but tapping a result does not select it. Reproduce start/destination/stop selection with the keyboard open and closed. This report does not establish a permissions problem.
- Code inspection: autocomplete is GET /location/places -> Pelias /autocomplete; selection is POST /location/places/resolve -> Pelias /place?ids=... using the same server key. Autocomplete already has coordinates server-side but its API response currently omits them. Check the actual resolve provider status/empty response before attributing this to key scope.
- In PlaceSearchField._select, only LocationProviderException is caught. Unexpected decode/network exceptions can escape without a visible error; add safe localized error handling with retry and no raw exception disclosure.
- Inspect the 200ms focus-loss hide timer, suggestion pointer/tap handling, didUpdateWidget request invalidation and _clear (which currently does not invalidate in-flight requests or reset loading/error state). Reproduce before choosing a fix; do not assert a blur race from inspection alone.
- Prevent stale resolve completion from applying after clear/edit/swap; ensure failed/cancelled resolve releases loading and keeps input usable. Verify selection callback actually updates canonical coordinates.
- Add sanitized operation-specific diagnostics distinguishing autocomplete versus resolve and provider HTTP status, without keys/search strings/coordinates. Avoid collecting new user location logs.
- Focused checks only: successful Arendal fixture selection, provider resolve rejection/empty result, unexpected exception, and clear/edit during pending resolve. Run Flutter analyze and affected tests once, API build/tests only if API changes.

Verification:
- Add focused regression tests for identified cause, missing configuration, provider timeout/error and successful response mapping, Norwegian place names/encoding, and search UI retry/empty states where touched.
- Run relevant API tests and production build, Flutter analyze and relevant Flutter tests for changed mobile code.
- Attempt a live smoke search only when existing authorized configuration and network permit, e.g. Arendal and Kristiansand; otherwise explicitly report what was and was not verified.
- Work from latest dev_test on a dedicated fix branch. PR targets dev_test only; merge after required checks pass. Keep dev/main untouched.
- Follow existing authorization, completion/blocker and report rules. Stop after this task.
