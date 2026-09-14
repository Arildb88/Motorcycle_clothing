import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_nb.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('nb'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'RideWear'**
  String get appTitle;

  /// No description provided for @navToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get navToday;

  /// No description provided for @navRoutes.
  ///
  /// In en, this message translates to:
  /// **'Routes'**
  String get navRoutes;

  /// No description provided for @navWardrobe.
  ///
  /// In en, this message translates to:
  /// **'Wardrobe'**
  String get navWardrobe;

  /// No description provided for @navProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get navProfile;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @languageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get languageEnglish;

  /// No description provided for @languageNorwegian.
  ///
  /// In en, this message translates to:
  /// **'Norsk'**
  String get languageNorwegian;

  /// No description provided for @languageSaved.
  ///
  /// In en, this message translates to:
  /// **'Language saved'**
  String get languageSaved;

  /// No description provided for @quickRoutes.
  ///
  /// In en, this message translates to:
  /// **'Quick routes'**
  String get quickRoutes;

  /// No description provided for @planNewRide.
  ///
  /// In en, this message translates to:
  /// **'Plan new ride'**
  String get planNewRide;

  /// No description provided for @leaveNow.
  ///
  /// In en, this message translates to:
  /// **'Leave now'**
  String get leaveNow;

  /// No description provided for @todayAt.
  ///
  /// In en, this message translates to:
  /// **'Today at…'**
  String get todayAt;

  /// No description provided for @tomorrowAt.
  ///
  /// In en, this message translates to:
  /// **'Tomorrow at…'**
  String get tomorrowAt;

  /// No description provided for @customDateTime.
  ///
  /// In en, this message translates to:
  /// **'Custom date/time'**
  String get customDateTime;

  /// No description provided for @whenLeaving.
  ///
  /// In en, this message translates to:
  /// **'When are you leaving?'**
  String get whenLeaving;

  /// No description provided for @tapSavedRoute.
  ///
  /// In en, this message translates to:
  /// **'Tap a saved route to calculate today’s weather and kit.'**
  String get tapSavedRoute;

  /// No description provided for @profileSaved.
  ///
  /// In en, this message translates to:
  /// **'Profile saved'**
  String get profileSaved;

  /// No description provided for @wearSection.
  ///
  /// In en, this message translates to:
  /// **'Wear'**
  String get wearSection;

  /// No description provided for @packSection.
  ///
  /// In en, this message translates to:
  /// **'Pack'**
  String get packSection;

  /// No description provided for @confidenceLabel.
  ///
  /// In en, this message translates to:
  /// **'Confidence'**
  String get confidenceLabel;

  /// No description provided for @reasonColdMountain.
  ///
  /// In en, this message translates to:
  /// **'Cold exposure expected on the mountain section.'**
  String get reasonColdMountain;

  /// No description provided for @reasonRain.
  ///
  /// In en, this message translates to:
  /// **'Rain exposure is likely along the route.'**
  String get reasonRain;

  /// No description provided for @reasonStrongWind.
  ///
  /// In en, this message translates to:
  /// **'Strong wind is expected on exposed sections.'**
  String get reasonStrongWind;

  /// No description provided for @reasonPersonalColdHands.
  ///
  /// In en, this message translates to:
  /// **'Based on your rides, your hands often get cold in similar conditions.'**
  String get reasonPersonalColdHands;

  /// No description provided for @reasonMildConditions.
  ///
  /// In en, this message translates to:
  /// **'Conditions are mild — avoid unnecessary insulation.'**
  String get reasonMildConditions;

  /// No description provided for @reasonLowEffectiveTemperature.
  ///
  /// In en, this message translates to:
  /// **'Motorcycle exposure temperature is low for this ride.'**
  String get reasonLowEffectiveTemperature;

  /// No description provided for @reasonSustainedColdExposure.
  ///
  /// In en, this message translates to:
  /// **'Sustained cold exposure increases warmth demand.'**
  String get reasonSustainedColdExposure;

  /// No description provided for @reasonShortColdSegment.
  ///
  /// In en, this message translates to:
  /// **'A short cold segment may need packable insulation.'**
  String get reasonShortColdSegment;

  /// No description provided for @reasonRainProtectionRequired.
  ///
  /// In en, this message translates to:
  /// **'Rain protection is required for sustained wet exposure.'**
  String get reasonRainProtectionRequired;

  /// No description provided for @reasonPackRainLayer.
  ///
  /// In en, this message translates to:
  /// **'Pack waterproof protection for later or short rain risk.'**
  String get reasonPackRainLayer;

  /// No description provided for @reasonHighWindExposure.
  ///
  /// In en, this message translates to:
  /// **'High wind / riding airflow increases protection demand.'**
  String get reasonHighWindExposure;

  /// No description provided for @reasonTemperatureVariation.
  ///
  /// In en, this message translates to:
  /// **'Temperature varies along the route.'**
  String get reasonTemperatureVariation;

  /// No description provided for @reasonThermalLinerRecommended.
  ///
  /// In en, this message translates to:
  /// **'Install the thermal liner for this ride.'**
  String get reasonThermalLinerRecommended;

  /// No description provided for @reasonWaterproofLinerRecommended.
  ///
  /// In en, this message translates to:
  /// **'Install the waterproof liner for this ride.'**
  String get reasonWaterproofLinerRecommended;

  /// No description provided for @reasonVentsClosedRecommended.
  ///
  /// In en, this message translates to:
  /// **'Keep vents closed for colder exposure.'**
  String get reasonVentsClosedRecommended;

  /// No description provided for @reasonVentsOpenRecommended.
  ///
  /// In en, this message translates to:
  /// **'Open vents for warmer exposure.'**
  String get reasonVentsOpenRecommended;

  /// No description provided for @reasonPackExtraInsulation.
  ///
  /// In en, this message translates to:
  /// **'Pack extra insulation for short cold segments.'**
  String get reasonPackExtraInsulation;

  /// No description provided for @reasonWardrobeGap.
  ///
  /// In en, this message translates to:
  /// **'No suitable owned garment found for this need.'**
  String get reasonWardrobeGap;

  /// No description provided for @reasonIncompleteWeather.
  ///
  /// In en, this message translates to:
  /// **'Weather coverage is incomplete — lower confidence.'**
  String get reasonIncompleteWeather;

  /// No description provided for @reasonIncompleteWardrobe.
  ///
  /// In en, this message translates to:
  /// **'Wardrobe coverage is incomplete — lower confidence.'**
  String get reasonIncompleteWardrobe;

  /// No description provided for @reasonBaselineNoPersonalEvidence.
  ///
  /// In en, this message translates to:
  /// **'Baseline recommendation — not enough personal ride evidence yet.'**
  String get reasonBaselineNoPersonalEvidence;

  /// No description provided for @unitsSection.
  ///
  /// In en, this message translates to:
  /// **'Units'**
  String get unitsSection;

  /// No description provided for @unitsPresetMetric.
  ///
  /// In en, this message translates to:
  /// **'Metric'**
  String get unitsPresetMetric;

  /// No description provided for @unitsPresetImperial.
  ///
  /// In en, this message translates to:
  /// **'Imperial'**
  String get unitsPresetImperial;

  /// No description provided for @unitsTemperature.
  ///
  /// In en, this message translates to:
  /// **'Temperature'**
  String get unitsTemperature;

  /// No description provided for @unitsDistance.
  ///
  /// In en, this message translates to:
  /// **'Distance'**
  String get unitsDistance;

  /// No description provided for @unitsRidingSpeed.
  ///
  /// In en, this message translates to:
  /// **'Riding speed'**
  String get unitsRidingSpeed;

  /// No description provided for @unitsWindSpeed.
  ///
  /// In en, this message translates to:
  /// **'Wind speed'**
  String get unitsWindSpeed;

  /// No description provided for @unitCelsius.
  ///
  /// In en, this message translates to:
  /// **'Celsius (°C)'**
  String get unitCelsius;

  /// No description provided for @unitFahrenheit.
  ///
  /// In en, this message translates to:
  /// **'Fahrenheit (°F)'**
  String get unitFahrenheit;

  /// No description provided for @unitKilometers.
  ///
  /// In en, this message translates to:
  /// **'Kilometres (km)'**
  String get unitKilometers;

  /// No description provided for @unitMiles.
  ///
  /// In en, this message translates to:
  /// **'Miles (mi)'**
  String get unitMiles;

  /// No description provided for @unitKmh.
  ///
  /// In en, this message translates to:
  /// **'km/h'**
  String get unitKmh;

  /// No description provided for @unitMph.
  ///
  /// In en, this message translates to:
  /// **'mph'**
  String get unitMph;

  /// No description provided for @unitMs.
  ///
  /// In en, this message translates to:
  /// **'m/s'**
  String get unitMs;

  /// No description provided for @unitsSaved.
  ///
  /// In en, this message translates to:
  /// **'Units saved'**
  String get unitsSaved;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'nb'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'nb':
      return AppLocalizationsNb();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
