# Geo data strategy

Planning document only. No provider is added by this document.

Access date: 2026-10-01.

Labels: **Fact**, **Recommendation**, **Assumption**, **Open question**.

Norway is the first geography. Europe is a later expansion, not a second architecture.

## 1. What RideWear already does

**Fact.** Place search and road preview go through the NestJS API. The Flutter app does not hold `ORS_API_KEY`. The road adapter is HeiGIT OpenRouteService `driving-car` at `https://api.heigit.org/openrouteservice/v2/directions/driving-car`. Geocoding uses HeiGIT Pelias. Preview geometry is ephemeral. `analyzePlanRoute` stores waypoint endpoints, not the dense line. RideWear is not a navigator.

**Fact.** That stack answers motorcycle road geometry. It does not answer elevation, ski pistes, or groomed cross-country tracks.

## 2. Provider-independent ports

**Recommendation.** Keep activity code on ports. Add ports only when a second activity needs them. Do not add them in this task.

| Port | Responsibility | Exists? |
|---|---|---|
| `GeocodingPort` | Query to place id to coordinate and label | Pelias is wired for search; the port is not yet as general as routing |
| `RoutingPort` | Waypoints and preferences to distance, duration, travel segments, ephemeral geometry | Yes |
| `ElevationPort` | Coordinate to ground height in metres, plus source id | No |
| `ActivityGeometryPort` | Named networks that are not a road route: resort lifts/pistes, groomed tracks, signed cycle routes | No |

Adapters stay inside the API. A failed provider returns null and the caller uses the existing safe fallback (saved points, no invented geometry). Dense lines stay out of the database unless a later, explicit decision says a snapshot is required.

## 3. Norway-first sources

### Place search and names

**Fact.** Kartverket's place-name API reads the national place-name register (SSR). The developer guide says the service does not require registration. Example host documented by Kartverket: `https://ws.geonorge.no/stedsnavn/v1/`. Source: [Brukarrettleiing stadnamn-API](https://kartverket.no/api-og-data/stedsnavndata/brukarrettleiing-stadnamn-api), accessed 2026-10-01.

**Fact.** Kartverket's free products are CC BY 4.0. The terms, last updated 21 July 2026, require the credit `© Kartverket` where the product is shown, with a link when possible. SSR has database protection: a systematic extract must be credited (their example: "Alle stadnamn er henta frå SSR ©Kartverket"). Single incidental names are treated differently from a bulk extract. Products are supplied as-is. Some WMS zoom levels include Geovekst data that may be viewed under the service terms but not copied without further permission. Source: [Vilkår for bruk](https://kartverket.no/api-og-data/vilkar-for-bruk), accessed 2026-10-01.

**Recommendation.** For Norwegian place labels, prefer Kartverket SSR behind `GeocodingPort`, and keep Pelias as a fallback for places SSR does not cover (venues, foreign addresses). Show `© Kartverket` when SSR names are shown as a set.

**Open question.** The exact address-search endpoint, its rate limit, and whether it is the right matcher for street addresses were not re-validated in this pass. Confirm on Geonorge before replacing Pelias for street queries.

### Roads

**Fact.** HeiGIT's standard plan, quoted from [account.heigit.org/info/plans](https://account.heigit.org/info/plans) on 2026-10-01, allows Directions V2 at 2,000 requests/day and 40/minute, Geocoding at 3,000/day and 100/minute, and Elevation at 2,000/day and 40/minute. The collaborative plan (humanitarian, academic, governmental, or not-for-profit, by application) raises Directions to 10,000/day and 60/minute. An on-premise install is listed with no hosted quota.

**Fact.** HeiGIT's restriction page lists a 6,000 km maximum for driving and cycling profiles. Source: [openrouteservice.org/restrictions](https://openrouteservice.org/restrictions/), accessed 2026-10-01.

