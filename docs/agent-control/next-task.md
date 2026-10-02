# Authorized RideWear Task
## Type: PRODUCT_FEATURE
## ID: WARDROBE-SHARING-001
## Generation: 26
## Handoff-From: ALPINE-SNOWBOARD-UNIFY-001
## Authorization: authorized
## Promoted: 2026-10-02T19:51:43Z
## Task: Make wardrobes activity-aware, keep motorcycle isolated, and make demo garments activity-specific

Implement the approved RideWear wardrobe rules.

Hard motorcycle boundary:
- Motorcycle clothing is its own wardrobe domain and must always remain separate from every non-motorcycle activity.
- A motorcycle garment must never become available to cycling, alpine/snowboard, cross-country skiing or other non-motorcycle activities through wardrobe sharing.
- Non-motorcycle garments must never become available to motorcycle through wardrobe sharing.
- This boundary is a product invariant, not merely a default checkbox.

User-controlled sharing for non-motorcycle activities:
- Let the user choose whether supported non-motorcycle activity wardrobes stay separate or share garments.
- Provide a clear selection UI where the user can choose which compatible activity categories share a wardrobe/garment availability.
- Cycling, alpine & snowboard, and cross-country skiing may be shared in combinations chosen by the user.
- Do not force all non-motorcycle categories into one wardrobe.
- Prefer one garment record with activity availability/membership over silently creating duplicate garment copies.
- Preserve room for additional non-motorcycle activities later without weakening the motorcycle isolation invariant.
- Hiking remains unavailable and must not be remapped to another activity.

Demo garments:
- Demo clothing must follow the currently selected activity/category.
- Motorcycle receives only motorcycle-relevant demo garments.
- Cycling receives cycling-relevant demo garments.
- Alpine & snowboard receives its own resort-snow-sports demo set.
- Cross-country skiing receives its own cross-country demo set.
- Demo garments from one activity must not appear as that activity's demo wardrobe in another category merely because personal wardrobes can be shared.
- Demo seeding remains clearly marked as demo, separate from personal garments, and idempotent per intended activity/category.
- Replacing/removing demo garments must not delete personal garments.

Recommendation behavior:
- Recommendations may use only garments available to the selected activity under these rules.
- Motorcycle recommendations may use only motorcycle garments.
- Non-motorcycle recommendations may use personal garments shared with that activity plus that activity's relevant demo garments.
- Do not invent a new recommendation engine; integrate with the existing activity/recommendation architecture.

Persistence and compatibility:
- Inspect the current garment/wardrobe schema before implementation.
- Preserve existing user garments and existing activity data.
- A schema migration is allowed only if it is the smallest safe change required to persist the approved sharing model; include a deterministic migration/backfill that preserves current data and motorcycle isolation.
- Do not destructively reinterpret existing motorcycle garments as generic clothing.
- If existing data cannot be migrated safely without a product decision, BLOCK and report the exact ambiguity rather than guessing.

Tests:
- Add deterministic tests proving motorcycle cannot share in either direction.
- Test separate and shared non-motorcycle combinations.
- Test recommendation garment filtering by selected activity.
- Test activity-specific, idempotent demo seeding and that personal garments survive demo replacement/removal.
- Test relevant UI selection/localization and Norwegian text.
- Run Prisma generate/validate and API migration/tests if persistence changes.
- Run relevant/full Flutter tests and Flutter analyze.

No new external provider, paid service or unrelated feature. Keep dev and main untouched. Follow queue rules.
