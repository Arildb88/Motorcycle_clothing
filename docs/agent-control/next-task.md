# Authorized RideWear Task
## Type: IMPLEMENTATION
## ID: XC-SKI-001
## Generation: 8
## Handoff-From: ALPINE-001
## Authorization: authorized
## Promoted: 2026-10-02T11:54:38Z
## Task: Implement cross-country skiing foundation

Implement only the provider-independent XC foundation supported by docs/product/CROSS_COUNTRY_SKIING_PLAN.md: track/line weather with elevation and ETA plus easy/steady/hard intensity, with classic/skate as a tag rather than separate engines.

No grooming-status claims, Sporet integration, live rerouting, wax advice, new paid provider, dependency, or unauthorized schema migration. BLOCK if a required data-model/provider decision is missing.

Use focused tests and follow queue success/block rules.
