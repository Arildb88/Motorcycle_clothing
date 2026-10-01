# Alpine skiing and snowboard plan

Planning only. Do not implement from this file.

Access date: 2026-10-01. Geo and weather evidence is in `docs/architecture/GEO_DATA_STRATEGY.md` and `docs/research/WEATHER_DATA_QUALITY.md`.

Labels: **Fact**, **Recommendation**, **Assumption**, **Open question**.

## Scope

**Fact.** `ACTIVITY_TYPES` already contains `alpine_skiing` and `snowboarding` as separate values. `ARCHITECTURE.md` §15 says they may share an alpine exposure engine and must not be merged into one activity type. This task treats them as one family. That matches §15. This plan does not change the enums.

**Fact.** Neither value is in `SELECTABLE_ACTIVITIES` today. The UI must not show a fake alpine kit.

## Intended MVP

**Recommendation.** The rider picks alpine skiing or snowboard, picks a resort session (not a road route), and gets clothing for the spread between base and upper mountain during the hours they will be out.

MVP includes:

- Session start and end, or start plus duration.
- Three sample sites when known: base, mid, upper. If only base and upper exist, use those two. Never treat the village forecast as the summit.
- Weather at each site’s coordinate and ground elevation, at a time inside the session (start, middle, end if the session is long).
- Wear versus pack: what is worn on the hill, what is in the pack for a change of layer, and what is left in the car or locker if the model can say so without inventing a locker feature.
- Discipline as a label (ski or snowboard) for copy and wardrobe tags, with the same exposure function until evidence says the physiology differs.

MVP excludes piste routing, avalanche forecasting, lift-status maps, and live mountain webcams.

## User inputs

**Recommendation.**

- Resort, resolved to a coordinate set. If the resort is unknown, the user drops pins for base and upper.
- Date and start time, plus end time or a duration (half day / day).
- Discipline: alpine skiing or snowboard.
- Optional: mostly on lifts and groomers, or a lot of hiking/sidecountry waiting in the wind. This is exposure, not a navigation mode.

**Assumption.** A typical session is two to six hours with repeated short descents and stationary lift time. The coldest worn kit is set by waiting in the wind at the top, not by the one-minute descent.

## Wardrobe taxonomy

**Recommendation.** Shared wardrobe, alpine presets added later:

| Zone | Examples | Notes |
|---|---|---|
| Torso | Base, light or heavy mid, shell | Shell is usually worn; insulation varies with height and wind |
| Legs | Shell pants, insulated pants | Wet snow versus cold dry snow |
| Hands | Liner gloves, insulated mittens | High priority; dexterity versus warmth is a pack decision |
| Feet | Socks, liner sock | Boots are equipment, not a clothing tier in v1 |
| Head | Helmet liner, buff, goggles as a note | Goggles are equipment; fogging can be a reason code later |
| Neck | Neck gaiter | Wind at the top |

**Recommendation.** Do not score a snowboard and a ski jacket as different physics in v1. Tag both as alpine outerwear. Style differences are names, not engines.

## Weather and exposure

**Recommendation.**

- Always request forecasts at the sample elevations. MET’s `altitude` parameter exists specifically because the default terrain model is coarse in hills. See the weather document.
- Report the session as a range: base temperature, upper temperature, max wind, max precipitation probability. The worn kit follows the harsher of sustained upper-mountain wind and the colder of the two sites, unless the user said they will stay at the base.
- Lift queue is low metabolic heat and high wind. Descent is short. **Recommendation:** weight waiting time above descent time when estimating sustained demand. The exact split is an open parameter, not a measured constant.
- Snow quality and avalanche hazard are out of scope for clothing tiers. A link-shaped reason code can later say "conditions may be hazardous" only if a licensed source is chosen. seNorge is a 1 km snow model, not a slope-scale hazard product.

**Assumption.** 300–800 m of vertical is enough to matter. Unmeasured. The validation plan in the weather document is how to check it.

## Geo and location

**Fact.** There is no national open alpine piste graph cited in the geo strategy. OSM has `piste:type=downhill` and `aerialway` under ODbL. Operator maps must not be traced.

**Recommendation.** MVP location model is three points, not a piste router.

- Curate nothing in code now.
- Later, an adapter may fill upper from the highest aerialway endpoint inside a resort polygon if OSM has it, then `ElevationPort` (Kartverket in Norway) sets the height.
- If OSM has no lift, the user supplies the upper point. Do not scrape resort websites.

## Reuse versus new logic

| Reuse | Do not reuse |
|---|---|
| Account, units, l10n, shared wardrobe, plan snapshot | Motorcycle speed airflow |
| Weather port with elevation and time | Road routing as the definition of the session |
| Wear / pack / reason codes | Motorcycle personal offsets |
| Distinct activity types for ski and snowboard | A single blended "snow" activity that erases the user’s choice |

## Data dependencies

- Coordinates and heights for base and upper (user or later OSM plus Kartverket).
- MET locationforecast with `altitude`, at session times.
- Optional later: a licensed resort directory.
- Not required for MVP: Sporet, seNorge, WeatherKit, Meteomatics.

## Staged roadmap

1. **MVP.** Manual base/upper, MET with height, shared kit language, no piste map.
2. **Mid point** when a third height is available.
3. **OSM lift tops** as a helper, with attribution, behind a port.
4. **Discipline-specific copy and presets** (mitten versus glove, pant gaiter) without a second engine.
5. **Personal offsets** per alpine activity type, not shared with cycling or motorcycle.

## Unresolved decisions

1. Does snowboard stay on the alpine engine forever? **Recommendation:** yes until a logged difference shows up. **Fact:** the stored type stays distinct either way.
2. How is "mid-mountain" defined when the resort does not publish it? **Recommendation:** the elevation halfway between base and upper, forecast at that height, labeled as an estimate.
3. Should a whiteout or wind-hold message exist without a hazard feed? **Recommendation:** only as generic copy that appropriate clothing does not make a closed mountain safe. No fake avalanche score.
