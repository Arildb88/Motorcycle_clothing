# RideWear mobile (`apps/mobile`)

Flutter client for RideWear.

## Local configuration

### API

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api
```

Android emulator → host: `10.0.2.2`. iOS simulator → `localhost`.

### Place search and route preview

Both go through the RideWear API. Do **not** put an OpenRouteService key in the Flutter app.

On the API host set:

```bash
ROUTING_PROVIDER=ors
ORS_API_KEY=your-heigit-key
```

Directions use `https://api.heigit.org/openrouteservice/`. Geocoding uses HeiGIT Pelias autocomplete. The API returns each suggestion's coordinates, and selecting a suggestion uses those coordinates. HeiGIT does not serve `/pelias/v1/place`. The preview is road-following **driving** geometry and is not motorcycle-optimized. There is no basemap yet; the screen draws the returned line schematically.

`GOOGLE_MAPS_API_KEY` is not required for normal RideWear routing or place search.

### Ads (optional)

```bash
flutter run --dart-define=ADS_ENABLED=true
```
