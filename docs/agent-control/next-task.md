# Authorized RideWear Task
## Type: FEATURE
## ID: THERMAL-FEEDBACK-001
## Generation: 34
## Handoff-From: RECOMMENDATION-EXPLAIN-001
## Authorization: authorized
## Promoted: 2026-10-02T23:26:34Z
## Task: Add simple cold/comfortable/hot feedback after a recommendation or activity as groundwork for personal thermal calibration

Requirements:
- Provide a minimal Norwegian UX for “for kald”, “passe” and “for varm” linked to the relevant recommendation/activity context where existing architecture safely permits.
- Inspect the existing personal thermal/profile model first and reuse it where possible.
- If safe within the current model, use accumulated feedback conservatively to improve the user's existing thermal preference/calibration; make the behavior deterministic, bounded and testable.
- Do not use ML, external AI, a new provider or opaque scoring.
- Do not let one feedback event cause a large calibration change.
- Preserve historical/user data and existing recommendations when no feedback exists.
- If persistent feedback requires an unauthorized schema migration, do not create one: implement the safe non-schema portion and document the exact follow-up need, or BLOCK if no meaningful safe implementation is possible.
- Respect activity/wardrobe isolation rules.
- Add focused tests for cold/comfortable/hot behavior and bounds.
- Follow queue/control rules.
