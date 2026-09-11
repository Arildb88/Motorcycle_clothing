// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Norwegian Bokmål (`nb`).
class AppLocalizationsNb extends AppLocalizations {
  AppLocalizationsNb([String locale = 'nb']) : super(locale);

  @override
  String get appTitle => 'RideWear';

  @override
  String get navToday => 'I dag';

  @override
  String get navRoutes => 'Ruter';

  @override
  String get navWardrobe => 'Garderobe';

  @override
  String get navProfile => 'Profil';

  @override
  String get language => 'Språk';

  @override
  String get languageEnglish => 'English';

  @override
  String get languageNorwegian => 'Norsk';

  @override
  String get languageSaved => 'Språk lagret';

  @override
  String get quickRoutes => 'Hurtigruter';

  @override
  String get planNewRide => 'Planlegg ny tur';

  @override
  String get leaveNow => 'Dra nå';

  @override
  String get todayAt => 'I dag kl…';

  @override
  String get tomorrowAt => 'I morgen kl…';

  @override
  String get customDateTime => 'Egendefinert dato/tid';

  @override
  String get whenLeaving => 'Når drar du?';

  @override
  String get tapSavedRoute =>
      'Trykk på en lagret rute for å beregne dagens vær og antrekk.';

  @override
  String get profileSaved => 'Profil lagret';

  @override
  String get reasonColdMountain =>
      'Det er ventet kald eksponering på fjellstrekningen.';

  @override
  String get reasonRain => 'Det er sannsynlig med regn langs ruten.';

  @override
  String get reasonStrongWind =>
      'Det er ventet sterk vind på eksponerte strekninger.';

  @override
  String get reasonPersonalColdHands =>
      'Ut fra turene dine blir hendene ofte kalde under lignende forhold.';
}
