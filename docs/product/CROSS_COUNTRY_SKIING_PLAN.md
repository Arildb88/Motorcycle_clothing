# Cross-country skiing plan

Planning only. Do not implement from this file.

Access date: 2026-10-01. See `docs/architecture/GEO_DATA_STRATEGY.md` and `docs/research/WEATHER_DATA_QUALITY.md`.

Labels: **Fact**, **Recommendation**, **Assumption**, **Open question**.

## Intended MVP

**Recommendation.** A skier can describe a tour or a loop, including a simple elevation profile, and get clothing that survives the coldest, windiest, or wettest part of the route without overdressing the climbs.

MVP includes:

- Activity type `xc_skiing` (already reserved, not currently selectable).
- A line: user waypoints, or later an OSM nordic piste when licensed use and coverage are acceptable.
- Samples along the line with ground elevation and ETA.
- An explicit intensity: easy, steady, or hard. Classic versus skate is a tag, not a different engine in v1.
- Wear versus pack, with a bias toward layers that can be opened on climbs and added when the skier stops.

MVP excludes grooming status, a Sporet integration, live rerouting, and wax advice.

## User inputs

**Recommendation.**

- Start and end, or a loop. Optional via points.
- Departure time and either a duration or a pace. If a geometry provider supplies duration, prefer it and show that it is an estimate.
- Intensity: easy / steady / hard. This is the aerobic input. There is no heart-rate sensor in v1.
- Style: classic or skate. Used for wardrobe tags (for example skate boots are equipment, not a warmth score).
- Optional: long stops (a cabin break). Stops are when sweat meets wind.

**Assumption.** Norwegian tours that matter for clothing are often 1–4 hours with repeated small climbs, not a single alpine descent. Unmeasured.

## Wardrobe taxonomy

**Recommendation.** Shared wardrobe. Cross-country kits are lighter than alpine shells and are opened while moving.

| Zone | Examples | Notes |
|---|---|---|
| Torso | Thin base, light mid, thin shell or vest | Shell often starts in the pack |
| Legs | Tights, light shell pants | Less insulation than alpine pants |
| Hands | Light gloves, overmitts | Wind on descents |
| Feet | Ski socks | Boots are equipment |
| Head | Headband, thin hat | High sweat; a thick hat is often wrong while moving |

**Recommendation.** Do not reuse alpine insulated pants as the default match just because both tags contain "ski". Activity tags must separate `xc_skiing` from `alpine_skiing`.

## Weather and exposure

**Recommendation.** The route is the product, not a single valley temperature.

- Sample along the track the same way motorcycle samples a road: position plus ETA. Add elevation on each sample.
- Climbs: high metabolic heat, lower clothing demand, sweat.
- Descents and stops: airflow or stillness, damp clothes, higher demand.
- A first model can split the tour into moving time and a user-declared stop, and take sustained demand from the moving segments while pack items cover the stop and the coldest sample.
- Wind on an open marsh can dominate a forest climb. That requires sample positions, not a city forecast.
- Snow on the ground is not the same as snowfall on the skier. Precipitation probability still drives the shell. seNorge’s 1 km snow map can later answer "is there a base?", which is a go/no-go hint, not a clothing tier.

**Fact.** MET nowcast covers the next two hours in Norway and neighbouring countries and is updated every five minutes. It is relevant when the tour starts now. It is not a substitute for a morning-ahead locationforecast. See the weather document.

**Assumption.** Intensity changes felt temperature by as much as a modest forecast error. That is why intensity is an input. The size of the effect is not measured here.

## Geo and routing

**Fact.** Skiforeningen states that Sporet GPS tracks are for use in Sporet and that sharing them needs a written agreement. See the geo strategy. Do not plan on that feed.

**Fact.** OSM `piste:type=nordic` exists and is incomplete. ODbL attribution would be required.

**Recommendation.**

- v1 line: the user’s own waypoints, with Kartverket heights and MET forecasts. No third-party track.
- v2: optional OSM nordic geometry behind `ActivityGeometryPort`, discarded after the plan snapshot stores only a short summary.
- Duration: if no ski router exists, use the user’s duration. Do not pretend a driving route is a ski track.
- A ski-specific router is out of scope until a legal graph exists.

## Reuse versus new logic

| Reuse | Do not reuse |
|---|---|
| Profile, units, l10n, wardrobe rows, plan snapshot | Motorcycle airflow coefficients |
| Sample-along-line and ETA when a duration exists | Alpine "wait on the lift" weighting |
| Weather port with elevation | Sporet grooming as if it were open data |
| Reason codes and wear / pack | Alpine personal offsets |

The new logic is the climb-versus-stop split and the refusal to dress the whole tour for the coldest minute if that minute is a short stop (pack a layer instead).

## Data dependencies

- User line or, later, OSM nordic pistes.
- Elevation (Kartverket in Norway).
- MET locationforecast with height and time.
- Not in MVP: Sporet, seNorge, a paid mountain API.

## Staged roadmap

1. **MVP.** Waypoints, user duration, intensity, elevation-aware forecasts, generic or tagged kit.
2. **Stop versus move** as an explicit split in the demand function.
3. **OSM piste import** after attribution and a coverage check on a few known areas (for example a city forest and a highland plateau).
4. **Snow presence** from seNorge only as an optional hint, with the 1 km limitation written in the UI.
5. **Offsets** from cross-country logs only.

## Unresolved decisions

1. Should classic and skate ever diverge in the engine? **Recommendation:** not in v1. Revisit if glove or leg feedback differs in logs.
2. Is a user-drawn line acceptable UX, or do people only understand named trails? **Open question.** Named trails without Sporet may be too incomplete to be the only UI.
3. Wax, kick zone, and fluorocarbon rules are out of scope. Do not add them under clothing.
