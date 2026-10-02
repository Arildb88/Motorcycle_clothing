# Authorized RideWear Task
## Type: UX_MAINTENANCE
## ID: UX-POLISH-001
## Generation: 31
## Handoff-From: XC-TRAIL-SYNC-001
## Authorization: authorized
## Promoted: 2026-10-02T22:40:59Z
## Task: Apply a focused RideWear MVP UI/UX polish pass

Review implemented MVP screens for consistency and obvious usability defects without redesigning the product.

Focus on:
- Spacing, alignment, overflow and small-screen resilience.
- Consistent RideWear buttons, minimum touch targets and disabled/loading states.
- Clear empty, loading, validation and provider-error states.
- Norwegian localization/text consistency, including æ/ø/å.
- Planner forms and activity-specific flows remaining understandable without exposing irrelevant route controls.
- Profile, wardrobe and recommendation-result presentation.

Requirements:
- Preserve existing navigation, architecture and visual identity.
- Do not invent new product features or perform a broad visual redesign.
- Add/update focused widget tests for meaningful regressions.
- Run Flutter analyze and relevant Flutter tests.
- Record anything requiring human visual/device judgment rather than claiming it is verified.

Keep dev and main untouched. Follow queue rules.
