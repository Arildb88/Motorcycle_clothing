# Authorized RideWear Task
## Type: FEATURE_IMPLEMENTATION
## ID: SHARED-GARMENT-CATALOG-001
## Generation: 43
## Handoff-From: none
## Authorization: authorized
## Task: Implement shared garment catalogue and robust community start values

Arild explicitly authorized this feature in chat on 2026-10-07 ("kjør på med å lage dette"). Implement it end-to-end in the existing Flutter/NestJS/Prisma/PostgreSQL architecture. Minimal additive schema migrations for this feature are explicitly authorized. No new dependencies, external providers, paid services or production deployment.

Product requirements:
- Offer searchable brand/model choices and an "Other / write yourself" free-text path when adding garments. Preserve arbitrary user garment names.
- Match conservatively by normalized brand + model + garment category and relevant variant/activity context. Normalize case/whitespace; do not fuzzy-merge distinct models, generations, liners, heated variants or motorcycle/non-motorcycle equipment. Name-only fallback must be conservative and category-scoped.
- Catalogue entries may be created from sanitized product identity fields. Never publish free-text names, notes or other arbitrary personal input automatically. Provide curated brand choices; do not invent measured characteristics or imply verified manufacturer data.
- Warmth, wind resistance and water resistance use the existing 1–5 scale. Preserve existing recommendation engines and integer garment tiers; keep fractional catalogue averages and round deterministically when copying to existing integer garment fields.
- Shared values are defaults applied ONLY during new garment creation. Explicit user-entered values take precedence. Catalogue lookup must work server-side, including clients that have not fetched a preview.
- Existing garments never change when catalogue statistics change. Users retain the ability to manually edit their own values. Deleting a garment and adding the same product again gets current catalogue defaults. Rename/edit/read/recommendation flows do not refresh from catalogue.
- Existing category/preset defaults remain available when there is no matching catalogue or fewer than five genuine contributions for a metric. Label community values as estimates and show sample count; do not imply a count of distinct users.
- UI must distinguish untouched automatic defaults from explicitly edited values so clients do not silently override catalogue defaults with form initialization values.
- Imported/default/copied values, demo garments, catalogue seeds and re-created unedited garments must NEVER count as new independent measurements. Only intentional, explicit user evaluations may contribute. Explain this use at the contribution point and in existing privacy documentation; do not claim GDPR compliance or anonymization is automatic.

Aggregate/privacy design:
- Shared statistics store only product identity and per-metric frequency counts for values 1–5. No contributor user ID, garment ID, email, IP, route, weather/location, raw feedback text, event timestamp or persistent contributor identity in the shared data.
- User-linked personal wardrobe data remains private; do not remove account ownership needed for the existing app.
- Do not create a historical observation table. Histograms allow robust averaging without retaining individual evaluations.
- Validate integer range and finite values before accepting contributions; reject out-of-range values instead of clamping them into apparently valid evidence.
- For each metric with at least five genuine contributions, remove exactly one occurrence of its lowest value and exactly one occurrence of its highest value, then compute the mean of the remaining counts. Recompute from the histogram; ties and all-equal values work deterministically. Below five contributions use existing fallback defaults.
- Highest/lowest trimming reduces influence of extremes; it does not establish fraud resistance or distinct-user counting. Document that limitation. Authenticated contribution endpoints must follow existing auth, validation and available abuse protection. Prevent accidental double submission/retries where practical without storing contributor identifiers in shared statistics; do not promise perfect unique-user deduplication without identifiers.
- Use atomic histogram updates/transactions so concurrent contributions are not lost. Catalogue matching must be indexed and unique in the chosen conservative identity scope.
- Do not backfill community statistics from existing personal wardrobes or automatically expose existing names.

Verification:
- Add focused API tests for range rejection, five-sample threshold, trimming (including ties/all equal), integer rounding, per-metric sample counts, concurrency-safe update design, matching isolation, explicit overrides, no default feedback loop, existing garment snapshot stability, and delete/re-add using latest defaults.
- Add Flutter tests for brand/model and free text, preview/fallback, untouched defaults versus deliberate overrides, contribution messaging, Norwegian/English localization, and no refresh on editing existing garments.
- Run API tests and production build; Prisma generate and validate; verify additive migration correctness in a disposable local database when available. Run Flutter analyze and relevant Flutter tests.
- Keep dev and main untouched. Work on a feature branch from latest dev_test; open PR against dev_test. Merge only after required checks pass. If tooling prevents a required check, report/block rather than inventing results.
- Read architecture/security/privacy constraints and follow existing queue success/blocker rules. Record implementation, migrations, verification and limitations in latest report.
