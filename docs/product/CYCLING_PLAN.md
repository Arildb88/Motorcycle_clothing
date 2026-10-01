# Cycling plan

Planning only. Do not implement from this file.

Access date for outside sources: 2026-10-01. Shared geo and weather findings are in `docs/architecture/GEO_DATA_STRATEGY.md` and `docs/research/WEATHER_DATA_QUALITY.md`.

Labels: **Fact**, **Recommendation**, **Assumption**, **Open question**.

## Intended MVP

**Recommendation.** A cyclist can pick cycling, set a departure, and get a clothing suggestion for a ride whose weather changes along a cycled line.

MVP includes:

- Activity type `cycling` (already reserved and already selectable).
- A ride defined by two or more points, previewed with a cycling routing profile when the server can provide one.
- Weather samples on that line at estimated arrival times, with ground elevation when Norway elevation lookup exists.
- Wear versus pack, reason codes, and confidence, using the shared wardrobe.
- Honest empty state if routing is down: straight segments between saved points and the duration hint, same fallback idea as motorcycle.

MVP excludes turn-by-turn navigation, live rerouting, a power-meter model, and any claim of surface-perfect gravel routing.

## User inputs

**Recommendation.**

- Start, optional stops, end. Or current location at plan time only.
- Departure or arrival, reusing the existing planning modes.
- Ride style as an explicit input, not a guess: easy, steady, or hard. This stands in for aerobic intensity until a sensor exists.
- Optional: prefer paths / avoid the largest roads, if the routing adapter supports it.
- Optional rain aversion, only if it is not already covered by the shared cold-sensitivity prior. Do not add a second hidden bias.

**Assumption.** Most early rides are 30–180 minutes around a Norwegian city or a day trip. That is a product guess used to keep the MVP small.

## Wardrobe taxonomy

**Fact.** The shared model is layers and body zones with ordinal tiers. Motorcycle presets (armoured jackets, liners, vents) are not cycling garments.

**Recommendation.** Add cycling presets later, still one wardrobe:

| Zone | Examples | Notes |
|---|---|---|
| Torso | Base, jersey, vest, shell | Shell is pack-or-wear based on rain probability along the ride |
| Legs | Tights, shorts, shell pants | Temperature plus rain, not motorcycle abrasion |
| Hands | Light gloves, winter gloves | High wind chill at speed, small muscle mass |
| Feet | Shoe covers, winter shoes | Often the limiting zone; do not ignore them |
| Head | Cap, thin hat, helmet liner | Helmet itself is safety equipment, not a warmth tier |

**Recommendation.** Do not model a helmet as a warmth garment. The copy can remind the rider that a helmet is assumed and is not chosen by the engine.

**Open question.** Are shoe covers and rain pants usually owned as separate garments or as components of a jacket? Prefer separate garments until users show otherwise.

## Weather and exposure

**Recommendation.** Cycling exposure is moving air plus metabolic heat.

- Sample the cycling geometry, not only the town forecast.
- ETA from provider duration, as motorcycle sampling does.
- Wind: a headwind on a fast section matters more than the same wind while descending. A first version may use scalar wind plus speed, and add a vector only when both heading and `windFromDeg` exist. That pattern already exists for motorcycles; the coefficients must be cycling-specific.
- Rain on a distant segment goes to pack even if the start is dry.
- Sweat: a hard effort in mild air can overheat a shell. The MVP should be able to say "vent or pack the shell" when the style input is hard and precipitation probability is low. That is an overheating output the motorcycle engine does not emphasize.

**Assumption.** A road cyclist’s air speed is often close to ground speed. A commuter in a city is slower and more sheltered. The style input is a coarse stand-in, not power.

## Geo and routing

**Fact.** HeiGIT documents cycling profiles under the same distance cap as driving (6,000 km) and a standard Directions quota of 2,000 requests/day. See the geo strategy.

**Recommendation.** Reuse `RoutingPort` with a cycling profile. Reuse `ElevationPort` (Kartverket in Norway) so forecast calls can include height. Surface class, when the adapter returns it, is a reason code ("unpaved section"), not a second weather model.

**Open question.** Which ORS cycling profile matches Norwegian mixed commuting (`cycling-regular` versus road versus mountain) needs a trial on real Oslo and Bergen trips before it is the default.

## Reuse versus new logic

| Reuse | Do not reuse |
|---|---|
| Auth, profile, units, l10n, wardrobe storage, plan snapshot | `motorcycleExposureC` and motorcycle speed defaults |
| Weather port, sample-along-line, ETA | Driving-car geometry as if it were a bike route |
| Wear / pack / reason codes / confidence shape | Motorcycle abrasion and armour presets |
| Duration weighting so one hail cell does not dress the whole ride | Motorcycle personal offsets |

## Data dependencies

- Cycling directions and duration (ORS or later adapter).
- Elevation for Norwegian points (Kartverket).
- Forecast at those points and times (MET, with height).
- No Sporet, no resort feed, no ad SDK.

## Staged roadmap

1. **MVP.** Cycling profile, samples, a small exposure function, generic kit if the wardrobe has no cycling tags.
2. **Presets.** Jersey, shell, gloves, shoe covers in the category list.
3. **Wind vector and surface notes** when the adapter actually returns them.
4. **Personal offsets** only after enough cycling logs, separate from motorcycle.

## Unresolved decisions

1. Is "hard" a three-level enum or a free-text note? **Recommendation:** a three-level enum so the engine can use it.
2. Should a loop commute that returns to the start weight the coldest homeward hour more heavily? **Recommendation:** yes, because that is when the rider is tired and wet, but only after the MVP time series exists.
3. Night lighting is safety, not clothing warmth. Keep it out of the engine.
