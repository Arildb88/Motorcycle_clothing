# Authorized RideWear Task
## Type: FEATURE_IMPLEMENTATION
## ID: ALPINE-PLANNER-SIMPLIFY-001
## Generation: 54
## Handoff-From: DEPENDENCY-MAINTENANCE-002
## Authorization: authorized
## Promoted: 2026-10-07T22:55:37Z
## Task: Simplify lift-based alpine and snowboard planner and resort information

Arild explicitly authorized these changes in chat on 2026-10-07.

Requirements:
- On the alpine/snowboard HOME screen remove both the "Alpint eller snøbrett / Alpine or snowboard" selector and the "Hvor du oppholder deg / Exposure" control. Activity choice between alpine skiing and snowboarding belongs only in route/session planning, preserving distinct activity IDs/engines and the selected activity when launching the planner. Do not duplicate these selectors on home.
- Clarification with earlier approved lift-only requirement: remove exposure from home; the planner still defaults to lifts without an unnecessary exposure choice. Keep the alpine/snowboard activity selector in route/session planning. Add a focused home UI regression check for absent controls and correct planner launch state.
- For alpine skiing and snowboarding remove the "Hvor du oppholder deg / Exposure" choice, including walking/uphill selections. Treat these resort sessions as lift-assisted downhill skiing/snowboarding by default. Use the existing lift exposure domain value server-side and mobile-side; do not merely hide the control while retaining a stale walking choice. Existing clients remain compatible where practical. Do not alter cross-country, hiking or cycling semantics.
- Preserve cold exposure during lift rides/queues and descent behavior in the existing alpine engine. No new exposure model or unrelated recommendation tuning.
- Clarify "Øktlengde": intended elapsed time in the ski area, including descents, lift rides and breaks, not a single descent, travel to the resort, or uphill walking time. Inspect current semantics and align input and engine use with this meaning; keep travel departure/arrival and session start distinct. Replace the field LABEL "Øktlengde" itself with Arild’s latest exact wording: "Hvor lenge er du aktiv?" English label: "How long are you active?" This supersedes the earlier helper-text instruction "Hvor lenge skal du være aktiv?"; do not retain Øktlengde as the label or repeat a near-identical question underneath. The input still means elapsed session time including lift rides and breaks; the wording change must not change duration calculation.
- Hide latitude/longitude in user-visible resort result cards and selected-resort information. Keep coordinates internally for selection, weather/elevation and nearby discovery; do not remove stored/API coordinates.
- Remove the redundant "Valgt skianlegg: ..." / "Selected resort: ..." text block and its associated link. Keep the selected resort row/checkmark or equivalent clear selection indicator so the user knows which resort is active. Do not clear the selected resort when hiding this duplicate block. User screenshot on 2026-10-07 shows Hafjell Alpinsenter with 61.24, 10.45 and duplicate Fnugg links: use that screen as the concrete acceptance case; neither those coordinates nor the duplicate selected-resort block/links may be visible. Retain only the single top Fnugg attribution already specified.
- Keep ONE visible attribution above resort results: "Informasjon om skianlegg er hentet fra Fnugg.no", linking to https://fnugg.no. Remove repeated per-result and selected-resort Fnugg.no links on this planner screen. Keep attribution readable and accessible, not hidden. Preserve resort names, selection and weather/elevation functionality. No provider change.

- In the alpine/snowboard result section "Begrensninger og antagelser / Limitations and assumptions", show only the existing notice that no top station was found ("Ingen toppstasjon ble funnet"), and only when that condition actually applies. Remove other assumption/limitation rows from this section. Hide the section when no top-station notice applies. Preserve internal diagnostics and confidence calculations; actual provider failures/unavailable weather still require their separate explicit error states under REAL-DATA-ONLY-001. Localize nb/en without inventing missing-station conditions.

Verification and boundaries:
- Use current Flutter/NestJS architecture and existing localization. No new dependency, schema migration, external provider, paid service or deployment.
- Quota-conscious checks per Arild: Flutter analyze once and focused tests for hidden exposure choice/default lift payload, helper text, coordinates hidden while selections retain coordinates, and exactly one visible attribution link. Run focused API tests/build only if API behavior changes. No full suites or repeated builds by default; broaden only for a concrete failure.
- Read current architecture/security/privacy constraints. Dedicated feature/fix branch from latest dev_test; PR to dev_test, merge only after required checks. Keep dev/main untouched.
- Follow queue completion/blocker protocol, update docs/agent-reports/latest.md with results and limitations, and stop after this task.
