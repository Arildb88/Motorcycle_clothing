# Authorized RideWear Task

## Type: PLANNING / RESEARCH ONLY

## Task: Multi-activity platform, geo/weather data quality, and sustainable monetization research

This is an approved planning task. Do not implement production features, add SDKs, change dependencies, migrate the database, or redesign existing working UI. The purpose is to prepare evidence-based documents for later human review and implementation decisions.

### Context

RideWear Motorcycle is the current reference implementation. Future activity families under consideration are:

- Motorcycle
- Cycling
- Alpine skiing / Snowboard
- Cross-country skiing

Treat Alpine skiing/Snowboard and Cross-country skiing as separate activity families. Do not invent additional product categories.

A core requirement is high-quality location-aware weather: temperature and other relevant conditions at points along routes, and at meaningful elevations/locations in ski resorts (for example base, mid-mountain, and upper/lift-top areas). Data quality matters more than choosing the cheapest provider. We want a strong free/open development path now while understanding when a paid provider could materially improve quality, reliability, coverage, or scalability if RideWear succeeds.

### Research requirements

Use current primary/authoritative documentation wherever possible and cite sources/URLs in the documents. Clearly separate verified facts, design recommendations, assumptions, and questions requiring later validation.

#### 1. RideWear platform architecture

Create/update:
`docs/product/RIDEWEAR_PLATFORM_PLAN.md`

Analyze what should be shared RideWear core versus activity-specific logic/UI. Cover at least profile/preferences, wardrobe, recommendation engine, weather, geo/location, routes, units/localization, and activity-specific configuration.

Preserve the existing Flutter -> NestJS API -> external-provider principle and server-side secrets.

Do not propose separate duplicated apps unless evidence shows a compelling reason. Document alternatives and tradeoffs rather than making irreversible changes.

#### 2. Geo data strategy

Create/update:
`docs/architecture/GEO_DATA_STRATEGY.md`

Deeply investigate the best sustainable way to obtain and normalize geo data, initially prioritizing Norway but considering later European expansion.

Cover:
- geocoding/place search
- road geometry
- cycling networks/routes
- alpine ski resorts, slopes/pistes and lifts
- cross-country ski tracks/trails
- elevation/DEM/terrain
- altitude at weather sample coordinates
- administrative/place data where useful
- licensing, attribution, caching/storage restrictions, API limits, reliability and update frequency

Prioritize authoritative Norwegian sources such as Kartverket/GeoNorge where relevant, but compare suitable European/global/open and commercial alternatives.

Evaluate whether RideWear should expose provider-independent NestJS geo interfaces/ports shared across activities.

#### 3. Weather data quality and validation

Create/update:
`docs/research/WEATHER_DATA_QUALITY.md`

This requires deep research.

Investigate how RideWear can obtain excellent temperature/weather readings/forecasts:
- at sampled coordinates along motorcycle and cycling route geometry
- at the correct ETA for each route point
- at meaningful elevations through alpine/snowboard resorts
- along cross-country ski tracks and their elevation profiles

Investigate MET Norway services and relevant forecast/observation datasets, including altitude/elevation handling, forecast model resolution/horizons, update frequency, station observations and quality metadata where applicable.

Compare credible free/open and paid commercial alternatives that could be considered if RideWear becomes successful. Do NOT purchase or integrate anything.

For each serious candidate, compare:
- geographic coverage, especially Norway/Nordics/Europe
- horizontal and vertical/elevation handling
- mountain suitability
- temporal resolution and forecast horizon
- update frequency
- observations versus forecasts
- route-scale querying/batching
- historical data if relevant to validation
- documented accuracy/limitations; do not invent accuracy scores
- uptime/SLA if documented
- rate limits
- licensing/caching/redistribution terms
- current pricing or pricing model when publicly documented
- likely scaling considerations at illustrative small/medium/large usage levels without pretending unknown request volumes are facts

Design a proposed validation methodology: compare provider forecasts against trustworthy observations across representative routes, elevations, seasons and weather regimes before deciding that a paid source is better.

Recommend an architecture that allows providers to be replaced/combined later without rewriting activity logic. Recommendations must be evidence-based and clearly marked as recommendations.

#### 4. Activity plans

Create/update:
- `docs/product/CYCLING_PLAN.md`
- `docs/product/ALPINE_SNOWBOARD_PLAN.md`
- `docs/product/CROSS_COUNTRY_SKIING_PLAN.md`

For each activity, document:
- intended MVP
- user/activity inputs
- wardrobe taxonomy
- weather/exposure factors relevant to clothing recommendations
- geo/routing/location needs
- what can reuse Motorcycle/shared RideWear core
- genuinely activity-specific recommendation logic
- data dependencies
- staged roadmap
- unresolved decisions

For Alpine/Snowboard explicitly consider base/mid/upper-mountain conditions and elevation.

For Cross-country explicitly consider route/track geometry, elevation profile, aerobic intensity and changing exposure along the route.

For Cycling consider cycling-specific routing/surface/elevation and changing weather exposure along the route.

Do not implement these variants.

#### 5. Low-key advertising / monetization

Create/update:
`docs/business/ADS_MONETIZATION_STRATEGY.md`

Research a restrained advertising strategy intended to generate modest income without materially disturbing the user.

Cover:
- credible mobile ad platforms/SDK options and current business models
- small banner/native placements on a limited number of appropriate browsing screens
- surfaces where ads should NOT appear, especially safety/weather warnings, critical recommendation interactions, navigation/route interaction, authentication and other interruption-sensitive flows
- avoid disruptive interstitial/full-screen behavior as the default strategy
- GDPR/EEA consent/privacy implications
- personalized/tracking advertising versus contextual/non-personalized approaches
- SDK privacy/data collection considerations
- app-store policy considerations
- rough monetization mechanics, clearly labeling estimates and avoiding invented revenue claims
- possible future ad-free paid option
- relationship between future recurring premium API costs and sustainable monetization

Do NOT add an ad SDK or production ad code.

### Quality bar

This is a research task, not a brainstorming dump.

- Prefer primary/official sources.
- Include access date/current pricing date for volatile provider/pricing facts.
- Flag uncertainty and unsupported claims.
- Distinguish Norway-specific findings from broader Europe/global findings.
- Avoid claiming paid data is superior without evidence.
- Identify questions that should be empirically tested.
- Keep recommendations compatible with provider-independent architecture.
- Do not change application code.

### Git workflow

Follow `docs/agent-control/guardrails.md`.

Start from latest `dev_test` and use an appropriate docs/research feature branch. Only documentation/research files and the required agent report should change.

No production code changes.

No dependency changes.

No DB/schema changes.

No changes to `dev` or `main`.

Because this is documentation-only, run appropriate repository documentation/static checks if available. Do not fabricate test results or install unrelated tooling merely to claim a test passed.

After completion, PR and merge only to `dev_test`, update `docs/agent-reports/latest.md`, and STOP.
