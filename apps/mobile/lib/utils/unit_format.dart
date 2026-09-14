import 'package:intl/intl.dart';
import 'package:motorcycle_clothing/utils/unit_conversions.dart';

/// Formats canonical SI values for display using the user's unit preferences.
class UnitFormat {
  UnitFormat({
    this.temperatureUnit = 'celsius',
    this.distanceUnit = 'kilometer',
    this.speedUnit = 'kmh',
    this.windSpeedUnit = 'ms',
    this.localeName,
  });

  final String temperatureUnit;
  final String distanceUnit;
  final String speedUnit;
  final String windSpeedUnit;
  final String? localeName;

  NumberFormat get _number => NumberFormat.decimalPattern(localeName);

  String _n(num value, {int fractionDigits = 0}) {
    final v = double.parse(value.toStringAsFixed(fractionDigits));
    return _number.format(v);
  }

  /// Formats °C (canonical) → preferred temperature unit with symbol.
  String temperatureFromC(num celsius, {int fractionDigits = 0}) {
    final converted = convertTemperatureC(celsius.toDouble(), temperatureUnit);
    final symbol = temperatureUnit == 'fahrenheit' ? '°F' : '°C';
    return '${_n(converted, fractionDigits: fractionDigits)} $symbol';
  }

  /// Formats a °C range (e.g. min–max weather).
  String temperatureRangeFromC(
    num minC,
    num maxC, {
    int fractionDigits = 0,
  }) {
    final min = convertTemperatureC(minC.toDouble(), temperatureUnit);
    final max = convertTemperatureC(maxC.toDouble(), temperatureUnit);
    final symbol = temperatureUnit == 'fahrenheit' ? '°F' : '°C';
    return '${_n(min, fractionDigits: fractionDigits)}–${_n(max, fractionDigits: fractionDigits)} $symbol';
  }

  /// Formats metres (canonical) → km or mi.
  String distanceFromMeters(num meters, {int fractionDigits = 0}) {
    final converted = convertDistanceMeters(meters.toDouble(), distanceUnit);
    final symbol = distanceUnit == 'mile' ? 'mi' : 'km';
    return '${_n(converted, fractionDigits: fractionDigits)} $symbol';
  }

  /// Formats km/h (canonical riding speed) → km/h or mph.
  String speedFromKmh(num kmh, {int fractionDigits = 0}) {
    final converted = convertSpeedKmh(kmh.toDouble(), speedUnit);
    final symbol = speedUnit == 'mph' ? 'mph' : 'km/h';
    return '${_n(converted, fractionDigits: fractionDigits)} $symbol';
  }

  /// Formats m/s (canonical wind) → m/s, km/h, or mph.
  String windFromMs(num ms, {int fractionDigits = 0}) {
    final converted = convertWindMs(ms.toDouble(), windSpeedUnit);
    final String symbol;
    switch (windSpeedUnit) {
      case 'kmh':
        symbol = 'km/h';
        break;
      case 'mph':
        symbol = 'mph';
        break;
      case 'ms':
      default:
        symbol = 'm/s';
    }
    return '${_n(converted, fractionDigits: fractionDigits)} $symbol';
  }
}
