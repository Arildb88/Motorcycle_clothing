/// Canonical internal units for RideWear calculations / API payloads.
///
/// Display conversion happens only at the presentation boundary.
/// The motorcycle recommendation engine always uses these SI-oriented values.
library;

/// Temperature from the weather API / exposure engine (°C).
const String canonicalTemperatureUnit = 'celsius';

/// Meteorological wind from the weather API (m/s).
const String canonicalWindSpeedUnit = 'ms';

/// Riding / cruise speed conventions in the motorcycle engine (km/h).
const String canonicalSpeedUnit = 'kmh';

/// Route geometry distances from APIs (metres).
const String canonicalDistanceUnit = 'meter';

// --- Temperature (°C ↔ °F) ---

double celsiusToFahrenheit(double celsius) => celsius * 9 / 5 + 32;

double fahrenheitToCelsius(double fahrenheit) => (fahrenheit - 32) * 5 / 9;

double convertTemperatureC(double celsius, String temperatureUnit) {
  switch (temperatureUnit) {
    case 'fahrenheit':
      return celsiusToFahrenheit(celsius);
    case 'celsius':
    default:
      return celsius;
  }
}

// --- Distance (m / km ↔ mi) ---

const double _metersPerMile = 1609.344;
const double _metersPerKilometer = 1000;

double metersToKilometers(double meters) => meters / _metersPerKilometer;

double metersToMiles(double meters) => meters / _metersPerMile;

double kilometersToMiles(double km) => km / 1.609344;

double milesToKilometers(double miles) => miles * 1.609344;

double convertDistanceMeters(double meters, String distanceUnit) {
  switch (distanceUnit) {
    case 'mile':
      return metersToMiles(meters);
    case 'kilometer':
    default:
      return metersToKilometers(meters);
  }
}

// --- Riding speed (km/h ↔ mph) ---

const double _kmhPerMph = 1.609344;

double kmhToMph(double kmh) => kmh / _kmhPerMph;

double mphToKmh(double mph) => mph * _kmhPerMph;

double convertSpeedKmh(double kmh, String speedUnit) {
  switch (speedUnit) {
    case 'mph':
      return kmhToMph(kmh);
    case 'kmh':
    default:
      return kmh;
  }
}

// --- Wind (m/s ↔ km/h ↔ mph) ---

double msToKmh(double ms) => ms * 3.6;

double msToMph(double ms) => ms * 2.2369362920544;

double kmhToMs(double kmh) => kmh / 3.6;

double mphToMs(double mph) => mph / 2.2369362920544;

double convertWindMs(double ms, String windSpeedUnit) {
  switch (windSpeedUnit) {
    case 'kmh':
      return msToKmh(ms);
    case 'mph':
      return msToMph(ms);
    case 'ms':
    default:
      return ms;
  }
}