**Fact.** Indexed text of the HeiGIT terms says openrouteservice results are CC BY-SA 4.0. The terms page itself is client-rendered and was not fully extracted on 2026-10-01, so treat share-alike as a constraint to confirm with the current terms before storing or republishing geometry. Source: [openrouteservice.org/terms-of-service](https://openrouteservice.org/terms-of-service/).

**Fact.** The deprecated host `api.openrouteservice.org` was scheduled for shutdown in a HeiGIT forum notice (window cited as 2–6 November 2026). RideWear already calls `api.heigit.org`. Source: [forum notice](https://ask.openrouteservice.org/t/reducing-the-quota-of-deprecated-api-api-openrouteservice-org/8013), accessed 2026-10-01.

**Recommendation.** Keep ORS as the development road engine. Do not persist the polyline. Cache a short-lived preview only if a measured quota problem appears. A commercial RideWear app should not assume the collaborative quota. If daily direction calls approach 2,000, the next step is an explicit decision: on-premise ORS, a paid routing contract, or fewer previews (for example preview on edit, not on every recommendation).

**Open question.** Norwegian road authority data (NVDB) was not reviewed line by line here. It may be a better attribution story for Norway later. It is not required to keep the current motorcycle flow working.

### Elevation

**Fact.** Kartverket's open elevation API returns a height for a coordinate. The catalogue entry lists CC BY 4.0, open access, and no stated use restriction on the catalogue page. Depths from the same API must not be used for navigation. The service text says breaking changes get at least three months' notice on Geonorge. Endpoint documented there: `https://ws.geonorge.no/hoydedata/v1/` with `/punkt` as the preferred call. Source: [Geonorge metadata](https://kartkatalog.geonorge.no/metadata/aapent-api-for-hoeyde--og-dybdedata/71ad2bf9-06e8-469f-9ffa-296182274154) and [Swagger](https://ws.geonorge.no/hoydedata/v1/), accessed 2026-10-01.

**Fact.** Open-Meteo's elevation API uses Copernicus DEM GLO-90 at 90 m and accepts up to 100 coordinates per call. The free API is non-commercial. Source: [elevation docs](https://open-meteo.com/en/docs/elevation-api) and [terms](https://open-meteo.com/en/terms), accessed 2026-10-01.

**Recommendation.** For Norway, `ElevationPort` should call Kartverket `/punkt` and pass that integer metre value into weather requests. Credit `© Kartverket`. Use Open-Meteo elevation only under a licence that allows RideWear's actual use (see the weather document: ads make the free tier a poor fit). HeiGIT elevation is a third option but shares the small daily quota.

**Assumption.** Kartverket's national model is finer in Norway than a 90 m global DEM. This document does not cite a measured error table. Validate on a steep resort before trusting either source for a summit-versus-base decision.

### Cycling networks

**Fact.** ORS cycling profiles are subject to the same 6,000 km cap as driving on the restrictions page. The profile is still a road/path graph from OpenStreetMap, not a Norwegian signed-route register.

**Recommendation.** Cycling geometry should be a `RoutingPort` profile (`cycling-*`), selected by the activity, not a second routing stack. Surface and elevation come from the profile's extra attributes where ORS supplies them, plus `ElevationPort` on sample points. A later Norwegian cycle-route dataset can be another adapter if its licence allows the use.

**Open question.** Coverage of winter cycling and gravel in OSM is uneven. Do not promise surface-accurate routing until sampled routes in Norway are checked.

### Alpine resorts, pistes, and lifts

**Fact.** OpenStreetMap tags `piste:type=downhill` and `aerialway=*` describe slopes and lifts. OpenSnowMap republishes an OSM extract of those tags under ODbL and asks for attribution to OpenStreetMap contributors. Tiles are CC BY-SA. Bulk tile scraping is forbidden. Source: [opensnowmap.org data page](https://www.opensnowmap.org/iframes/data.html), accessed 2026-10-01.

**Fact.** The Norwegian OSM ski-trail guide says not to trace Skisporet, skiinfo resort maps, or similar third-party maps into OSM. Source: [No:Veileder skiløyper](https://wiki.openstreetmap.org/wiki/No:Veileder_skil%C3%B8yper), accessed 2026-10-01.

**Fact.** There is no Kartverket product cited in this pass that is a national alpine piste and lift graph.

**Recommendation.** Treat a resort as a place with named sample sites (base, mid, upper), not as a road route. Geometry for "where is the top lift" can come from OSM aerialway endpoints when present, with elevation from Kartverket. Missing OSM coverage must degrade to user-chosen or manually curated resort points, not to a scraped operator map.

**Open question.** A resort list with maintained base/mid/summit coordinates may be worth a small RideWear-owned dataset later. Licensing any commercial resort feed is a separate decision. Do not copy trail maps from operator sites.

### Cross-country tracks

**Fact.** Skiforeningen describes Sporet as the national grooming and snow-condition service formed from Skisporet and iMarka. A Skiforeningen FAQ answer states that GPS data is only to be used in Sporet and that sharing outside Sporet needs a written agreement. Source: [Skiforeningen news page](https://www.skiforeningen.no/nyheter/landsdekkende-foremelding/), accessed 2026-10-01.

**Fact.** A third-party Home Assistant integration calls `https://api.sporet.no/loypeapi/public/skiroutes/{id}/details` with a bearer token taken from a logged-in browser session. That is not a published RideWear licence. Source: [toringer/home-assistant-sporet](https://github.com/toringer/home-assistant-sporet), accessed 2026-10-01. **Do not treat this as permission to integrate.**

**Fact.** OSM `piste:type=nordic` is the open geometry alternative, under ODbL, and the OSM guide warns that many real trails are absent.

**Fact.** seNorge snow maps are a 1 km model of snow conditions for Norway, produced by NVE with MET and Kartverket, not a track centreline. MET's THREDDS catalogue for seNorge says data are NLOD and CC BY 4.0 unless a file says otherwise, and that the service may block heavy clients. Sources: [NVE](https://www.nve.no/vann-og-vassdrag/vannets-kretsloep/snoe/snoekart-paa-senorge-no/) and [MET THREDDS](https://thredds.met.no/thredds/catalog/senorge/catalog.html), accessed 2026-10-01.

**Recommendation.** Track geometry for clothing comes from a user-drawn line or from OSM nordic pistes when the licence and coverage are acceptable. Grooming status from Sporet is out of scope until Skiforeningen grants a written licence. seNorge can later inform "is there likely snow" at 1 km, which is too coarse to place a skier on a trail.

### Administrative context

**Fact.** SSR responses include municipality number and name status. That is enough to label a Norwegian place without a second geocoder.

**Recommendation.** Store a municipality or country code on a saved place only when the product needs it for attribution or for choosing a national adapter. Do not build a general GIS.

## 4. Europe later

**Fact.** ORS and OSM are already continental. Kartverket elevation and SSR are not. MET locationforecast covers the globe, but the fine Nordic model does not (see the weather document).

**Recommendation.** `ElevationPort` and `GeocodingPort` take a country or bounding box and choose an adapter. Norway uses Kartverket. Outside Norway, a global DEM adapter is allowed only under a commercial-compatible licence. Do not block the domain model on a Norwegian-only coordinate type.

## 5. Caching and storage

**Recommendation.** Compatible with current privacy rules:

- Cache elevation by rounded coordinate (four decimal places matches MET's own coordinate guidance) and source, for weeks, not per user.
- Do not cache Sporet or operator maps.
- Do not store ORS polylines on the route row.
- Attribute in the UI where the licence requires it (Kartverket, MET, OpenStreetMap / HeiGIT).

## 6. Suggested order when implementation is eventually authorized

1. `ElevationPort` with Kartverket for Norwegian coordinates, used only to fill MET `altitude`.
2. Cycling profile on the existing routing port.
3. Resort sample points (base / mid / upper) as data, not a piste router.
4. OSM nordic-piste read, only after an ODbL attribution design.
5. Anything from Sporet only after a written licence.

None of these steps are authorized by this document.
