# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: ADS-001
## Generation: 10
## Handoff-From: WEATHER-PROVIDER-RESEARCH-002
## Authorization: authorized
## Promoted: 2026-10-02T12:14:00Z
## Task: Implement ad-placement policy foundation

Implement only the provider-neutral ad eligibility/policy foundation already defined in docs/business/ADS_MONETIZATION_STRATEGY.md: ads default off; explicitly eligible non-critical surfaces only; never allow ads to affect recommendation ranking; no ads on safety, navigation, recommendation-critical, or auth surfaces.

Do not integrate AdMob or another ad SDK/provider, CMP, tracking, consent SDK, dependency, paid service, or production ad unit. If provider integration is required for meaningful implementation, BLOCK and leave the policy documented rather than adding it.

Use focused tests for policy logic if executable code is added. No unrelated broad suites. Follow queue rules.
