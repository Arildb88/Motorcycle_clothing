import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/state/locale_controller.dart';

void main() {
  test('device Norwegian variants fall back to nb', () {
    expect(LocaleController.resolveDeviceFallback(const Locale('nb')), 'nb');
    expect(LocaleController.resolveDeviceFallback(const Locale('nn')), 'nb');
    expect(LocaleController.resolveDeviceFallback(const Locale('no')), 'nb');
  });

  test('unsupported device language falls back to English', () {
    expect(LocaleController.resolveDeviceFallback(const Locale('de')), 'en');
    expect(LocaleController.resolveDeviceFallback(const Locale('fr')), 'en');
    expect(LocaleController.resolveDeviceFallback(const Locale('en')), 'en');
  });

  test('localizeReasonCode maps structured codes', () {
    final l10n = _StubL10n();
    expect(
      localizeReasonCode('STRONG_WIND', l10n),
      'Strong wind is expected on exposed sections.',
    );
    expect(
      localizeReasonCode('HIGH_WIND_EXPOSURE', l10n),
      'High wind / riding airflow increases protection demand.',
    );
    expect(
      localizeReasonCode('THERMAL_LINER_RECOMMENDED', l10n),
      'Install the thermal liner for this ride.',
    );
    expect(localizeReasonCode('UNKNOWN_CODE', l10n), 'UNKNOWN_CODE');
  });

  test('M3 reason codes resolve in English and Norwegian stubs', () {
    final en = _StubL10n();
    final nb = _StubL10nNb();
    expect(
      localizeReasonCode('SUSTAINED_COLD_EXPOSURE', en),
      contains('Sustained cold'),
    );
    expect(
      localizeReasonCode('SUSTAINED_COLD_EXPOSURE', nb),
      contains('Vedvarende kulde'),
    );
  });
}

class _StubL10n implements AppLocalizationsLookup {
  @override
  String get reasonColdMountain =>
      'Cold exposure expected on the mountain section.';

  @override
  String get reasonRain => 'Rain exposure is likely along the route.';

  @override
  String get reasonStrongWind =>
      'Strong wind is expected on exposed sections.';

  @override
  String get reasonPersonalColdHands =>
      'Based on your rides, your hands often get cold in similar conditions.';

  @override
  String get reasonMildConditions =>
      'Conditions are mild — avoid unnecessary insulation.';

  @override
  String get reasonLowEffectiveTemperature =>
      'Motorcycle exposure temperature is low for this ride.';

  @override
  String get reasonSustainedColdExposure =>
      'Sustained cold exposure increases warmth demand.';

  @override
  String get reasonShortColdSegment =>
      'A short cold segment may need packable insulation.';

  @override
  String get reasonRainProtectionRequired =>
      'Rain protection is required for sustained wet exposure.';

  @override
  String get reasonPackRainLayer =>
      'Pack waterproof protection for later or short rain risk.';

  @override
  String get reasonHighWindExposure =>
      'High wind / riding airflow increases protection demand.';

  @override
  String get reasonTemperatureVariation =>
      'Temperature varies along the route.';

  @override
  String get reasonThermalLinerRecommended =>
      'Install the thermal liner for this ride.';

  @override
  String get reasonWaterproofLinerRecommended =>
      'Install the waterproof liner for this ride.';

  @override
  String get reasonVentsClosedRecommended =>
      'Keep vents closed for colder exposure.';

  @override
  String get reasonVentsOpenRecommended =>
      'Open vents for warmer exposure.';

  @override
  String get reasonPackExtraInsulation =>
      'Pack extra insulation for short cold segments.';

  @override
  String get reasonWardrobeGap =>
      'No suitable owned garment found for this need.';

  @override
  String get reasonIncompleteWeather =>
      'Weather coverage is incomplete — lower confidence.';

  @override
  String get reasonIncompleteWardrobe =>
      'Wardrobe coverage is incomplete — lower confidence.';

  @override
  String get reasonBaselineNoPersonalEvidence =>
      'Baseline recommendation — not enough personal ride evidence yet.';
}

class _StubL10nNb extends _StubL10n {
  @override
  String get reasonSustainedColdExposure =>
      'Vedvarende kulde øker behovet for varme.';
}
