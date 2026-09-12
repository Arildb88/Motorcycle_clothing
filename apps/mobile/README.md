# RideWear mobile (`apps/mobile`)

Flutter client for RideWear.

## Local configuration

### API

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api
```

Android emulator → host: `10.0.2.2`. iOS simulator → `localhost`.

### Google Maps Platform (place search + route preview)

Never commit API keys. Pass a **restricted** key at build/run time:

```bash
flutter run --dart-define=GOOGLE_MAPS_API_KEY=YOUR_KEY
# or
flutter build apk --debug --dart-define=GOOGLE_MAPS_API_KEY=YOUR_KEY
```

**Enable on the Google Cloud project**

- Places API (New) — autocomplete + place details
- Routes API — preview geometry (`computeRoutes`)

**Key restrictions (required)**

- Android: application restriction by package name + SHA-1
- iOS: application restriction by bundle id
- API restriction: Places API (New) + Routes API only  
  (add Maps SDK only if you later enable native map tiles)

Without `GOOGLE_MAPS_API_KEY`, debug builds use an in-memory fake catalog so CI and local UI work offline. Production builds must supply a restricted key.

Motorcycle preview requests Google `TWO_WHEELER` when available (beta). If unsupported, the UI falls back to `DRIVE` geometry and shows an explicit warning.

### Ads (optional)

```bash
flutter run --dart-define=ADS_ENABLED=true
```
