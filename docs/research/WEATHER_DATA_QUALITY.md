# Weather data quality

Research document. Nothing here is integrated, purchased, or measured by RideWear.

Access date: 2026-10-01. Terms, pricing, and the live MET call path were re-read on 2026-10-02 for the comparison protocol in §11. Nothing here is a measured accuracy score.

Labels: **Fact**, **Recommendation**, **Assumption**, **Open question**. Vendor marketing claims are marked as claims, not as accuracy results.

## 1. What the product needs

Clothing decisions need the weather the person will actually meet:

- along a motorcycle or cycling line, at the estimated arrival time of each sample;
- at resort sites that differ in height (base, mid-mountain, upper / lift top);
- along a cross-country track, including the height of those points.

Horizontal error of a few kilometres and vertical error of a few hundred metres both change temperature in Norwegian terrain. A cheaper feed that ignores height is not automatically the right development default.

## 2. What the API does today

**Fact.** On `dev_test` at `052af2c` (2026-10-02), `WeatherService.forRouteSamples` sends Locationforecast 2.0 compact `altitude` when the sample height is a finite number. `apps/api/src/weather/met-request.ts` rounds that height to whole metres. `forRoutePoints` still requests latitude and longitude only. When a sample has a time, the code picks the timeseries entry nearest that time. The cache key is provider, rounded coordinate, rounded metres when present, and the hour. Recommend looks up a ground height and calls `forRouteSamples`. A missing height is omitted. It is not copied from another point.

**Fact.** `ARCHITECTURE.md` already sketches a `WeatherPort.forecast(points with lat, lon, and at)`. That port is not the live call path yet. The live path is `WeatherService`. The fields the engines already read are `airTempC`, `precipitationProbPct`, `precipitationMm`, `windSpeedMs`, and optional `windFromDeg`.

## 3. MET Norway

### Locationforecast 2.0

