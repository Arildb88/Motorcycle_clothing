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

/// Maps engine reason codes → localized presentation (M3-ready).
String localizeReasonCode(String code, AppLocalizationsLookup l10n) {
  switch (code) {
    case 'COLD_MOUNTAIN_SEGMENT':
      return l10n.reasonColdMountain;
    case 'RAIN_EXPOSURE':
      return l10n.reasonRain;
    case 'STRONG_WIND':
      return l10n.reasonStrongWind;
    case 'PERSONAL_COLD_HANDS_HISTORY':
      return l10n.reasonPersonalColdHands;
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
}
