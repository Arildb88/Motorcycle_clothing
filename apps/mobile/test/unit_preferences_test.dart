import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/utils/unit_conversions.dart';
import 'package:motorcycle_clothing/utils/unit_format.dart';
import 'package:motorcycle_clothing/state/unit_preferences_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('unit conversions', () {
    test('C ↔ F', () {
      expect(celsiusToFahrenheit(0), closeTo(32, 0.001));
      expect(celsiusToFahrenheit(10), closeTo(50, 0.001));
      expect(fahrenheitToCelsius(50), closeTo(10, 0.001));
      expect(fahrenheitToCelsius(32), closeTo(0, 0.001));
      expect(convertTemperatureC(10, 'fahrenheit'), closeTo(50, 0.001));
      expect(convertTemperatureC(10, 'celsius'), 10);
    });

    test('km ↔ miles and metres', () {
      expect(kilometersToMiles(1.609344), closeTo(1, 0.0001));
      expect(milesToKilometers(1), closeTo(1.609344, 0.0001));
      expect(convertDistanceMeters(1609.344, 'mile'), closeTo(1, 0.0001));
      expect(convertDistanceMeters(1000, 'kilometer'), closeTo(1, 0.0001));
    });

    test('km/h ↔ mph', () {
      expect(kmhToMph(160.9344), closeTo(100, 0.001));
      expect(mphToKmh(100), closeTo(160.9344, 0.001));
      expect(convertSpeedKmh(100, 'mph'), closeTo(62.137, 0.01));
      expect(convertSpeedKmh(100, 'kmh'), 100);
    });

    test('m/s ↔ km/h ↔ mph', () {
      expect(msToKmh(10), closeTo(36, 0.001));
      expect(msToMph(10), closeTo(22.369, 0.01));
      expect(convertWindMs(10, 'kmh'), closeTo(36, 0.001));
      expect(convertWindMs(10, 'mph'), closeTo(22.369, 0.01));
      expect(convertWindMs(10, 'ms'), 10);
    });
  });

  group('unit formatting', () {
    test('formats temperature and wind for display', () {
      final metric = UnitFormat();
      expect(metric.temperatureFromC(15), '15 °C');
      expect(metric.windFromMs(6), '6 m/s');

      final imperial = UnitFormat(
        temperatureUnit: 'fahrenheit',
        windSpeedUnit: 'mph',
        speedUnit: 'mph',
        distanceUnit: 'mile',
      );
      expect(imperial.temperatureFromC(15), '59 °F');
      expect(imperial.temperatureRangeFromC(10, 15), '50–59 °F');
      expect(imperial.speedFromKmh(100), contains('mph'));
      expect(imperial.distanceFromMeters(160934.4), contains('mi'));
    });

    test('display conversion does not mutate canonical inputs', () {
      const canonicalC = 10.0;
      final shown = convertTemperatureC(canonicalC, 'fahrenheit');
      expect(canonicalC, 10.0);
      expect(fahrenheitToCelsius(shown), closeTo(10.0, 0.001));
    });
  });

  group('unit preferences controller', () {
    test('defaults are metric / SI wind', () async {
      SharedPreferences.setMockInitialValues({});
      final c = UnitPreferencesController();
      await c.hydrate();
      expect(c.temperatureUnit, 'celsius');
      expect(c.distanceUnit, 'kilometer');
      expect(c.speedUnit, 'kmh');
      expect(c.windSpeedUnit, 'ms');
    });

    test('explicit preference overrides defaults and persists', () async {
      SharedPreferences.setMockInitialValues({});
      final c = UnitPreferencesController();
      await c.setAll(
        temperatureUnit: 'fahrenheit',
        distanceUnit: 'mile',
        speedUnit: 'mph',
        windSpeedUnit: 'mph',
      );
      expect(c.temperatureUnit, 'fahrenheit');

      final c2 = UnitPreferencesController();
      await c2.hydrate();
      expect(c2.temperatureUnit, 'fahrenheit');
      expect(c2.distanceUnit, 'mile');
      expect(c2.toApiBody()['units'], 'fahrenheit');
    });

    test('profile apply overrides local cache', () async {
      SharedPreferences.setMockInitialValues({
        'unit_temperature': 'fahrenheit',
      });
      final c = UnitPreferencesController();
      await c.hydrate();
      expect(c.temperatureUnit, 'fahrenheit');
      await c.applyFromProfile({
        'units': 'celsius',
        'distanceUnit': 'kilometer',
        'speedUnit': 'kmh',
        'windSpeedUnit': 'ms',
      });
      expect(c.temperatureUnit, 'celsius');
    });
  });
}
