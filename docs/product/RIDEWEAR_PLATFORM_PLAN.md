# RideWear platform plan

Planning document only. It does not authorize implementation.

Access date for external sources cited here: 2026-10-01. Code facts are from `dev_test` at the time of writing.

Labels used below:

- **Fact** — observed in this repository or in a cited source.
- **Recommendation** — a design choice for later human review.
- **Assumption** — not measured.
- **Open question** — do not guess; decide later.

## 1. What exists today

**Fact.** RideWear is one Flutter app talking to one NestJS API. Provider secrets stay on the server. This is the rule in `ARCHITECTURE.md`, `SECURITY.md`, and `PRIVACY_ARCHITECTURE.md`.

**Fact.** Activity identifiers already reserved in `apps/api/src/domain/enums.ts` are `motorcycle`, `hiking`, `cycling`, `xc_skiing`, `alpine_skiing`, and `snowboarding`. The selectable launch set in `oauth-utils.ts` is only `motorcycle`, `hiking`, and `cycling`. The only implemented recommendation engine is motorcycle (`motorcycle_v1`). Other selectable activities are not allowed to show a fake kit.

**Fact.** `ARCHITECTURE.md` §3.3 says motorcycle modules must not be reused as hiking or cycling engines. §15 says alpine skiing and snowboarding may share an alpine exposure engine later while remaining distinct activity types. `RIDEWEAR_CONTEXT.md` says the wardrobe is shared, feedback should be activity-specific, and RideWear is not a turn-by-turn navigator.

**Fact.** Shared pieces already in the product include account and identity linking, profile language and unit preferences, one wardrobe with layers and body zones, saved routes and activity-plan snapshots, a provider-neutral `RoutingPort`, MET-backed weather behind the API, and Norwegian Bokmål / English UI strings.

This research task covers four families only: motorcycle (reference), cycling, alpine skiing/snowboard, and cross-country skiing. Hiking stays a reserved identifier. This document does not specify a hiking engine.

## 2. One product, not cloned apps

**Recommendation.** Keep one Flutter binary and one NestJS API. Add activity behavior behind the existing activity type, not as separate apps or separate backends.

| Alternative | What it would mean | Why it is weaker for RideWear now |
|---|---|---|
| One app, shared core, activity engines | Current direction | Matches the code and the privacy boundary |
| Separate apps per sport | Duplicated auth, wardrobe, and provider clients | Splits a wardrobe the product already treats as shared; multiplies store listings and consent UX |
| Flutter calling providers directly | Keys and user IPs leave the API | Conflicts with server-side secrets and with MET's advice to proxy coordinates |
| One engine with sport as a parameter only | Motorcycle wind-chill reused everywhere | Forbidden by the current architecture; exposure physics differ |

No evidence in the current product requires a split. A split would be justified later only if a store policy, a partner contract, or a binary-size problem made a shared app untenable. That evidence does not exist here.

## 3. Shared core versus activity-specific logic

### Shared RideWear core

**Recommendation.** These stay activity-agnostic:

- Identity, sessions, and explicit account linking.
- Profile: language, units, cold-sensitivity prior, default activity. `defaultActivity` stays distinct from the in-session `currentActivity`.
- Wardrobe persistence: one garment row can be tagged for more than one activity. Do not clone a garment because a second sport uses it.
- Ordinal layer / body-zone model (`base`, `mid`, `outer`, `accessory` and torso, legs, hands, feet, head, neck). Tiers stay 1–5, not medical clo values.
- Plan versus route versus log. Routes stay reusable definitions. Plans freeze a snapshot. Weather and kit results are recalculated; they are not stored on the route.
- Units and localization. Engines emit reason codes. Flutter formats units. User-typed names are not translated.
- Provider ports on the server: weather, routing, geocoding, and a future elevation lookup. Adapters map provider payloads into RideWear types. Activity code does not import provider SDKs.
- Privacy rules: no continuous GPS, no dense stored polylines, user-owned data scoped to the user.

### Activity-specific

**Recommendation.** Each family gets its own exposure function, demand weights, and route semantics.

| Concern | Shared | Specific |
|---|---|---|
| Profile and units | Yes | Which inputs the planner shows |
| Wardrobe storage | Yes | Which categories and presets are offered; which tags match |
| Recommendation shell | Reason codes, wear versus pack, confidence shape | The exposure math and the evidence that may influence it |
| Weather fetch | Port: coordinate, elevation, time | Which points are worth sampling |
| Geo | Ports for search, geometry, elevation | Road, cycleway, piste, or groomed track |
| Routes | Waypoints, preferences, plan snapshot | What a "route" means (road ride, resort session, track) |
| UI | Shell tabs, l10n, theme | Activity home, planner fields, empty states |

**Fact.** Motorcycle exposure uses speed-driven airflow and duration-weighted demand so a short extreme does not dominate a long ride. That duration-weighting idea can be reused as a pattern. The motorcycle coefficients must not be copied into other sports.

**Recommendation.** Personal offsets stay keyed by `(user, activity, zone)`. Do not let alpine feedback move a motorcycle offset. The existing shrinkage form `n / (n + k)` can stay the shared update rule when personalization is implemented for a second sport.

## 4. Configuration, not forks

**Recommendation.** Represent a family as data plus a small pure module:

- Activity descriptor: selectable or not, engine id, required inputs, sample strategy (`along_route`, `resort_elevations`, `track_profile`).
- Garment presets and category list for that activity, still using the shared layer and zone enums.
- A pure `scoreExposure` function that accepts normalized weather samples and activity inputs and returns the same demand shape the wardrobe matcher already understands, or a documented extension of it.

UI stays one shell. The activity home and planner bind to the descriptor. Strings go through the existing ARB files.

## 5. What this plan deliberately does not do

- No second mobile app, no new database, no new weather or map vendor, no ad SDK.
- No claim that a paid feed is more accurate. See `docs/research/WEATHER_DATA_QUALITY.md`.
- No implementation of cycling, alpine, or cross-country engines. See the three activity plans.
- No change to motorcycle behavior.

## 6. Open questions

1. Should `alpine_skiing` and `snowboarding` remain two stored activity types under one engine, as `ARCHITECTURE.md` §15 already says? This research task treats them as one family and does not propose merging the enums.
2. When a garment is tagged for two sports, whose feedback updates which offset? **Recommendation:** only the activity that was logged.
3. Is the shared demand tuple (warmth, wind, water, per zone) enough for sweat-dominated cycling and aerobic cross-country skiing, or does a later engine need an explicit overheating output? Do not add the field until a sport plan requires it. The cycling and cross-country plans flag it.
