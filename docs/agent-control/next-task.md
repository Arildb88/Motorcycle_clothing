# Authorized RideWear Task
## Type: MC_BASIC_LAYERS
## ID: MC-BASIC-LAYERS-001
## Generation: 39
## Handoff-From: SECURITY-HARDENING-001
## Authorization: authorized
## Promoted: 2026-10-06T08:47:47Z
## Task: Add selectable everyday/basic clothing worn under motorcycle protective gear and include its warmth in MC recommendations

Inspect the current motorcycle planning, wardrobe and recommendation models first and implement the smallest compatible extension.

For motorcycle only, let the rider optionally indicate basic clothing already worn underneath the protective MC gear. Selecting no basic under-clothing must be a valid, explicit state and must not trigger validation errors or force a default selection. This is important for warm-weather riding where the protective MC garment itself may be the relevant leg/torso layer (for example protective motorcycle jeans with no ordinary trousers underneath).

UI:
- Use one dropdown for basic upper-body clothing (Overdel).
- Use a separate dropdown for basic lower-body clothing (Underdel).
- Both dropdowns must include an explicit Ingen / none option and default safely to no basic garment rather than forcing clothing.
- Overdel options: none, T-shirt, thin sweater, thick sweater, wool base-layer top.
- Underdel options: none, wool base-layer bottom, jeans, sweatpants/joggers.
- Keep this simple in the normal MC planning flow; do not require opening the wardrobe editor just to describe these basic clothes.

Thermal behavior:
- Basic clothing contributes warmth to the relevant body zone before/while the MC recommendation determines additional layers.
- The thermal ordering must be explicit and deterministic: a thick sweater contributes more warmth than a thin sweater; wool base layers are insulating and warmer than a plain T-shirt; lower-body wool/jeans/joggers affect legs rather than torso.
- Use bounded, explainable constants consistent with the existing 1–5 warmth/demand model. Do not claim laboratory CLO values unless a verified source/model is actually introduced.
- Multiple physically compatible basics may be selected where sensible (for example T-shirt + sweater, or wool bottom + pants), but prevent or clearly handle nonsensical double counting.
- Protective MC outerwear remains required and separate. Basic jeans must not be treated as protective motorcycle jeans, and ordinary sweaters/T-shirts must not satisfy protective shell requirements. Conversely, protective motorcycle jeans (including Kevlar/reinforced riding jeans) belong to the MC protective wardrobe and must not cause the UI to require ordinary jeans, joggers, wool bottoms, or any other basic under-layer.
- Recommendation explanations should account for selected basic warmth when it materially changes a suggested base/mid layer.
- Keep this MC-only; do not weaken the existing motorcycle wardrobe isolation rules.
- Preserve existing users/data. Prefer no schema migration if the selection can safely live in the existing plan/request model; if persistence requires a migration, use only a minimal safe additive migration.
- Add Norwegian UI labels/localization and deterministic tests covering thermal ordering, torso/legs separation, no protective-equipment substitution, and recommendation impact.
- Follow queue/control rules.
