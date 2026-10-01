# Weather data quality

Research document. Nothing here is integrated, purchased, or measured by RideWear.

Access date: 2026-10-01.

Labels: **Fact**, **Recommendation**, **Assumption**, **Open question**. Vendor marketing claims are marked as claims, not as accuracy results.

## 1. What the product needs

Clothing decisions need the weather the person will actually meet:

- along a motorcycle or cycling line, at the estimated arrival time of each sample;
- at resort sites that differ in height (base, mid-mountain, upper / lift top);
- along a cross-country track, including the height of those points.

Horizontal error of a few kilometres and vertical error of a few hundred metres both change temperature in Norwegian terrain. A cheaper feed that ignores height is not automatically the right development default.

## 2. What the API does today

**Fact.** `WeatherService.fetchMet` calls Locationforecast 2.0 compact with `lat` and `lon` only. It does not send `altitude`. When a sample has a time, the code picks the timeseries entry nearest that time. The cache key gains an hour suffix in that case. The URL is built in `apps/api/src/weather/weather.service.ts`.

**Fact.** `ARCHITECTURE.md` already sketches a `WeatherPort.forecast(points with lat, lon, and at)`. That port is not the live call path yet. The live path is `WeatherService`.

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

**Fact.** MET does not publish an SLA. Terms dated in the page footer 26 June 2020, still the document served on 2026-10-01: identify with a User-Agent, cache using `Expires` and `If-Modified-Since`, truncate coordinates to 4 decimals (5 or more can 403 on newer products), do not call from idle mobile apps, and do not let each phone call MET directly once traffic grows. Over 20 requests/second for the whole application needs an agreement. Attribution is CC BY 4.0. Do not present the product as Yr, NRK, or MET. Logs are stored in Oslo; MET recommends a proxy so user IPs are not sent with coordinates. Sources: [Terms of Service](https://api.met.no/doc/TermsOfService) and [Licensing](https://docs.api.met.no/doc/License.html), accessed 2026-10-01.

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

**Recommendation.** Before any paid contract, change the MET call (when implementation is authorized) to pass Kartverket ground height and compare otherwise identical forecasts against Frost stations in a valley and on a mountain. If the tier does not change, height was not the bottleneck.

## 5. Other candidates

No accuracy ranking is implied by the order.

### Open-Meteo

**Fact.** The forecast API accepts `elevation` for statistical downscaling. Default cell choice uses a 90 m DEM. `elevation=nan` turns downscaling off. Hourly output; `forecast_days` up to 16. Many national models, with a `best_match` switch. Sources: [forecast docs](https://open-meteo.com/en/docs), accessed 2026-10-01.

**Fact.** Free tier: non-commercial, under 10,000 calls/day, 5,000/hour, 600/minute, 300,000/month, no uptime promise. The terms list apps that show advertisements, or that sell subscriptions, as commercial use. Paid plans: Standard 1 million calls/month, Professional 5 million, Enterprise above 50 million, on reserved servers with a 99.9% uptime target. CC BY 4.0 attribution still applies. Sources: [terms](https://open-meteo.com/en/terms) and [pricing](https://open-meteo.com/en/pricing), accessed 2026-10-01.

**Fact.** The static pricing page fetched on 2026-10-01 did not include a euro amount. An Open-Meteo post has previously listed Standard at USD 29/month and Professional at USD 99/month ([substack](https://openmeteo.substack.com/p/api-subscriptions-for-commercial)). A third-party page claimed €29 and €99 as of 2026-08-30 from a Stripe widget. **Those amounts are not re-verified against Stripe in this pass.**

**Recommendation.** Do not put an ad-supported RideWear production app on the free tier. Open-Meteo is a plausible second adapter for elevation-aware and non-Nordic forecasts after the commercial price is read from checkout and after the validation method in §7 says it changes clothing outcomes. Self-hosting is AGPL; that is a legal review, not a default.

### Apple WeatherKit

**Fact.** REST and Swift. Apple states current conditions and 10-day hourly forecasts, plus minute precipitation and alerts in select regions. Location is used for the forecast and is not tied to a person across requests, according to Apple. Calls included with the developer membership: 500,000/month. Further public list prices on 2026-10-01: 1M USD 49.99, 2M 99.99, 5M 249.99, 10M 499.99, 20M 999.99, 50M 2,499.99, 100M 4,999.99, 150M 7,499.99, 200M 9,999.99. Unused calls do not roll over. Attribution of the Apple weather mark is required; alerts must keep the issuing agency's name. Source: [WeatherKit](https://developer.apple.com/weatherkit/), accessed 2026-10-01.

**Open question.** This page does not document a caller-supplied elevation. Do not assume mountain downscaling. Also a poor fit as the only source for an Android user if the product stays cross-platform, unless the REST API is accepted as the Android path and priced on the same meter.

### Meteomatics

**Fact.** The public pricing page asks the reader to talk to sales. No list price was published there on 2026-10-01. The API marketing page claims 90 m downscaling using a NASA terrain model and queries for points, lines, and polygons. There is an Oslo office listed. Sources: [pricing](https://www.meteomatics.com/en/pricing/) and [API](https://www.meteomatics.com/en/weather-api/), accessed 2026-10-01.

**Recommendation.** Treat 90 m and "most accurate" as vendor claims. A line query is interesting for routes, but only a bake-off against Frost can justify a contract.

### meteoblue

**Fact.** Forecast requests accept `asl` in metres. If omitted, meteoblue uses an 80 m DEM. Their docs say mountain domains can give a valley and a peak different weather at the same horizontal coordinate. Credits vary by package: the pricing page says current conditions are 4,000 credits and a typical call about 8,000, and that time resolution changes the cost. Monthly plan prices in euros were not fully present in the fetched text. Sources: [forecast overview](https://docs.meteoblue.com/en/weather-apis/forecast-api/overview) and [pricing](https://business.meteoblue.com/pricing), accessed 2026-10-01.

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
| Rate / price | 20 req/s needs an agreement; no fee found | Same ToS | Free non-commercial caps; paid call bundles; euro price not re-verified | 500k included, then the USD list above | Quote | Credits; euro plan price not extracted |
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

Do this before concluding that a paid source is better. No scores exist yet. Do not invent them.

1. **Internal MET test first.** Same coordinates, with and without Kartverket `altitude`, scored against Frost `air_temperature` at stations whose elevation is known. Sites should include a coast city, an inland valley prone to inversions, and a high resort. Seasons: a cold clear winter week, a mild windy week, a wet week, and a spring day with a large diurnal range.
2. **Define a clothing-relevant threshold first.** Temperature MAE that never crosses a warmth tier does not justify a new vendor. The threshold comes from the demand function, which is not fixed in this document.
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

- `MetLocationForecastAdapter` — default in Norway and the Nordics once height is passed.
- `MetNowcastAdapter` — optional, only when departure is inside two hours and the point is inside the nowcast domain.
- `OpenMeteoAdapter` or a commercial adapter — registered, not default, and only with a licence that matches how the app makes money.
- `MockWeatherAdapter` — tests.

Activity engines call the port. They do not know MEPS from ECMWF. Combining providers means the port fills gaps (nowcast for the first hour, locationforecast after that), not that each sport parses two JSON shapes.

Cache key: provider, coordinate rounded to 4 decimals, elevation band, valid hour. Honor MET `Expires`. Do not store raw model grids.

## 10. Open questions

1. Confirm the live Open-Meteo euro price in Stripe before any budget note treats €29 as real.
2. Does WeatherKit accept a height, and is minute precipitation available in Norway?
3. What Frost station density exists above 1,000 m in southern Norway? If it is thin, a summit bake-off needs a different reference (a resort sensor with a known licence, or a field log).
4. Is CC BY-SA on HeiGIT geometry compatible with showing a preview and then discarding it? Current code discards it, which is the conservative reading.