**Fact.** The service returns a forecast for a coordinate, up to about nine or ten days depending on region, as JSON. `compact` is the smaller payload. `altitude` is optional ground height in whole metres. MET says it is recommended for temperature, and that if it is omitted their topography model is used and can be wrong in hills. The parameter is ground height, not a request for wind at turbine height. Sources: [Locationforecast 2.0](https://api.met.no/weatherapi/locationforecast/2.0/documentation) and [FAQ](https://api.met.no/doc/locationforecast/FAQ), accessed 2026-10-01.

**Fact.** Data model, [datamodel](https://docs.api.met.no/doc/locationforecast/datamodel.html), accessed 2026-10-01:

| Region | Short-range model | Horizontal grid | Update | Then |
|---|---|---|---|---|
| Nordic | MEPS (MetCoOp: MET, FMI, SMHI, Estonia) | 2.5 km | Hourly | ECMWF ensemble, about 9 km, twice daily, for roughly days 2–10. Nordic temperature, precipitation, and wind are post-processed |
| Arctic | AROME-Arctic | 2.5 km | Four times daily | ECMWF ensemble, about 18 km in the text for that region |
| Elsewhere | ECMWF high-resolution | about 9 km | Four times daily | If height is omitted, GMTED2010 at 1 km plus a standard adiabatic lapse rate adjusts temperature. MET warns that wind in complex terrain is coarse |

Temperature is 2 m air temperature. Wind is 10 m, 10-minute average. Nordic short range has hourly steps and `next_1_hours` precipitation; longer range steps are 6 hours. `next_1_hours` is not in the global short-range table the same way. Percentile temperature and wind fields are part of the Nordic model output. There is no manual meteorologist edit.

**Fact.** MET does not publish an SLA. Terms dated in the page footer 26 June 2020, still the document served on 2026-10-01 and again on 2026-10-02: identify with a User-Agent, cache using `Expires` and `If-Modified-Since`, truncate coordinates to 4 decimals (5 or more can 403 on newer products), do not call from idle mobile apps, and do not let each phone call MET directly once traffic grows. Over 20 requests/second for the whole application needs an agreement. Attribution is CC BY 4.0. Do not present the product as Yr, NRK, or MET. Logs are stored in Oslo; MET recommends a proxy so user IPs are not sent with coordinates. Sources: [Terms of Service](https://api.met.no/doc/TermsOfService) and [Licensing](https://docs.api.met.no/doc/License.html), accessed 2026-10-01.

**Fact.** The licensing page says products are under NLOD 2.0 and CC BY 4.0 unless a product says otherwise. Credit "MET Norway" or "Data from MET Norway".

### Nowcast 2.0

**Fact.** Two-hour forecasts for Norway, Sweden, Finland, and Denmark, updated every 5 minutes, aimed at immediate precipitation. Citizen stations (Netatmo, Holfuy) are combined with professional stations for temperature and precipitation. Precipitation rate exists only where radar quality is good enough. Source: [Nowcast documentation](https://api.met.no/weatherapi/nowcast/2.0/documentation) and [datamodel](https://docs.api.met.no/doc/nowcast/datamodel.html), accessed 2026-10-01.

**Recommendation.** Nowcast is a complement for "leaving in the next hour", not a substitute for a route ETA tomorrow. It does not cover an alpine summit outside the radar/station blend, and this pass did not find an altitude parameter on nowcast.

### Observations for validation

**Fact.** Frost is MET's observation API. Data requests need a client id (Basic auth with an empty password, or OAuth2). Confidential series need a MET-issued OAuth client. The terms page points at the licence inside each response. Sources: [Frost authentication](https://frost.met.no/authentication.html) and [Frost terms](https://frost.met.no/termsofuse2.html), accessed 2026-10-01.

**Fact.** seNorge snow fields on MET THREDDS are NLOD / CC BY 4.0 unless a file says otherwise. They are gridded snow products, not point temperature forecasts. Source: [THREDDS seNorge catalogue](https://thredds.met.no/thredds/catalog/senorge/catalog.html), accessed 2026-10-01.

## 4. Why height has to be an input

**Fact.** MET's own FAQ says the built-in topography is coarse and that callers who know ground height should send it. A standard adiabatic adjustment is on the order of 6–10 °C per 1,000 m in textbook atmosphere; MET says they use a standard adiabatic lapse rate when they adjust. This document does not treat 6.5 °C/km as a measured RideWear constant.

**Assumption.** A valley station and a lift top 800 m higher can differ by enough to change a clothing tier. That is the reason to sample both, not a result from a RideWear trial.

**Recommendation.** The live recommend path already passes Kartverket ground height into MET when a sample has one. Do not treat a missing `altitude` parameter as the open integration task. The open task is the paired protocol in §11. If that protocol shows no clothing-tier change on mountain and inversion cases, height was not the bottleneck.

## 5. Other candidates

No accuracy ranking is implied by the order.

### Open-Meteo

**Fact.** The forecast API accepts `elevation` for statistical downscaling. Default cell choice uses a 90 m DEM. `elevation=nan` turns downscaling off. The same elevation can be comma-separated for multiple locations. Hourly output; `forecast_days` up to 16. Many national models, with a `best_match` switch. Temperature (2 m) and wind speed (10 m) are in the hourly variable list. Sources: [forecast docs](https://open-meteo.com/en/docs), accessed 2026-10-02.

**Fact.** Free tier: non-commercial, under 10,000 calls/day, 5,000/hour, 600/minute, 300,000/month, no uptime promise. The terms list apps that show advertisements, or that sell subscriptions, as commercial use. Paid plans: Standard 1 million calls/month, Professional 5 million, Enterprise above 50 million, on reserved servers with a 99.9% uptime target. CC BY 4.0 attribution still applies. One HTTP request is typically one call. A request with more than 10 weather variables, or covering more than two weeks at one location, counts as more than one call. Their example: two weeks and 15 variables is 1.5 calls. Sources: [terms](https://open-meteo.com/en/terms) and [pricing](https://open-meteo.com/en/pricing), accessed 2026-10-02.

**Fact.** The official pricing page fetched on 2026-10-02 still did not include a euro or dollar amount. An Open-Meteo post has previously listed Standard at USD 29/month and Professional at USD 99/month ([substack](https://openmeteo.substack.com/p/api-subscriptions-for-commercial)). A third-party page claimed €29 and €99 as of 2026-08-30 from a Stripe widget. **Those amounts are not on the official pricing page and are not a verified price.**

**Recommendation.** Do not put an ad-supported or subscription RideWear app on the free tier. Open-Meteo is eligible for the §11 trial because the licence, call caps, and elevation parameter are on the official pages. It is not eligible as a production default until a euro or dollar amount is read from that vendor's own checkout and the §11 stop rule is met. Self-hosting is AGPL; that is a legal review, not a default.

### Apple WeatherKit

**Fact.** REST and Swift. Apple states current conditions and 10-day hourly forecasts, plus minute precipitation and alerts in select regions. Location is used for the forecast and is not tied to a person across requests, according to Apple. Calls included with the developer membership: 500,000/month. The same public list was still on the page on 2026-10-02: 1M USD 49.99, 2M 99.99, 5M 249.99, 10M 499.99, 20M 999.99, 50M 2,499.99, 100M 4,999.99, 150M 7,499.99, 200M 9,999.99. Unused calls do not roll over. Attribution of the Apple weather mark is required; alerts must keep the issuing agency's name. Source: [WeatherKit](https://developer.apple.com/weatherkit/), accessed 2026-10-02.

**Fact.** The REST examples read on 2026-10-02 pass latitude and longitude. Apple's "cloud cover by altitude" addition is a response field (low, mid, and high cloud), not a caller-supplied ground height. No elevation query parameter was found on the pages read. Sources: [WeatherKit](https://developer.apple.com/weatherkit/) and [WWDC24 REST example](https://developer.apple.com/videos/play/wwdc2024/10067/), accessed 2026-10-02.

**Open question.** Do not assume mountain downscaling. Whether minute precipitation is available in Norway was not stated on those pages. WeatherKit can be the Android path only through the REST API, on the same published meter. The membership itself is a paid Apple Developer Program seat; this research did not subscribe.

### Meteomatics

**Fact.** The public pricing page still asks the reader to talk to sales. No list price was published there on 2026-10-02. The API marketing page claims 90 m downscaling using a NASA terrain model and queries for points, lines, and polygons. There is an Oslo office listed. A third-party catalogue that quotes euro plan prices is not the vendor and is not used here. Sources: [pricing](https://www.meteomatics.com/en/pricing/) and [API](https://www.meteomatics.com/en/weather-api/), accessed 2026-10-02.

**Recommendation.** Meteomatics is outside the §11 candidate set until the vendor publishes a price or RideWear holds a written quote. Treat 90 m and "most accurate" as vendor claims. A line query is interesting for routes, and it is not evidence.

### meteoblue

**Fact.** Forecast requests accept `asl` in metres. If omitted, meteoblue uses an 80 m DEM. Their docs say mountain domains can give a valley and a peak different weather at the same horizontal coordinate. The overview was last updated on the page as 7 August 2026 and was re-read on 2026-10-02. Source: [forecast overview](https://docs.meteoblue.com/en/weather-apis/forecast-api/overview).

**Fact.** The pricing page on 2026-10-02 listed credit examples: current conditions 4,000 credits, a typical call about 8,000, multimodel wind 8,000, and heavier packages 16,000. A selected figure of €2,400 per year was visible in the fetched configurator. That fetch did not bind €2,400 to one published monthly call volume as a stable list. Source: [pricing](https://business.meteoblue.com/pricing), accessed 2026-10-02.

**Recommendation.** meteoblue stays out of the §11 paid candidate set until the official page binds a euro amount to a call volume. The `asl` parameter is documented and is not a reason to skip that rule.

### Not compared in depth

SMHI, FMI, and DMI contribute to or neighbour MEPS. Calling them separately would duplicate the Nordic model MET already post-processes. A future non-Nordic gap might use ECMWF open data or Open-Meteo under a paid licence. No need to integrate three Nordic institutes.

## 6. Comparison

| Topic | MET Locationforecast | MET Nowcast | Open-Meteo | WeatherKit | Meteomatics | meteoblue |
|---|---|---|---|---|---|---|
| Norway / Nordics | Primary, 2.5 km MEPS | NO, SE, FI, DK, 2 h | Global; model mix | Global, vendor-operated | Vendor claims global, 90 m downscale | Point API, 80 m DEM if height omitted |
| Caller elevation | `altitude` metres, temperature | Not found in this pass | `elevation` downscaling | Not documented on the page read | Vendor claims terrain downscale | `asl` |
| Time step | 1 h then 6 h | 5 min updates, 2 h horizon | Hourly | Hourly to 10 days; minute precip in select regions | Not listed as a public grid | Package-dependent |
| Update | Nordic hourly | 5 min | Model-dependent | Not stated as a number | Not stated | Not stated |
| Observations | Separate Frost API | Blends stations for "now" | Historical APIs on higher plans | Historical averages claimed | Shop / contract | History products, credit-based |
| Route batching | One coordinate per HTTP call | One coordinate per call | Several coordinates can be sent on some endpoints; elevation docs allow 100 on the elevation API | Not reviewed as a batch route API | Vendor claims lines and multi-point | Point-oriented in the page read |
| SLA | None | None | Free: none. Paid: 99.9% target | Not stated on the page read | Contract | Not extracted |
| Rate / price | 20 req/s needs an agreement; no fee found | Same ToS | Free non-commercial caps; paid call bundles; no euro amount on the official page (2026-10-02) | 500k included, then the USD list, unchanged on 2026-10-02 | No official list price | Credits published; euro amount not bound to a volume |
| Licence | NLOD and CC BY 4.0, attribution, no Yr branding | Same | CC BY 4.0; free tier forbids ads | Apple attribution and alert rules | Commercial contract | Commercial credits |
| Cache | Required by ToS | Required by ToS | Confirm per plan | Confirm per Apple terms | Contract | Confirm |

## 7. Illustrative volume, not a forecast

These are arithmetic examples so limits can be read. They are not RideWear traffic.

Assume one recommendation uses 5 weather points (the current sampler cap) and each point is one MET HTTP call when the cache misses.

| Illustration | Recommendations / day | MET calls if every point misses cache | Against MET's 20 req/s rule | Against HeiGIT Directions 2,000/day if each recommendation also previews a route |
|---|---|---|---|---|
| Small | 200 | 1,000 | Far below 20/s if spread out | 200 previews, inside the free daily cap |
| Medium | 5,000 | 25,000 | About 0.3/s if uniform over 24 h; bursts on the hour would violate the "do not synchronize" rule | Over the standard cap |
| Large | 100,000 | 500,000 | About 6/s average; still under 20/s if flat, not if everyone refreshes at 07:00 | Far over the hosted free cap |

**Fact.** Shared cache keys (coordinate rounded to 4 decimals, hour, height band) make the real call count closer to unique places than to users. The hit rate is unknown.

**Recommendation.** Keep sampling modest. Spread refreshes. Proxy MET. Do not buy capacity for the large row until cache hit rate is measured.

## 8. Validation method

§11 is the protocol a later trial must follow. The list below is the intent. It is not a second set of rules. No scores exist yet. Do not invent them.

1. **Internal MET test first.** Same coordinates, with and without Kartverket `altitude`, scored against Frost `air_temperature` at stations whose elevation is known. Sites should include a coast city, an inland valley prone to inversions, and a high resort. Seasons: a cold clear winter week, a mild windy week, a wet week, and a spring day with a large diurnal range.
2. **Define a clothing-relevant threshold first.** Temperature MAE that never crosses a warmth tier does not justify a new vendor. §11 uses the motorcycle demand function already in the repo, frozen by commit hash at trial time. It does not add a new formula.
3. **Paired forecasts.** For the same points and the same valid times, store MET, and only then a paid candidate, plus the matching observation. Blind the label when a human inspects cases.
4. **Regimes, not a single average.** Report bias by elevation error, by inversion nights, by precipitation yes/no, and by lead time (1 h, 6 h, next morning). A model can win on average and lose on the summit.
5. **Route check.** Pick a small set of real lines (a coastal motorcycle ride, a mountain pass, a Nordmarka-style track). Sample like the product will. Compare the time series, not a single town forecast.
6. **Nowcast only for the 0–2 h departure.** Do not mix it into the day-ahead score.
7. **Stop rule.** Adopt a paid source only if the pre-registered tier-relevant metric improves on the mountain and inversion cases, the licence allows caching and attribution, and the cost fits the monetization note in `docs/business/ADS_MONETIZATION_STRATEGY.md`.

**Open question.** Which Frost elements and station metadata fields will be the reference (2 m temperature versus a different sensor height)? Read the element catalogue at implementation time. Station elevation must be part of the join or the test is invalid.

## 9. Architecture recommendation

**Recommendation.** One `WeatherPort` implemented on the server:

```text
forecast(samples: { lat, lon, elevationM?, at }[]): WeatherSample[]
```

`WeatherSample` keeps the normalized fields the engines already need (`airTempC`, wind, precipitation probability and amount, optional wind direction, source, fetched time) plus the elevation and valid time that were requested. Adapters:

- `MetLocationForecastAdapter` — default in Norway and the Nordics. The recommend path already passes height when it has one.
- `MetNowcastAdapter` — optional, only when departure is inside two hours and the point is inside the nowcast domain.
- `OpenMeteoAdapter` or a commercial adapter — registered, not default, and only with a licence that matches how the app makes money.
- `MockWeatherAdapter` — tests.

Activity engines call the port. They do not know MEPS from ECMWF. Combining providers means the port fills gaps (nowcast for the first hour, locationforecast after that), not that each sport parses two JSON shapes.

Cache key: provider, coordinate rounded to 4 decimals, elevation band, valid hour. Honor MET `Expires`. Do not store raw model grids.

## 10. Open questions

1. The official Open-Meteo pricing page still has no euro or dollar amount (2026-10-02). A budget note must not treat €29 or USD 29 as real until that vendor's own checkout shows it.
2. WeatherKit's pages still do not document a caller-supplied ground height. Whether minute precipitation is available in Norway was not stated.
3. What Frost station density exists above 1,000 m in southern Norway? If it is thin, a summit bake-off needs a different reference (a resort sensor with a known licence, or a field log).
4. Is CC BY-SA on HeiGIT geometry compatible with showing a preview and then discarding it? Current code discards it, which is the conservative reading.
5. Which Frost element id is 2 m air temperature, and which metadata field is station elevation? Read the element catalogue when a trial is authorized. This document does not guess the id.

## 11. Pre-registered comparison protocol

This is the methodology for a later trial. This pass did not call a forecast or observation API, did not subscribe, and did not score anyone. MET Locationforecast is the baseline. A candidate is not "better" because a vendor says so, because it costs money, or because it wins a single average.

### 11.1 Who may be compared

A provider is in the trial set only when, on an official page read for this protocol, both the licence or price and the request shape are stated.

| Provider | Role in the trial | What was verified on 2026-10-02 | Elevation on the request |
|---|---|---|---|
| MET Locationforecast 2.0 compact | Baseline. Always fetched | [Terms of Service](https://api.met.no/doc/TermsOfService), footer date 26 June 2020, still the served text. No fee. No SLA. Identify with User-Agent. Cache with `Expires` and `If-Modified-Since`. Truncate coordinates to 4 decimals. Over 20 requests/second for the whole application needs an agreement. CC BY 4.0. Do not present the product as Yr. | `altitude`, whole metres, already used by `forRouteSamples` when height is known |
| Open-Meteo forecast API | Eligible candidate | [Terms](https://open-meteo.com/en/terms) and [pricing](https://open-meteo.com/en/pricing). Free tier is non-commercial and capped (10,000/day, 5,000/hour, 600/minute, 300,000/month), no uptime promise. Ads or subscriptions are commercial use. Paid call budgets: Standard 1M/month, Professional 5M/month, Enterprise above 50M/month, 99.9% target. No euro or dollar sticker on that page. CC BY 4.0. | `elevation` for statistical downscaling, [docs](https://open-meteo.com/en/docs) |
| Apple WeatherKit REST | Eligible candidate, elevation-unmatched only | [WeatherKit](https://developer.apple.com/weatherkit/). 500,000 calls/month included with membership, then the USD ladder in §5. Attribution required. | Not documented. Store `elevation_sent: false`. Do not put these rows in the elevation-matched score |

Out of the trial set:

- **Meteomatics.** Official pricing page is still a sales conversation. No list price. Third-party euro figures are ignored.
- **meteoblue.** `asl` is documented. Credit examples are documented. €2,400 per year appeared as a selected configurator figure and was not bound to one call volume. Out until that binding is on the official page.
- **MET Nowcast.** Different product and a two-hour horizon. Score it only on a separate 0–2 hour departure sheet. Do not mix those rows into the day-ahead table.
- **SMHI, FMI, DMI** as extra Nordic feeds. They are not a second baseline. MET already uses the shared Nordic model.

A research pull against Open-Meteo's free tier is allowed only while that pull itself stays inside the published non-commercial examples (public research, no ads, no subscription). A RideWear build that shows ads or sells a subscription must not use the free tier for the trial. This pass did not create an API key.

### 11.2 The pair

Every scored row is one tuple, identical across providers:

| Field | Rule |
|---|---|
| `lat`, `lon` | Decimal degrees truncated to 4 decimals, the same values on every request. Do not move the point onto a friendlier grid cell. |
| `elevation_m` | Integer metres. Station cases use the station elevation from the observation metadata. Route and resort cases use Kartverket when the point is in Norway. The same integer is sent to every provider that accepts height. |
| `valid_time_utc` | The instant the clothing decision is about. One instant per row. |
| `lead_bucket` | One of `h1`, `h6`, `next_morning`, defined below. A row that does not fall in its bucket is dropped, not relabelled. |
| `case_id` | Frozen before the first vendor response is stored. |

`h1`: time from fetch to `valid_time_utc` is between 30 and 90 minutes.

`h6`: that lead is between 5 and 7 hours.

`next_morning`: `valid_time_utc` is 06:00–09:00 Europe/Oslo, and the fetch is 16:00–20:00 Europe/Oslo on the previous civil day.

All providers for one `case_id` are fetched inside a 15-minute window. Record `fetched_at` and, when the payload has it, the model-run time. Lead is `valid_time_utc` minus `fetched_at`.

If a provider cannot take elevation, the call still uses the same `lat`, `lon`, and `valid_time_utc`, with `elevation_sent: false`. Those rows are a coverage result. They are not in the elevation-matched error table. Do not send a different height and still call the row paired.

### 11.3 What is scored

Normalize into the fields `WeatherPoint` already has. Do not score a symbol string.

| RideWear field | Pairing rule |
|---|---|
| `airTempC` | 2 m air temperature when the provider says so. If the provider's temperature is a different height, drop it from temperature scores and count a coverage miss. |
| `windSpeedMs` | 10 m wind when the provider says so. A different wind height is a coverage miss for wind, not a zero. |
| `precipitationMm` | Amount for the hour that contains `valid_time_utc`. If the provider's step is not one hour, keep the row for temperature and exclude it from precipitation scores. Record the step. |
| `precipitationProbPct` | Only when both the candidate and MET have a probability. Missing is a coverage miss, not zero. |
| `windFromDeg` | Optional. Never invent it. It is not an error metric in this protocol. |

The observation, when there is one, is a Frost value at the same valid time. The element id is an open question (§10.5). Station elevation has to be in the join. A station case forecasts the station coordinate, not a nearby town.

A route or resort sample may be joined to a station only when the station is within 5 km horizontally and 50 m of elevation. Otherwise the sample stays in the provider-versus-MET sheet and is not an accuracy row. The 5 km and 50 m limits are protocol choices, not measured skill.

### 11.4 Error, coverage, latency, cost

Report each metric by stratum. Do not publish one blended winner.

**Error**, against the observation. MET is the baseline column, not the truth.

- Temperature MAE and mean bias, in °C.
- Wind MAE, in m/s, on rows where both sides are 10 m wind.
- Precipitation occurrence. "Yes" means `precipitationMm >= 0.3`. That 0.3 mm is the motorcycle wet threshold in `MOTORCYCLE_EXPOSURE.precipMmWetThreshold` on 2026-10-02. It is a clothing-relevant cut, not a meteorological standard. If amount is missing and probability exists, do not substitute probability into this count.
- Demand-tier mismatches. For each observation-paired row, compute motorcycle exposure from the forecast and from the observation with personal bias 0, using the pure function and constants already in `apps/api/src/recommend/motorcycle/` at the trial commit, and count tier disagreements against the observation. Freeze that commit hash in the trial log. Cycling, alpine, and cross-country add their own offsets. A later trial may repeat the count with those pure functions. This protocol does not invent a new warmth formula. A temperature MAE that never changes a tier does not justify a vendor.

**Coverage**, per provider, per stratum.

- Share of rows with each required field present.
- Share with `elevation_sent: true`.
- Share that returned a forecast for the valid time (domain and horizon). An HTTP error or an empty series is a miss, not a skipped row.

**Latency**, from the RideWear server, cold cache, successful responses only.

- One coordinate: p50 and p95.
- Five sequential coordinate calls, which is the current MET pattern and `MAX_ROUTE_WEATHER_SAMPLES` in `apps/api/src/routing/route-weather-sampling.ts`: p50 and p95 of the sum.
- Failures stay in the coverage count. They are not given a latency of zero.

**Cost**, from the official page only.

- Fee or none, what one call is, monthly cap, commercial-use rule, attribution, whether cache is allowed, SLA or none.
- Illustrative calls per recommendation: one location request counts as one call unless that vendor's current page says otherwise. Open-Meteo's page counts extra variables and extra weeks, and it does not say that five coordinates are one call. Do not assume a batch discount.
- Do not convert an unpublished euro amount into a ranking. Open-Meteo's sticker is unknown. WeatherKit's USD ladder is known. MET's fee on the terms page is none, with the 20 request/second agreement threshold.

### 11.5 Strata to freeze before any pull

Freeze the case list first. Seasons, as collection windows rather than results: a cold clear winter week, a mild windy week, a wet week, and a spring day with a large day–night range.

| Stratum | Definition |
|---|---|
| Coast | A coastal-city station |
| Inland valley | A valley station |
| Inversion | Two stations at most 20 km apart, elevation difference at least 300 m, and the lower station at least 2 °C colder than the upper one at the same valid time. Both thresholds are protocol choices |
| High site | Station or resort point at or above 800 m |
| Routes | Three lines sampled the way the product samples: a coastal motorcycle ride, a mountain pass, and a cross-country-style user line. Road samples stop at 5. Alpine base, mid, and upper are three sites, each with its own coordinate and height. The cross-country line is the saved waypoints, not a driving route |

Route rows without a station join compare providers with MET at the same tuple. That sheet can show disagreement and coverage. It is not accuracy.

A stratum is reportable only when it has at least 30 observation-paired rows. Fewer than 30 is "insufficient". It is not a tie and not a win.

### 11.6 Stop rule

This document does not adopt a provider. A later implementation may switch the default only when every line below is true:

1. The high-site stratum and the inversion stratum each have at least 30 observation-paired rows.
2. The candidate's temperature MAE is lower than MET's in both of those strata.
3. At least one of those two strata also has fewer motorcycle demand-tier mismatches than MET, using the frozen engine function.
4. The licence allows a server-side cache and the attribution the product can show.
5. If the app shows ads or sells a subscription, the candidate's commercial terms allow that. Open-Meteo's free tier does not.
6. The price is a number on the vendor's own page or checkout. A blog or a reseller table does not count.
7. The cost still fits `docs/business/ADS_MONETIZATION_STRATEGY.md`. No score in this file meets that bar, because there are no scores.

Blind the provider label when a person inspects individual cases. Keep Nowcast off the day-ahead sheet.

### 11.7 What this pass did not do

No forecast was requested. No Frost client id was created. No WeatherKit, Open-Meteo, Meteomatics, or meteoblue subscription was started. No SDK, dependency, schema, or `WEATHER_PROVIDER` default was changed. No paid provider is declared more accurate than MET.
