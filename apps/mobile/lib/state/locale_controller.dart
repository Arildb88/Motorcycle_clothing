import 'dart:ui' show PlatformDispatcher;
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Supported UI languages. Domain enums stay language-neutral.
class LocaleController extends ChangeNotifier {
  LocaleController();

  static const supported = [Locale('en'), Locale('nb')];
  static const _prefsKey = 'preferred_language';

  /// Explicit user choice (`en` / `nb`). Null = follow device fallback rules.
  String? _preferredCode;
  String? get preferredCode => _preferredCode;

  Locale get locale => Locale(_preferredCode ?? resolveDeviceFallback());

  /// Device Norwegian → nb, else en. Unknown languages → en.
  static String resolveDeviceFallback([Locale? device]) {
    final loc = device ?? PlatformDispatcher.instance.locale;
    final code = loc.languageCode.toLowerCase();
    if (code == 'nb' || code == 'nn' || code == 'no') return 'nb';
    return 'en';
  }

  Future<void> hydrate() async {
    final prefs = await SharedPreferences.getInstance();
    _preferredCode = prefs.getString(_prefsKey);
    notifyListeners();
  }

  Future<void> setPreferred(String? code) async {
    if (code != null && code != 'en' && code != 'nb') {
      throw ArgumentError('Unsupported language: $code');
    }
    _preferredCode = code;
    final prefs = await SharedPreferences.getInstance();
    if (code == null) {
      await prefs.remove(_prefsKey);
    } else {
      await prefs.setString(_prefsKey, code);
    }
    notifyListeners();
  }

  /// Apply account preference after login (overrides local only when set).
  Future<void> applyFromProfile(String? preferredLanguage) async {
    if (preferredLanguage == null || preferredLanguage.isEmpty) return;
    if (preferredLanguage != 'en' && preferredLanguage != 'nb') return;
    await setPreferred(preferredLanguage);
  }
}

/// Maps engine reason codes → localized presentation (M3).
String localizeReasonCode(String code, AppLocalizationsLookup l10n) {
  switch (code) {
    case 'COLD_MOUNTAIN_SEGMENT':
      return l10n.reasonColdMountain;
    case 'RAIN_EXPOSURE':
      return l10n.reasonRain;
    case 'RAIN_PROTECTION_REQUIRED':
      return l10n.reasonRainProtectionRequired;
    case 'PACK_RAIN_LAYER':
      return l10n.reasonPackRainLayer;
    case 'STRONG_WIND':
      return l10n.reasonStrongWind;
    case 'HIGH_WIND_EXPOSURE':
      return l10n.reasonHighWindExposure;
    case 'PERSONAL_COLD_HANDS_HISTORY':
      return l10n.reasonPersonalColdHands;
    case 'MILD_CONDITIONS':
      return l10n.reasonMildConditions;
    case 'LOW_EFFECTIVE_TEMPERATURE':
      return l10n.reasonLowEffectiveTemperature;
    case 'SUSTAINED_COLD_EXPOSURE':
      return l10n.reasonSustainedColdExposure;
    case 'SHORT_COLD_SEGMENT':
      return l10n.reasonShortColdSegment;
    case 'TEMPERATURE_VARIATION':
      return l10n.reasonTemperatureVariation;
    case 'THERMAL_LINER_RECOMMENDED':
      return l10n.reasonThermalLinerRecommended;
    case 'WATERPROOF_LINER_RECOMMENDED':
      return l10n.reasonWaterproofLinerRecommended;
    case 'VENTS_CLOSED_RECOMMENDED':
      return l10n.reasonVentsClosedRecommended;
    case 'VENTS_OPEN_RECOMMENDED':
      return l10n.reasonVentsOpenRecommended;
    case 'PACK_EXTRA_INSULATION':
      return l10n.reasonPackExtraInsulation;
    case 'WARDROBE_GAP':
      return l10n.reasonWardrobeGap;
    case 'INCOMPLETE_WEATHER':
      return l10n.reasonIncompleteWeather;
    case 'INCOMPLETE_WARDROBE':
      return l10n.reasonIncompleteWardrobe;
    case 'BASELINE_NO_PERSONAL_EVIDENCE':
      return l10n.reasonBaselineNoPersonalEvidence;
    default:
      return code;
  }
}

/// Narrow interface so tests can stub without full gen-l10n.
abstract class AppLocalizationsLookup {
  String get reasonColdMountain;
  String get reasonRain;
  String get reasonStrongWind;
  String get reasonPersonalColdHands;
  String get reasonMildConditions;
  String get reasonLowEffectiveTemperature;
  String get reasonSustainedColdExposure;
  String get reasonShortColdSegment;
  String get reasonRainProtectionRequired;
  String get reasonPackRainLayer;
  String get reasonHighWindExposure;
  String get reasonTemperatureVariation;
  String get reasonThermalLinerRecommended;
  String get reasonWaterproofLinerRecommended;
  String get reasonVentsClosedRecommended;
  String get reasonVentsOpenRecommended;
  String get reasonPackExtraInsulation;
  String get reasonWardrobeGap;
  String get reasonIncompleteWeather;
  String get reasonIncompleteWardrobe;
  String get reasonBaselineNoPersonalEvidence;
}
