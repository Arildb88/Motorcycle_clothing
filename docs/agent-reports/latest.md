# ADS-001 ad-placement policy foundation

## Task

`ADS-001`, generation 10, automatic handoff from `WEATHER-PROVIDER-RESEARCH-002` on `dev_test` range `052af2cce0cc20119380e1b05571c7a4dc9899a6..48325d788fae6556b12d7518125e8d7194f886fd`. This run did not write a claim commit. The token stayed the ownership record until this branch's final control state.

- Branch: `feature/ads-001-placement-policy`
- Implementation: `cf72e6601b8342c86aa719e001f6458aa6e4c142`
- PR: https://github.com/Arildb88/Motorcycle_clothing/pull/43 into `dev_test` only. Not merged to `dev` or `main`.

## Implementation

Provider-neutral placement policy in `apps/mobile/lib/ads/ad_placement_policy.dart`. The existing banner widget asks this policy before it loads. No new ad network, consent SDK, or production ad unit was added.

- `ADS_ENABLED` still defaults to false. A disabled flag refuses every surface.
- Eligible surfaces, and only when the list or home content is ready: activity home after the primary content, the saved-routes list in a reserved footer, and the wardrobe list in a reserved footer.
- Refused: profile and account, auth, consent and privacy, the recommendation result, route editing, map preview, place search, navigation handoff, an active session, safety alerts, and payment.
- Loading, empty, and error states do not take a slot. Overlay and before-content positions are refused. A second visible placement is refused.
- `affectsRecommendationRanking` is false. The recommend module does not import this policy.

The shell no longer paints a banner on the profile tab. Login and the pushed route editor, map, and planner screens do not request a slot.

## Final control state

Promotion is automatic. No queued unconsumed item remains, so this close is idle and authorizes nothing.

- `ADS-001` completed and appended once to `consumed.md`
- `active_id: none`
- `promotion: automatic` unchanged
- `handoff_generation: 10` unchanged
- `handoff_state: idle`
- `paused: false`
- `next-task.md`: idle, Generation 10, Handoff-From `none`, Authorization `none`

## Checks

Focused Flutter test, 7 passed:

- `apps/mobile/test/ad_placement_policy_test.dart`

`flutter analyze` on the touched mobile files reported no issues. No API suite, Flutter build, or live ad request was run. The default build does not initialize ads.

## Architecture / config

No new dependency, provider, paid service, schema change, or secret. `google_mobile_ads` was already in the app and was not upgraded. `dev` and `main` were not modified.

## Remaining

- Ads stay off until a human sets `ADS_ENABLED`. Turning them on still needs a certified consent flow, which this task forbids adding.
- The slot still uses the existing test banner id only when the policy allows a banner. Native banner is an allowed policy format and is not loaded.
- No ad-free subscription was added.
