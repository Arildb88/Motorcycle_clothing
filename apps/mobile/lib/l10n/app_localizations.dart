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

  /// No description provided for @plannerTitle.
  ///
  /// In en, this message translates to:
  /// **'Plan ride'**
  String get plannerTitle;

  /// No description provided for @plannerSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Choose where you ride, when you leave or arrive, then analyze weather and kit.'**
  String get plannerSubtitle;

  /// No description provided for @plannerSavedRoutes.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get plannerSavedRoutes;

  /// No description provided for @plannerChooseSavedRoute.
  ///
  /// In en, this message translates to:
  /// **'Use a saved route'**
  String get plannerChooseSavedRoute;

  /// No description provided for @plannerNoSavedRoutes.
  ///
  /// In en, this message translates to:
  /// **'No saved routes yet. Build one here, then save it.'**
  String get plannerNoSavedRoutes;

  /// No description provided for @plannerUseCurrentLocation.
  ///
  /// In en, this message translates to:
  /// **'Use current location'**
  String get plannerUseCurrentLocation;

  /// No description provided for @plannerLocationPermissionDenied.
  ///
  /// In en, this message translates to:
  /// **'Location permission was denied. You can still search for a start place.'**
  String get plannerLocationPermissionDenied;

  /// No description provided for @plannerLocationPermissionDeniedForever.
  ///
  /// In en, this message translates to:
  /// **'Location permission is blocked. Enable it in system settings, or search for a start place.'**
  String get plannerLocationPermissionDeniedForever;

  /// No description provided for @plannerLocationServicesDisabled.
  ///
  /// In en, this message translates to:
  /// **'Location services are off. Turn them on, or search for a start place.'**
  String get plannerLocationServicesDisabled;

  /// No description provided for @plannerLocationTemporaryFailure.
  ///
  /// In en, this message translates to:
  /// **'Could not read your location right now. Try again or search for a place.'**
  String get plannerLocationTemporaryFailure;

  /// No description provided for @plannerMoveUp.
  ///
  /// In en, this message translates to:
  /// **'Move up'**
  String get plannerMoveUp;

  /// No description provided for @plannerMoveDown.
  ///
  /// In en, this message translates to:
  /// **'Move down'**
  String get plannerMoveDown;

  /// No description provided for @plannerRemoveStop.
  ///
  /// In en, this message translates to:
  /// **'Remove stop'**
  String get plannerRemoveStop;

  /// No description provided for @plannerAddStop.
  ///
  /// In en, this message translates to:
  /// **'Add stop'**
  String get plannerAddStop;

  /// No description provided for @plannerReverse.
  ///
  /// In en, this message translates to:
  /// **'Reverse'**
  String get plannerReverse;

  /// No description provided for @plannerRoundTrip.
  ///
  /// In en, this message translates to:
  /// **'Return to start'**
  String get plannerRoundTrip;

  /// No description provided for @plannerWhenSection.
  ///
  /// In en, this message translates to:
  /// **'When'**
  String get plannerWhenSection;

  /// No description provided for @plannerDeparture.
  ///
  /// In en, this message translates to:
  /// **'Departure'**
  String get plannerDeparture;

  /// No description provided for @plannerArrival.
  ///
  /// In en, this message translates to:
  /// **'Arrival'**
  String get plannerArrival;

  /// No description provided for @plannerDepartureHint.
  ///
  /// In en, this message translates to:
  /// **'The time is when you leave.'**
  String get plannerDepartureHint;

  /// No description provided for @plannerArrivalHint.
  ///
  /// In en, this message translates to:
  /// **'The time is when you want to arrive. Departure is estimated from ride duration.'**
  String get plannerArrivalHint;

  /// No description provided for @plannerDepartureTime.
  ///
  /// In en, this message translates to:
  /// **'Departure time'**
  String get plannerDepartureTime;

  /// No description provided for @plannerArrivalTime.
  ///
  /// In en, this message translates to:
  /// **'Arrival time'**
  String get plannerArrivalTime;

  /// No description provided for @plannerOptionsSection.
  ///
  /// In en, this message translates to:
  /// **'Route options'**
  String get plannerOptionsSection;

  /// No description provided for @plannerAvoidMotorways.
  ///
  /// In en, this message translates to:
  /// **'Avoid motorways'**
  String get plannerAvoidMotorways;

  /// No description provided for @plannerAvoidMotorwaysHint.
  ///
  /// In en, this message translates to:
  /// **'Prefer non-motorway roads when the provider supports it.'**
  String get plannerAvoidMotorwaysHint;

  /// No description provided for @plannerRouteName.
  ///
  /// In en, this message translates to:
  /// **'Route name'**
  String get plannerRouteName;

  /// No description provided for @plannerRouteNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Work commute'**
  String get plannerRouteNameHint;

  /// No description provided for @plannerAnalyzeRide.
  ///
  /// In en, this message translates to:
  /// **'Analyze ride'**
  String get plannerAnalyzeRide;

  /// No description provided for @plannerSaveRoute.
  ///
  /// In en, this message translates to:
  /// **'Save route'**
  String get plannerSaveRoute;

  /// No description provided for @plannerPrimaryActionHint.
  ///
  /// In en, this message translates to:
  /// **'Analyze ride checks weather and clothing. It does not start navigation.'**
  String get plannerPrimaryActionHint;

  /// No description provided for @plannerSaveDisabledHint.
  ///
  /// In en, this message translates to:
  /// **'Add a name and choose start and destination before saving.'**
  String get plannerSaveDisabledHint;

  /// No description provided for @plannerIncompleteRoute.
  ///
  /// In en, this message translates to:
  /// **'Choose a start and destination before analyzing.'**
  String get plannerIncompleteRoute;

  /// No description provided for @plannerDefaultRouteName.
  ///
  /// In en, this message translates to:
  /// **'Ride plan'**
  String get plannerDefaultRouteName;

  /// No description provided for @plannerRouteSaved.
  ///
  /// In en, this message translates to:
  /// **'Route saved'**
  String get plannerRouteSaved;

  /// No description provided for @plannerMapFailed.
  ///
  /// In en, this message translates to:
  /// **'Map preview failed'**
  String get plannerMapFailed;

  /// No description provided for @plannerAnalysisTitle.
  ///
  /// In en, this message translates to:
  /// **'Ride analysis'**
  String get plannerAnalysisTitle;

  /// No description provided for @plannerAnalysisSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Weather, exposure, and kit for this plan'**
  String get plannerAnalysisSubtitle;

  /// No description provided for @plannerNoWearItems.
  ///
  /// In en, this message translates to:
  /// **'No wear items returned.'**
  String get plannerNoWearItems;

  /// No description provided for @plannerNoPackItems.
  ///
  /// In en, this message translates to:
  /// **'No pack items returned.'**
  String get plannerNoPackItems;

  /// No description provided for @plannerBackToPlanner.
  ///
  /// In en, this message translates to:
  /// **'Back to planner'**
  String get plannerBackToPlanner;
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
