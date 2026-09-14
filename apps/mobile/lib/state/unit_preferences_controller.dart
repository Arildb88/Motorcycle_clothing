import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:motorcycle_clothing/utils/unit_format.dart';

/// Account-level unit preferences (language-neutral enum codes).
///
/// Source of truth after login: `UserProfile` on the API.
/// Local SharedPreferences cache is used before profile loads and offline.
class UnitPreferencesController extends ChangeNotifier {
  UnitPreferencesController();

  static const _kTemp = 'unit_temperature';
  static const _kDistance = 'unit_distance';
  static const _kSpeed = 'unit_speed';
  static const _kWind = 'unit_wind';

  static const defaultTemperatureUnit = 'celsius';
  static const defaultDistanceUnit = 'kilometer';
  static const defaultSpeedUnit = 'kmh';
  static const defaultWindSpeedUnit = 'ms';

  String temperatureUnit = defaultTemperatureUnit;
  String distanceUnit = defaultDistanceUnit;
  String speedUnit = defaultSpeedUnit;
  String windSpeedUnit = defaultWindSpeedUnit;

  UnitFormat formatter({String? localeName}) => UnitFormat(
        temperatureUnit: temperatureUnit,
        distanceUnit: distanceUnit,
        speedUnit: speedUnit,
        windSpeedUnit: windSpeedUnit,
        localeName: localeName,
      );

  Future<void> hydrate() async {
    final prefs = await SharedPreferences.getInstance();
    temperatureUnit = prefs.getString(_kTemp) ?? defaultTemperatureUnit;
    distanceUnit = prefs.getString(_kDistance) ?? defaultDistanceUnit;
    speedUnit = prefs.getString(_kSpeed) ?? defaultSpeedUnit;
    windSpeedUnit = prefs.getString(_kWind) ?? defaultWindSpeedUnit;
    notifyListeners();
  }

  /// Apply profile fields from `GET /users/me` (explicit account choice wins).
  Future<void> applyFromProfile(Map<String, dynamic>? profile) async {
    if (profile == null) return;
    final temp = profile['units']?.toString();
    final distance = profile['distanceUnit']?.toString();
    final speed = profile['speedUnit']?.toString();
    final wind = profile['windSpeedUnit']?.toString();
    await setAll(
      temperatureUnit: _validTemp(temp) ? temp : null,
      distanceUnit: _validDistance(distance) ? distance : null,
      speedUnit: _validSpeed(speed) ? speed : null,
      windSpeedUnit: _validWind(wind) ? wind : null,
    );
  }

  Future<void> setAll({
    String? temperatureUnit,
    String? distanceUnit,
    String? speedUnit,
    String? windSpeedUnit,
  }) async {
    if (temperatureUnit != null && _validTemp(temperatureUnit)) {
      this.temperatureUnit = temperatureUnit;
    }
    if (distanceUnit != null && _validDistance(distanceUnit)) {
      this.distanceUnit = distanceUnit;
    }
    if (speedUnit != null && _validSpeed(speedUnit)) {
      this.speedUnit = speedUnit;
    }
    if (windSpeedUnit != null && _validWind(windSpeedUnit)) {
      this.windSpeedUnit = windSpeedUnit;
    }
    await _persist();
    notifyListeners();
  }

  Future<void> applyPreset(String preset) async {
    switch (preset) {
      case 'imperial':
        await setAll(
          temperatureUnit: 'fahrenheit',
          distanceUnit: 'mile',
          speedUnit: 'mph',
          windSpeedUnit: 'mph',
        );
        break;
      case 'metric':
      default:
        await setAll(
          temperatureUnit: 'celsius',
          distanceUnit: 'kilometer',
          speedUnit: 'kmh',
          windSpeedUnit: 'ms',
        );
    }
  }

  Map<String, String> toApiBody() => {
        'units': temperatureUnit,
        'distanceUnit': distanceUnit,
        'speedUnit': speedUnit,
        'windSpeedUnit': windSpeedUnit,
      };

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kTemp, temperatureUnit);
    await prefs.setString(_kDistance, distanceUnit);
    await prefs.setString(_kSpeed, speedUnit);
    await prefs.setString(_kWind, windSpeedUnit);
  }

  static bool _validTemp(String? v) =>
      v == 'celsius' || v == 'fahrenheit';
  static bool _validDistance(String? v) =>
      v == 'kilometer' || v == 'mile';
  static bool _validSpeed(String? v) => v == 'kmh' || v == 'mph';
  static bool _validWind(String? v) =>
      v == 'ms' || v == 'kmh' || v == 'mph';
}
