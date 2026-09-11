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
    expect(localizeReasonCode('UNKNOWN_CODE', l10n), 'UNKNOWN_CODE');
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
}
