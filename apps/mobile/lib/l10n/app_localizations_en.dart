// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'RideWear';

  @override
  String get navToday => 'Today';

  @override
  String get navRoutes => 'Routes';

  @override
  String get navWardrobe => 'Wardrobe';

  @override
  String get navProfile => 'Profile';

  @override
  String get language => 'Language';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageNorwegian => 'Norsk';

  @override
  String get languageSaved => 'Language saved';

  @override
  String get quickRoutes => 'Quick routes';

  @override
  String get planNewRide => 'Plan new ride';

  @override
  String get leaveNow => 'Leave now';

  @override
  String get todayAt => 'Today at…';

  @override
  String get tomorrowAt => 'Tomorrow at…';

  @override
  String get customDateTime => 'Custom date/time';

  @override
  String get whenLeaving => 'When are you leaving?';

  @override
  String get tapSavedRoute =>
      'Tap a saved route to calculate today’s weather and kit.';

  @override
  String get profileSaved => 'Profile saved';

  @override
  String get reasonColdMountain =>
      'Cold exposure expected on the mountain section.';

  @override
  String get reasonRain => 'Rain exposure is likely along the route.';

  @override
  String get reasonStrongWind => 'Strong wind is expected on exposed sections.';

  @override
  String get reasonPersonalColdHands =>
      'Based on your rides, your hands often get cold in similar conditions.';
}
