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

  /// No description provided for @reasonBasicUnderlayerWarmth.
  ///
  /// In en, this message translates to:
  /// **'Basic clothes already worn cover some warmth, so less extra layering is suggested.'**
  String get reasonBasicUnderlayerWarmth;

  /// No description provided for @reasonRouteSpeedProfileUsed.
  ///
  /// In en, this message translates to:
  /// **'Timing uses the route\'s own speed profile.'**
  String get reasonRouteSpeedProfileUsed;

  /// No description provided for @reasonRouteSpeedProfileUnavailable.
  ///
  /// In en, this message translates to:
  /// **'No route speed profile was available, so a default pace was used.'**
  String get reasonRouteSpeedProfileUnavailable;

  /// No description provided for @reasonAssumedCruiseSpeed.
  ///
  /// In en, this message translates to:
  /// **'Cruise speed was assumed because the route did not provide one.'**
  String get reasonAssumedCruiseSpeed;

  /// No description provided for @reasonWindDirectionUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Wind direction was not available, so airflow is not calculated as a vector.'**
  String get reasonWindDirectionUnavailable;

  /// No description provided for @reasonElevationUsed.
  ///
  /// In en, this message translates to:
  /// **'Ground elevation was included with the weather request where a height was known.'**
  String get reasonElevationUsed;

  /// No description provided for @reasonElevationPartial.
  ///
  /// In en, this message translates to:
  /// **'Ground elevation is missing for part of this plan.'**
  String get reasonElevationPartial;

  /// No description provided for @reasonElevationUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Ground elevation was not available, so the weather request did not include height.'**
  String get reasonElevationUnavailable;

  /// No description provided for @reasonVentOrPackShell.
  ///
  /// In en, this message translates to:
  /// **'Use vents or pack a shell for changing conditions.'**
  String get reasonVentOrPackShell;

  /// No description provided for @reasonGenericCyclingKit.
  ///
  /// In en, this message translates to:
  /// **'This is a generic cycling kit because matching owned garments were not found.'**
  String get reasonGenericCyclingKit;

  /// No description provided for @reasonAssumedRideStyle.
  ///
  /// In en, this message translates to:
  /// **'Ride effort was assumed because it was not specified.'**
  String get reasonAssumedRideStyle;

  /// No description provided for @reasonRouteGeometryFallback.
  ///
  /// In en, this message translates to:
  /// **'Road geometry was unavailable, so weather samples follow the saved points.'**
  String get reasonRouteGeometryFallback;

  /// No description provided for @reasonHelmetAssumed.
  ///
  /// In en, this message translates to:
  /// **'A helmet is assumed and is not chosen by this clothing kit.'**
  String get reasonHelmetAssumed;

  /// No description provided for @reasonFeetLimitingZone.
  ///
  /// In en, this message translates to:
  /// **'Feet need more warmth than the torso on this ride.'**
  String get reasonFeetLimitingZone;

  /// No description provided for @reasonHandsWindChill.
  ///
  /// In en, this message translates to:
  /// **'Hands see more wind than the torso on this ride.'**
  String get reasonHandsWindChill;

  /// No description provided for @reasonUpperMountainSetsKit.
  ///
  /// In en, this message translates to:
  /// **'The colder upper mountain sets what you wear.'**
  String get reasonUpperMountainSetsKit;

  /// No description provided for @reasonStayingAtBase.
  ///
  /// In en, this message translates to:
  /// **'The plan stays at the base, so the base forecast sets the kit.'**
  String get reasonStayingAtBase;

  /// No description provided for @reasonVillageWeatherNotUsedAsSummit.
  ///
  /// In en, this message translates to:
  /// **'Village or base weather is not used as the summit forecast.'**
  String get reasonVillageWeatherNotUsedAsSummit;

  /// No description provided for @reasonUpperSiteMissing.
  ///
  /// In en, this message translates to:
  /// **'No upper-mountain site was identified, so summit conditions are unknown.'**
  String get reasonUpperSiteMissing;

  /// No description provided for @reasonUpperElevationUnavailable.
  ///
  /// In en, this message translates to:
  /// **'The upper site has no elevation, so its forecast was not requested.'**
  String get reasonUpperElevationUnavailable;

  /// No description provided for @reasonSitesNeedLabels.
  ///
  /// In en, this message translates to:
  /// **'Sites could not be ordered into base and summit. Add labels or heights.'**
  String get reasonSitesNeedLabels;

  /// No description provided for @reasonMidElevationEstimated.
  ///
  /// In en, this message translates to:
  /// **'The mid-mountain height is estimated, not measured.'**
  String get reasonMidElevationEstimated;

  /// No description provided for @reasonTemperatureSpread.
  ///
  /// In en, this message translates to:
  /// **'Temperature differs between the base and the upper mountain.'**
  String get reasonTemperatureSpread;

  /// No description provided for @reasonHighWindAtUpper.
  ///
  /// In en, this message translates to:
  /// **'Wind at the upper mountain is high.'**
  String get reasonHighWindAtUpper;

  /// No description provided for @reasonAssumedExposureMode.
  ///
  /// In en, this message translates to:
  /// **'Exposure mode was assumed because it was not specified.'**
  String get reasonAssumedExposureMode;

  /// No description provided for @reasonGenericAlpineKit.
  ///
  /// In en, this message translates to:
  /// **'This is a generic alpine kit because matching owned garments were not found.'**
  String get reasonGenericAlpineKit;

  /// No description provided for @reasonLeaveWarmerLayerOffHill.
  ///
  /// In en, this message translates to:
  /// **'Leave the warmer layer off while you are on the hill.'**
  String get reasonLeaveWarmerLayerOffHill;

  /// No description provided for @reasonBootsAreEquipment.
  ///
  /// In en, this message translates to:
  /// **'Boots are equipment and are not chosen by this clothing kit.'**
  String get reasonBootsAreEquipment;

  /// No description provided for @reasonGogglesAreEquipment.
  ///
  /// In en, this message translates to:
  /// **'Goggles are equipment and are not chosen by this clothing kit.'**
  String get reasonGogglesAreEquipment;

  /// No description provided for @reasonHelmetIsEquipment.
  ///
  /// In en, this message translates to:
  /// **'A helmet is equipment and is not chosen by this clothing kit.'**
  String get reasonHelmetIsEquipment;

  /// No description provided for @reasonShortColdStopPacked.
  ///
  /// In en, this message translates to:
  /// **'A short cold stop is covered by something packed, not worn the whole time.'**
  String get reasonShortColdStopPacked;

  /// No description provided for @reasonPackShell.
  ///
  /// In en, this message translates to:
  /// **'Pack a shell instead of wearing it the whole time.'**
  String get reasonPackShell;

  /// No description provided for @reasonVentsForClimb.
  ///
  /// In en, this message translates to:
  /// **'Open vents while climbing.'**
  String get reasonVentsForClimb;

  /// No description provided for @reasonGenericXcKit.
  ///
  /// In en, this message translates to:
  /// **'This is a generic cross-country kit because matching owned garments were not found.'**
  String get reasonGenericXcKit;

  /// No description provided for @reasonAssumedIntensity.
  ///
  /// In en, this message translates to:
  /// **'Intensity was assumed because it was not specified.'**
  String get reasonAssumedIntensity;

  /// No description provided for @reasonAssumedDuration.
  ///
  /// In en, this message translates to:
  /// **'Duration was assumed because the route has no saved length.'**
  String get reasonAssumedDuration;

  /// No description provided for @reasonStyleNotSpecified.
  ///
  /// In en, this message translates to:
  /// **'Classic or skate was not specified, so boots are not chosen.'**
  String get reasonStyleNotSpecified;

  /// No description provided for @reasonClassicBootsAreEquipment.
  ///
  /// In en, this message translates to:
  /// **'Classic boots are equipment and are not chosen by this clothing kit.'**
  String get reasonClassicBootsAreEquipment;

  /// No description provided for @reasonSkateBootsAreEquipment.
  ///
  /// In en, this message translates to:
  /// **'Skate boots are equipment and are not chosen by this clothing kit.'**
  String get reasonSkateBootsAreEquipment;

  /// No description provided for @reasonUserTrackNotRoad.
  ///
  /// In en, this message translates to:
  /// **'Weather follows your track, not a road route.'**
  String get reasonUserTrackNotRoad;

  /// No description provided for @reasonClimbReducesWornDemand.
  ///
  /// In en, this message translates to:
  /// **'Climbing reduces how much insulation you need to wear.'**
  String get reasonClimbReducesWornDemand;

  /// No description provided for @reasonNoGroomingStatus.
  ///
  /// In en, this message translates to:
  /// **'Grooming status is not known and is not part of this recommendation.'**
  String get reasonNoGroomingStatus;

  /// No description provided for @reasonNoWaxAdvice.
  ///
  /// In en, this message translates to:
  /// **'This recommendation does not include wax advice.'**
  String get reasonNoWaxAdvice;

  /// No description provided for @reasonsSection.
  ///
  /// In en, this message translates to:
  /// **'Why this kit'**
  String get reasonsSection;

  /// No description provided for @limitsSection.
  ///
  /// In en, this message translates to:
  /// **'Limits and assumptions'**
  String get limitsSection;

  /// No description provided for @wearSectionHint.
  ///
  /// In en, this message translates to:
  /// **'Worn for this session'**
  String get wearSectionHint;

  /// No description provided for @packSectionHint.
  ///
  /// In en, this message translates to:
  /// **'Packed, not worn the whole time'**
  String get packSectionHint;

  /// No description provided for @elevationRange.
  ///
  /// In en, this message translates to:
  /// **'Elevation {min}–{max} m'**
  String elevationRange(String min, String max);

  /// No description provided for @elevationSingle.
  ///
  /// In en, this message translates to:
  /// **'Elevation {value} m'**
  String elevationSingle(String value);

  /// No description provided for @elevationEstimated.
  ///
  /// In en, this message translates to:
  /// **'estimated height'**
  String get elevationEstimated;

  /// No description provided for @siteBase.
  ///
  /// In en, this message translates to:
  /// **'Base'**
  String get siteBase;

  /// No description provided for @siteMid.
  ///
  /// In en, this message translates to:
  /// **'Mid'**
  String get siteMid;

  /// No description provided for @siteUpper.
  ///
  /// In en, this message translates to:
  /// **'Upper'**
  String get siteUpper;

  /// No description provided for @elevationAttribution.
  ///
  /// In en, this message translates to:
  /// **'Elevation source: {source}'**
  String elevationAttribution(String source);

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

  /// No description provided for @plannerSiteSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Choose the mountain or area. One place is enough. Extra places can mark base and summit.'**
  String get plannerSiteSubtitle;

  /// No description provided for @plannerResortSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Which ski resort will you use? Search by name, or find resorts near you or near a place.'**
  String get plannerResortSubtitle;

  /// No description provided for @plannerResortName.
  ///
  /// In en, this message translates to:
  /// **'Ski resort'**
  String get plannerResortName;

  /// No description provided for @plannerResortNearby.
  ///
  /// In en, this message translates to:
  /// **'Find resorts nearby'**
  String get plannerResortNearby;

  /// No description provided for @plannerResortNearPlace.
  ///
  /// In en, this message translates to:
  /// **'Near a place'**
  String get plannerResortNearPlace;

  /// No description provided for @plannerResortEmpty.
  ///
  /// In en, this message translates to:
  /// **'No ski resorts found.'**
  String get plannerResortEmpty;

  /// No description provided for @plannerResortUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Ski resort search is temporarily unavailable.'**
  String get plannerResortUnavailable;

  /// No description provided for @plannerResortAttribution.
  ///
  /// In en, this message translates to:
  /// **'Resort information from Fnugg.no'**
  String get plannerResortAttribution;

  /// No description provided for @plannerResortSelected.
  ///
  /// In en, this message translates to:
  /// **'Selected resort'**
  String get plannerResortSelected;

  /// No description provided for @plannerResortStraightLineKm.
  ///
  /// In en, this message translates to:
  /// **'{distance} km in a straight line'**
  String plannerResortStraightLineKm(String distance);

  /// No description provided for @plannerResortStraightLineMeters.
  ///
  /// In en, this message translates to:
  /// **'{meters} m in a straight line'**
  String plannerResortStraightLineMeters(int meters);

  /// No description provided for @plannerResortLocationDenied.
  ///
  /// In en, this message translates to:
  /// **'Location permission was denied. You can still search for a ski resort by name.'**
  String get plannerResortLocationDenied;

  /// No description provided for @plannerResortLocationDeniedForever.
  ///
  /// In en, this message translates to:
  /// **'Location permission is blocked. Enable it in system settings, or search for a ski resort by name.'**
  String get plannerResortLocationDeniedForever;

  /// No description provided for @plannerResortLocationDisabled.
  ///
  /// In en, this message translates to:
  /// **'Location services are off. Turn them on, or search for a ski resort by name.'**
  String get plannerResortLocationDisabled;

  /// No description provided for @plannerResortLocationTemporary.
  ///
  /// In en, this message translates to:
  /// **'Could not read your location right now. Try again or search for a ski resort.'**
  String get plannerResortLocationTemporary;

  /// No description provided for @plannerTrailSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Find a cross-country trail near you, or plan your own start and finish.'**
  String get plannerTrailSubtitle;

  /// No description provided for @plannerTrailNearby.
  ///
  /// In en, this message translates to:
  /// **'Find a trail nearby'**
  String get plannerTrailNearby;

  /// No description provided for @plannerTrailManual.
  ///
  /// In en, this message translates to:
  /// **'Plan your own trip'**
  String get plannerTrailManual;

  /// No description provided for @plannerTrailNearPlace.
  ///
  /// In en, this message translates to:
  /// **'Near a place'**
  String get plannerTrailNearPlace;

  /// No description provided for @plannerTrailEmpty.
  ///
  /// In en, this message translates to:
  /// **'No ski trails found.'**
  String get plannerTrailEmpty;

  /// No description provided for @plannerTrailUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Ski trail search is temporarily unavailable.'**
  String get plannerTrailUnavailable;

  /// No description provided for @plannerTrailAttribution.
  ///
  /// In en, this message translates to:
  /// **'Trail information from Kartverket'**
  String get plannerTrailAttribution;

  /// No description provided for @plannerTrailSelected.
  ///
  /// In en, this message translates to:
  /// **'Selected trail'**
  String get plannerTrailSelected;

  /// No description provided for @plannerTrailLocationDenied.
  ///
  /// In en, this message translates to:
  /// **'Location permission was denied. You can still search near a place, or plan your own trip.'**
  String get plannerTrailLocationDenied;

  /// No description provided for @plannerTrailLocationDeniedForever.
  ///
  /// In en, this message translates to:
  /// **'Location permission is blocked. Enable it in system settings, search near a place, or plan your own trip.'**
  String get plannerTrailLocationDeniedForever;

  /// No description provided for @plannerTrailLocationDisabled.
  ///
  /// In en, this message translates to:
  /// **'Location services are off. Turn them on, search near a place, or plan your own trip.'**
  String get plannerTrailLocationDisabled;

  /// No description provided for @plannerTrailLocationTemporary.
  ///
  /// In en, this message translates to:
  /// **'Could not read your location right now. Try again, search near a place, or plan your own trip.'**
  String get plannerTrailLocationTemporary;

  /// No description provided for @plannerIncompleteResort.
  ///
  /// In en, this message translates to:
  /// **'Choose a ski resort before analyzing.'**
  String get plannerIncompleteResort;

  /// No description provided for @plannerSaveDisabledResort.
  ///
  /// In en, this message translates to:
  /// **'Add a name and choose a ski resort before saving.'**
  String get plannerSaveDisabledResort;

  /// No description provided for @plannerPlace.
  ///
  /// In en, this message translates to:
  /// **'Place'**
  String get plannerPlace;

  /// No description provided for @plannerPlaceNumber.
  ///
  /// In en, this message translates to:
  /// **'Place {number}'**
  String plannerPlaceNumber(int number);

  /// No description provided for @plannerAddPlace.
  ///
  /// In en, this message translates to:
  /// **'Add place'**
  String get plannerAddPlace;

  /// No description provided for @plannerSaveDisabledSite.
  ///
  /// In en, this message translates to:
  /// **'Add a name and choose a place before saving.'**
  String get plannerSaveDisabledSite;

  /// No description provided for @plannerIncompleteSite.
  ///
  /// In en, this message translates to:
  /// **'Choose a place before analyzing.'**
  String get plannerIncompleteSite;

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

  /// No description provided for @routeDrivingGeometryNotice.
  ///
  /// In en, this message translates to:
  /// **'Road-following driving geometry. This route is not motorcycle-optimized.'**
  String get routeDrivingGeometryNotice;

  /// No description provided for @routeRoutingUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Road routing is temporarily unavailable.'**
  String get routeRoutingUnavailable;

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

  /// No description provided for @authTagline.
  ///
  /// In en, this message translates to:
  /// **'Dress for the ride — personalized across outdoor activities.'**
  String get authTagline;

  /// No description provided for @authEmailLabel.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get authEmailLabel;

  /// No description provided for @authPasswordLabel.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get authPasswordLabel;

  /// No description provided for @authDisplayNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Display name'**
  String get authDisplayNameLabel;

  /// No description provided for @authContinueWithEmail.
  ///
  /// In en, this message translates to:
  /// **'Continue with email'**
  String get authContinueWithEmail;

  /// No description provided for @authCreateAccount.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get authCreateAccount;

  /// No description provided for @authHaveAccountSignIn.
  ///
  /// In en, this message translates to:
  /// **'Have an account? Sign in'**
  String get authHaveAccountSignIn;

  /// No description provided for @authNewHereRegister.
  ///
  /// In en, this message translates to:
  /// **'New here? Register'**
  String get authNewHereRegister;

  /// No description provided for @authForgotPassword.
  ///
  /// In en, this message translates to:
  /// **'Forgot password?'**
  String get authForgotPassword;

  /// No description provided for @authContinueMicrosoft.
  ///
  /// In en, this message translates to:
  /// **'Continue with Microsoft'**
  String get authContinueMicrosoft;

  /// No description provided for @authContinueMicrosoftDev.
  ///
  /// In en, this message translates to:
  /// **'Continue with Microsoft (dev)'**
  String get authContinueMicrosoftDev;

  /// No description provided for @authContinueFacebook.
  ///
  /// In en, this message translates to:
  /// **'Continue with Facebook'**
  String get authContinueFacebook;

  /// No description provided for @authContinueFacebookDev.
  ///
  /// In en, this message translates to:
  /// **'Continue with Facebook (dev)'**
  String get authContinueFacebookDev;

  /// No description provided for @authSocialLoginHint.
  ///
  /// In en, this message translates to:
  /// **'Social login buttons enable when Facebook/Microsoft apps are configured on the API.'**
  String get authSocialLoginHint;

  /// No description provided for @authEmailAlreadyRegistered.
  ///
  /// In en, this message translates to:
  /// **'An account with this email already exists.'**
  String get authEmailAlreadyRegistered;

  /// No description provided for @authInvalidCredentials.
  ///
  /// In en, this message translates to:
  /// **'Invalid email or password.'**
  String get authInvalidCredentials;

  /// No description provided for @authInvalidEmail.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email address.'**
  String get authInvalidEmail;

  /// No description provided for @authPasswordRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter your password.'**
  String get authPasswordRequired;

  /// No description provided for @authPasswordTooShort.
  ///
  /// In en, this message translates to:
  /// **'Password must be at least 8 characters.'**
  String get authPasswordTooShort;

  /// No description provided for @authDisplayNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter a display name.'**
  String get authDisplayNameRequired;

  /// No description provided for @authNetworkError.
  ///
  /// In en, this message translates to:
  /// **'Could not reach the server. Check your connection and try again.'**
  String get authNetworkError;

  /// No description provided for @authGenericFailure.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get authGenericFailure;

  /// No description provided for @authForgotPasswordTitle.
  ///
  /// In en, this message translates to:
  /// **'Forgot password'**
  String get authForgotPasswordTitle;

  /// No description provided for @authForgotPasswordSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Enter your email and we will send a reset link if an account exists.'**
  String get authForgotPasswordSubtitle;

  /// No description provided for @authSendResetLink.
  ///
  /// In en, this message translates to:
  /// **'Send reset link'**
  String get authSendResetLink;

  /// No description provided for @authForgotPasswordSuccess.
  ///
  /// In en, this message translates to:
  /// **'If an account exists for this email, a password reset link has been sent.'**
  String get authForgotPasswordSuccess;

  /// No description provided for @authHaveResetToken.
  ///
  /// In en, this message translates to:
  /// **'I already have a reset token'**
  String get authHaveResetToken;

  /// No description provided for @authResetPasswordTitle.
  ///
  /// In en, this message translates to:
  /// **'Reset password'**
  String get authResetPasswordTitle;

  /// No description provided for @authResetPasswordSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Paste your reset token and choose a new password.'**
  String get authResetPasswordSubtitle;

  /// No description provided for @authResetTokenLabel.
  ///
  /// In en, this message translates to:
  /// **'Reset token'**
  String get authResetTokenLabel;

  /// No description provided for @authNewPasswordLabel.
  ///
  /// In en, this message translates to:
  /// **'New password'**
  String get authNewPasswordLabel;

  /// No description provided for @authConfirmPasswordLabel.
  ///
  /// In en, this message translates to:
  /// **'Confirm password'**
  String get authConfirmPasswordLabel;

  /// No description provided for @authSetNewPassword.
  ///
  /// In en, this message translates to:
  /// **'Set new password'**
  String get authSetNewPassword;

  /// No description provided for @authPasswordMismatch.
  ///
  /// In en, this message translates to:
  /// **'Passwords do not match.'**
  String get authPasswordMismatch;

  /// No description provided for @authPasswordResetSuccess.
  ///
  /// In en, this message translates to:
  /// **'Password updated. You can sign in now.'**
  String get authPasswordResetSuccess;

  /// No description provided for @authInvalidResetToken.
  ///
  /// In en, this message translates to:
  /// **'This password reset link is invalid or has expired.'**
  String get authInvalidResetToken;

  /// No description provided for @authChangePassword.
  ///
  /// In en, this message translates to:
  /// **'Change password'**
  String get authChangePassword;

  /// No description provided for @authChangePasswordTitle.
  ///
  /// In en, this message translates to:
  /// **'Change password'**
  String get authChangePasswordTitle;

  /// No description provided for @authChangePasswordSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Enter your current password, then choose a new one.'**
  String get authChangePasswordSubtitle;

  /// No description provided for @authCurrentPasswordLabel.
  ///
  /// In en, this message translates to:
  /// **'Current password'**
  String get authCurrentPasswordLabel;

  /// No description provided for @authCurrentPasswordRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter your current password.'**
  String get authCurrentPasswordRequired;

  /// No description provided for @authInvalidCurrentPassword.
  ///
  /// In en, this message translates to:
  /// **'Current password is incorrect.'**
  String get authInvalidCurrentPassword;

  /// No description provided for @authNoLocalPassword.
  ///
  /// In en, this message translates to:
  /// **'This account does not use a password.'**
  String get authNoLocalPassword;

  /// No description provided for @authPasswordChanged.
  ///
  /// In en, this message translates to:
  /// **'Password updated.'**
  String get authPasswordChanged;

  /// No description provided for @commonCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get commonCancel;

  /// No description provided for @commonDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get commonDelete;

  /// No description provided for @commonSave.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get commonSave;

  /// No description provided for @commonEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get commonEdit;

  /// No description provided for @commonRetry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get commonRetry;

  /// No description provided for @commonContinue.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get commonContinue;

  /// No description provided for @commonClear.
  ///
  /// In en, this message translates to:
  /// **'Clear'**
  String get commonClear;

  /// No description provided for @commonRemove.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get commonRemove;

  /// No description provided for @commonNone.
  ///
  /// In en, this message translates to:
  /// **'None'**
  String get commonNone;

  /// No description provided for @commonCustom.
  ///
  /// In en, this message translates to:
  /// **'Custom'**
  String get commonCustom;

  /// No description provided for @commonName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get commonName;

  /// No description provided for @commonCategory.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get commonCategory;

  /// No description provided for @commonFavorite.
  ///
  /// In en, this message translates to:
  /// **'Favorite'**
  String get commonFavorite;

  /// No description provided for @commonUnfavorite.
  ///
  /// In en, this message translates to:
  /// **'Unfavorite'**
  String get commonUnfavorite;

  /// No description provided for @errorGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get errorGeneric;

  /// No description provided for @errorCouldNotLoad.
  ///
  /// In en, this message translates to:
  /// **'Could not load this. Try again.'**
  String get errorCouldNotLoad;

  /// No description provided for @currentLocation.
  ///
  /// In en, this message translates to:
  /// **'Current location'**
  String get currentLocation;

  /// No description provided for @labelStart.
  ///
  /// In en, this message translates to:
  /// **'Start'**
  String get labelStart;

  /// No description provided for @labelDestination.
  ///
  /// In en, this message translates to:
  /// **'Destination'**
  String get labelDestination;

  /// No description provided for @labelEnd.
  ///
  /// In en, this message translates to:
  /// **'End'**
  String get labelEnd;

  /// No description provided for @waypointStop.
  ///
  /// In en, this message translates to:
  /// **'Stop {index}'**
  String waypointStop(int index);

  /// No description provided for @routeLoopSummary.
  ///
  /// In en, this message translates to:
  /// **'{start} · loop · {count} stops'**
  String routeLoopSummary(String start, int count);

  /// No description provided for @routeViaSummary.
  ///
  /// In en, this message translates to:
  /// **'{start} → … → {end} ({count})'**
  String routeViaSummary(String start, String end, int count);

  /// No description provided for @durationMinutes.
  ///
  /// In en, this message translates to:
  /// **'~{minutes} min'**
  String durationMinutes(int minutes);

  /// No description provided for @durationHours.
  ///
  /// In en, this message translates to:
  /// **'~{hours} h'**
  String durationHours(int hours);

  /// No description provided for @durationHoursMinutes.
  ///
  /// In en, this message translates to:
  /// **'~{hours} h {minutes} m'**
  String durationHoursMinutes(int hours, int minutes);

  /// No description provided for @homePlanNewChip.
  ///
  /// In en, this message translates to:
  /// **'+ Plan new'**
  String get homePlanNewChip;

  /// No description provided for @homeSaveRouteChip.
  ///
  /// In en, this message translates to:
  /// **'Save a route'**
  String get homeSaveRouteChip;

  /// No description provided for @homeHowWasTheRide.
  ///
  /// In en, this message translates to:
  /// **'How was the ride?'**
  String get homeHowWasTheRide;

  /// No description provided for @homeFallbackRide.
  ///
  /// In en, this message translates to:
  /// **'Ride'**
  String get homeFallbackRide;

  /// No description provided for @metricTemp.
  ///
  /// In en, this message translates to:
  /// **'Temp'**
  String get metricTemp;

  /// No description provided for @metricExposure.
  ///
  /// In en, this message translates to:
  /// **'Exposure'**
  String get metricExposure;

  /// No description provided for @metricRain.
  ///
  /// In en, this message translates to:
  /// **'Rain'**
  String get metricRain;

  /// No description provided for @metricWind.
  ///
  /// In en, this message translates to:
  /// **'Wind'**
  String get metricWind;

  /// No description provided for @kitNotOwned.
  ///
  /// In en, this message translates to:
  /// **'{name} (not owned)'**
  String kitNotOwned(String name);

  /// No description provided for @kitFallbackItem.
  ///
  /// In en, this message translates to:
  /// **'Item'**
  String get kitFallbackItem;

  /// No description provided for @confidenceHigh.
  ///
  /// In en, this message translates to:
  /// **'High'**
  String get confidenceHigh;

  /// No description provided for @confidenceMedium.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get confidenceMedium;

  /// No description provided for @confidenceLow.
  ///
  /// In en, this message translates to:
  /// **'Low'**
  String get confidenceLow;

  /// No description provided for @configInstallThermalLiner.
  ///
  /// In en, this message translates to:
  /// **'install thermal liner'**
  String get configInstallThermalLiner;

  /// No description provided for @configInstallWaterproofLiner.
  ///
  /// In en, this message translates to:
  /// **'install waterproof liner'**
  String get configInstallWaterproofLiner;

  /// No description provided for @configRemoveThermalLiner.
  ///
  /// In en, this message translates to:
  /// **'remove thermal liner'**
  String get configRemoveThermalLiner;

  /// No description provided for @configVentsOpen.
  ///
  /// In en, this message translates to:
  /// **'vents open'**
  String get configVentsOpen;

  /// No description provided for @configVentsClosed.
  ///
  /// In en, this message translates to:
  /// **'vents closed'**
  String get configVentsClosed;

  /// No description provided for @routesTitle.
  ///
  /// In en, this message translates to:
  /// **'Saved routes'**
  String get routesTitle;

  /// No description provided for @routesSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Reusable templates for motorcycle. Weather and kit are always recalculated when you launch a ride.'**
  String get routesSubtitle;

  /// No description provided for @routesEditTemplate.
  ///
  /// In en, this message translates to:
  /// **'Edit route template'**
  String get routesEditTemplate;

  /// No description provided for @routesDeleteTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete route?'**
  String get routesDeleteTitle;

  /// No description provided for @routesDeleteBody.
  ///
  /// In en, this message translates to:
  /// **'“{name}” will be removed. Past rides keep their route snapshot.'**
  String routesDeleteBody(String name);

  /// No description provided for @profileSection.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profileSection;

  /// No description provided for @profileDisplayName.
  ///
  /// In en, this message translates to:
  /// **'Display name'**
  String get profileDisplayName;

  /// No description provided for @profileAvatarInitials.
  ///
  /// In en, this message translates to:
  /// **'Avatar: initials for now'**
  String get profileAvatarInitials;

  /// No description provided for @profileAvatarProvider.
  ///
  /// In en, this message translates to:
  /// **'provider image available'**
  String get profileAvatarProvider;

  /// No description provided for @profileActivitySection.
  ///
  /// In en, this message translates to:
  /// **'Activity'**
  String get profileActivitySection;

  /// No description provided for @profileDefaultActivity.
  ///
  /// In en, this message translates to:
  /// **'Default activity'**
  String get profileDefaultActivity;

  /// No description provided for @profileShowChooser.
  ///
  /// In en, this message translates to:
  /// **'Show activity chooser at startup'**
  String get profileShowChooser;

  /// No description provided for @profileLoginMethods.
  ///
  /// In en, this message translates to:
  /// **'Connected login methods'**
  String get profileLoginMethods;

  /// No description provided for @profileLinked.
  ///
  /// In en, this message translates to:
  /// **'Linked'**
  String get profileLinked;

  /// No description provided for @profileConnectFacebook.
  ///
  /// In en, this message translates to:
  /// **'Connect Facebook login'**
  String get profileConnectFacebook;

  /// No description provided for @profileConnectMicrosoft.
  ///
  /// In en, this message translates to:
  /// **'Connect Microsoft login'**
  String get profileConnectMicrosoft;

  /// No description provided for @profileServices.
  ///
  /// In en, this message translates to:
  /// **'Connected services'**
  String get profileServices;

  /// No description provided for @profileConnected.
  ///
  /// In en, this message translates to:
  /// **'Connected'**
  String get profileConnected;

  /// No description provided for @profileSync.
  ///
  /// In en, this message translates to:
  /// **'Sync'**
  String get profileSync;

  /// No description provided for @profileDisconnect.
  ///
  /// In en, this message translates to:
  /// **'Disconnect'**
  String get profileDisconnect;

  /// No description provided for @profileConnectStrava.
  ///
  /// In en, this message translates to:
  /// **'Connect Strava'**
  String get profileConnectStrava;

  /// No description provided for @profileStravaNotConfigured.
  ///
  /// In en, this message translates to:
  /// **'Strava is not set up on the server yet.'**
  String get profileStravaNotConfigured;

  /// No description provided for @profileSave.
  ///
  /// In en, this message translates to:
  /// **'Save profile'**
  String get profileSave;

  /// No description provided for @profileAccount.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get profileAccount;

  /// No description provided for @profileSignOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get profileSignOut;

  /// No description provided for @profileDeleteAccount.
  ///
  /// In en, this message translates to:
  /// **'Delete account'**
  String get profileDeleteAccount;

  /// No description provided for @profileDeleteTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete account?'**
  String get profileDeleteTitle;

  /// No description provided for @profileDeleteBody.
  ///
  /// In en, this message translates to:
  /// **'This permanently deletes your RideWear account, wardrobe, and history.'**
  String get profileDeleteBody;

  /// No description provided for @profileDemoLinkHint.
  ///
  /// In en, this message translates to:
  /// **'Set up Facebook or Microsoft on the server to link them to this account.'**
  String get profileDemoLinkHint;

  /// No description provided for @profileLoginFallback.
  ///
  /// In en, this message translates to:
  /// **'Login'**
  String get profileLoginFallback;

  /// No description provided for @activityMotorcycle.
  ///
  /// In en, this message translates to:
  /// **'Motorcycle'**
  String get activityMotorcycle;

  /// No description provided for @activityHiking.
  ///
  /// In en, this message translates to:
  /// **'Hiking'**
  String get activityHiking;

  /// No description provided for @activityCycling.
  ///
  /// In en, this message translates to:
  /// **'Cycling'**
  String get activityCycling;

  /// No description provided for @activityAlpineSkiing.
  ///
  /// In en, this message translates to:
  /// **'Alpine skiing'**
  String get activityAlpineSkiing;

  /// No description provided for @activitySnowboarding.
  ///
  /// In en, this message translates to:
  /// **'Snowboarding'**
  String get activitySnowboarding;

  /// No description provided for @activityAlpineAndSnowboard.
  ///
  /// In en, this message translates to:
  /// **'Alpine & snowboard'**
  String get activityAlpineAndSnowboard;

  /// No description provided for @activityXcSkiing.
  ///
  /// In en, this message translates to:
  /// **'Cross-country skiing'**
  String get activityXcSkiing;

  /// No description provided for @plannerResortDiscipline.
  ///
  /// In en, this message translates to:
  /// **'Skiing or snowboarding'**
  String get plannerResortDiscipline;

  /// No description provided for @plannerIntensity.
  ///
  /// In en, this message translates to:
  /// **'Effort'**
  String get plannerIntensity;

  /// No description provided for @plannerIntensityEasy.
  ///
  /// In en, this message translates to:
  /// **'Easy'**
  String get plannerIntensityEasy;

  /// No description provided for @plannerIntensitySteady.
  ///
  /// In en, this message translates to:
  /// **'Steady'**
  String get plannerIntensitySteady;

  /// No description provided for @plannerIntensityHard.
  ///
  /// In en, this message translates to:
  /// **'Hard'**
  String get plannerIntensityHard;

  /// No description provided for @plannerExposure.
  ///
  /// In en, this message translates to:
  /// **'Where you spend time'**
  String get plannerExposure;

  /// No description provided for @plannerExposureLift.
  ///
  /// In en, this message translates to:
  /// **'Lifts'**
  String get plannerExposureLift;

  /// No description provided for @plannerExposureHike.
  ///
  /// In en, this message translates to:
  /// **'Hiking up'**
  String get plannerExposureHike;

  /// No description provided for @plannerExposureBase.
  ///
  /// In en, this message translates to:
  /// **'Staying at the base'**
  String get plannerExposureBase;

  /// No description provided for @plannerStyle.
  ///
  /// In en, this message translates to:
  /// **'Style'**
  String get plannerStyle;

  /// No description provided for @plannerStyleUnspecified.
  ///
  /// In en, this message translates to:
  /// **'Not specified'**
  String get plannerStyleUnspecified;

  /// No description provided for @plannerStyleClassic.
  ///
  /// In en, this message translates to:
  /// **'Classic'**
  String get plannerStyleClassic;

  /// No description provided for @plannerStyleSkate.
  ///
  /// In en, this message translates to:
  /// **'Skate'**
  String get plannerStyleSkate;

  /// No description provided for @plannerBasicClothing.
  ///
  /// In en, this message translates to:
  /// **'Clothes under the protective gear'**
  String get plannerBasicClothing;

  /// No description provided for @plannerBasicHint.
  ///
  /// In en, this message translates to:
  /// **'Optional. None is a valid choice, including when the motorcycle garment is the only layer you need.'**
  String get plannerBasicHint;

  /// No description provided for @plannerBasicUpper.
  ///
  /// In en, this message translates to:
  /// **'Upper layer'**
  String get plannerBasicUpper;

  /// No description provided for @plannerBasicLower.
  ///
  /// In en, this message translates to:
  /// **'Lower layer'**
  String get plannerBasicLower;

  /// No description provided for @plannerBasicNone.
  ///
  /// In en, this message translates to:
  /// **'None'**
  String get plannerBasicNone;

  /// No description provided for @plannerBasicTShirt.
  ///
  /// In en, this message translates to:
  /// **'T-shirt'**
  String get plannerBasicTShirt;

  /// No description provided for @plannerBasicThinSweater.
  ///
  /// In en, this message translates to:
  /// **'Thin sweater'**
  String get plannerBasicThinSweater;

  /// No description provided for @plannerBasicThickSweater.
  ///
  /// In en, this message translates to:
  /// **'Thick sweater'**
  String get plannerBasicThickSweater;

  /// No description provided for @plannerBasicWoolTop.
  ///
  /// In en, this message translates to:
  /// **'Wool base-layer top'**
  String get plannerBasicWoolTop;

  /// No description provided for @plannerBasicWoolBottom.
  ///
  /// In en, this message translates to:
  /// **'Wool base-layer bottom'**
  String get plannerBasicWoolBottom;

  /// No description provided for @plannerBasicJeans.
  ///
  /// In en, this message translates to:
  /// **'Jeans'**
  String get plannerBasicJeans;

  /// No description provided for @plannerBasicJoggers.
  ///
  /// In en, this message translates to:
  /// **'Sweatpants/joggers'**
  String get plannerBasicJoggers;

  /// No description provided for @plannerSessionLength.
  ///
  /// In en, this message translates to:
  /// **'Session length'**
  String get plannerSessionLength;

  /// No description provided for @activityWhatToday.
  ///
  /// In en, this message translates to:
  /// **'What are you doing today?'**
  String get activityWhatToday;

  /// No description provided for @activityDefaultLine.
  ///
  /// In en, this message translates to:
  /// **'Default: {activity}'**
  String activityDefaultLine(String activity);

  /// No description provided for @activityDefaultBadge.
  ///
  /// In en, this message translates to:
  /// **'DEFAULT'**
  String get activityDefaultBadge;

  /// No description provided for @activitySoon.
  ///
  /// In en, this message translates to:
  /// **'Soon'**
  String get activitySoon;

  /// No description provided for @activityChooserHint.
  ///
  /// In en, this message translates to:
  /// **'Changing today’s activity does not change your saved default.'**
  String get activityChooserHint;

  /// No description provided for @onboardingInterests.
  ///
  /// In en, this message translates to:
  /// **'What do you ride or move for?'**
  String get onboardingInterests;

  /// No description provided for @onboardingOpen.
  ///
  /// In en, this message translates to:
  /// **'How should RideWear open?'**
  String get onboardingOpen;

  /// No description provided for @onboardingTemperature.
  ///
  /// In en, this message translates to:
  /// **'How do you feel temperature?'**
  String get onboardingTemperature;

  /// No description provided for @onboardingStart.
  ///
  /// In en, this message translates to:
  /// **'Start RideWear'**
  String get onboardingStart;

  /// No description provided for @onboardingComingLater.
  ///
  /// In en, this message translates to:
  /// **'Recommendations coming later'**
  String get onboardingComingLater;

  /// No description provided for @onboardingShowChooser.
  ///
  /// In en, this message translates to:
  /// **'Show activity chooser when I open RideWear'**
  String get onboardingShowChooser;

  /// No description provided for @onboardingCold.
  ///
  /// In en, this message translates to:
  /// **'I get cold easily'**
  String get onboardingCold;

  /// No description provided for @onboardingAverage.
  ///
  /// In en, this message translates to:
  /// **'Average'**
  String get onboardingAverage;

  /// No description provided for @onboardingWarm.
  ///
  /// In en, this message translates to:
  /// **'I usually run warm'**
  String get onboardingWarm;

  /// No description provided for @activityComingNext.
  ///
  /// In en, this message translates to:
  /// **'{activity} recommendations are coming next.'**
  String activityComingNext(String activity);

  /// No description provided for @activitySharedBody.
  ///
  /// In en, this message translates to:
  /// **'Hiking recommendations are not available yet and do not use the motorcycle recommendation.'**
  String get activitySharedBody;

  /// No description provided for @activityOpenMotorcycle.
  ///
  /// In en, this message translates to:
  /// **'Open Motorcycle today'**
  String get activityOpenMotorcycle;

  /// No description provided for @activityMakeDefault.
  ///
  /// In en, this message translates to:
  /// **'Make {activity} my default'**
  String activityMakeDefault(String activity);

  /// No description provided for @activityNowDefault.
  ///
  /// In en, this message translates to:
  /// **'{activity} set as default'**
  String activityNowDefault(String activity);

  /// No description provided for @wardrobeIntro.
  ///
  /// In en, this message translates to:
  /// **'Add what you actually own. Category sets sensible defaults — refine later.'**
  String get wardrobeIntro;

  /// No description provided for @wardrobeEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No garments yet'**
  String get wardrobeEmptyTitle;

  /// No description provided for @wardrobeEmptyBody.
  ///
  /// In en, this message translates to:
  /// **'Add a few pieces you ride in, or load a demo kit for testing.'**
  String get wardrobeEmptyBody;

  /// No description provided for @wardrobeAdd.
  ///
  /// In en, this message translates to:
  /// **'Add garment'**
  String get wardrobeAdd;

  /// No description provided for @wardrobeLoadDemo.
  ///
  /// In en, this message translates to:
  /// **'Add demo clothes'**
  String get wardrobeLoadDemo;

  /// No description provided for @wardrobeDeleteTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete garment?'**
  String get wardrobeDeleteTitle;

  /// No description provided for @wardrobeDeleteBody.
  ///
  /// In en, this message translates to:
  /// **'Remove “{name}” from your wardrobe.'**
  String wardrobeDeleteBody(String name);

  /// No description provided for @wardrobeDemoBadge.
  ///
  /// In en, this message translates to:
  /// **'DEMO'**
  String get wardrobeDemoBadge;

  /// No description provided for @wardrobeDeleteDemo.
  ///
  /// In en, this message translates to:
  /// **'Delete demo wardrobe'**
  String get wardrobeDeleteDemo;

  /// No description provided for @wardrobeDeleteDemoTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete demo wardrobe?'**
  String get wardrobeDeleteDemoTitle;

  /// No description provided for @wardrobeDeleteDemoBody.
  ///
  /// In en, this message translates to:
  /// **'Only demo clothes for this activity are removed. Your own garments stay.'**
  String get wardrobeDeleteDemoBody;

  /// No description provided for @wardrobeSharingTitle.
  ///
  /// In en, this message translates to:
  /// **'Share personal clothes'**
  String get wardrobeSharingTitle;

  /// No description provided for @wardrobeSharingBody.
  ///
  /// In en, this message translates to:
  /// **'Motorcycle clothes can never be shared. Choose two or more activities to share personal garments. Demo clothes stay with their activity.'**
  String get wardrobeSharingBody;

  /// No description provided for @wardrobeMotorcycleIsolated.
  ///
  /// In en, this message translates to:
  /// **'Motorcycle clothes stay in their own wardrobe.'**
  String get wardrobeMotorcycleIsolated;

  /// No description provided for @wardrobeHikingUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Hiking does not have a wardrobe yet.'**
  String get wardrobeHikingUnavailable;

  /// No description provided for @wardrobeActivityMembership.
  ///
  /// In en, this message translates to:
  /// **'Available for'**
  String get wardrobeActivityMembership;

  /// No description provided for @garmentMotorcycleLocked.
  ///
  /// In en, this message translates to:
  /// **'This piece stays in the motorcycle wardrobe and is not shared.'**
  String get garmentMotorcycleLocked;

  /// No description provided for @garmentEditTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit garment'**
  String get garmentEditTitle;

  /// No description provided for @garmentUpdatePiece.
  ///
  /// In en, this message translates to:
  /// **'Update kit piece'**
  String get garmentUpdatePiece;

  /// No description provided for @garmentKeepSimple.
  ///
  /// In en, this message translates to:
  /// **'Keep it simple'**
  String get garmentKeepSimple;

  /// No description provided for @garmentNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Dainese Carve Master'**
  String get garmentNameHint;

  /// No description provided for @garmentQuickType.
  ///
  /// In en, this message translates to:
  /// **'Quick type (optional)'**
  String get garmentQuickType;

  /// No description provided for @garmentMaterial.
  ///
  /// In en, this message translates to:
  /// **'Material'**
  String get garmentMaterial;

  /// No description provided for @garmentUnspecified.
  ///
  /// In en, this message translates to:
  /// **'Unspecified'**
  String get garmentUnspecified;

  /// No description provided for @garmentVentilation.
  ///
  /// In en, this message translates to:
  /// **'Has ventilation'**
  String get garmentVentilation;

  /// No description provided for @garmentVentilationHint.
  ///
  /// In en, this message translates to:
  /// **'Open or closed is chosen per ride later'**
  String get garmentVentilationHint;

  /// No description provided for @garmentHeated.
  ///
  /// In en, this message translates to:
  /// **'Heated'**
  String get garmentHeated;

  /// No description provided for @garmentThermalLiner.
  ///
  /// In en, this message translates to:
  /// **'Thermal liner included'**
  String get garmentThermalLiner;

  /// No description provided for @garmentThermalLinerHint.
  ///
  /// In en, this message translates to:
  /// **'Same jacket — the liner can be installed, it is not a second item'**
  String get garmentThermalLinerHint;

  /// No description provided for @garmentWaterproofLiner.
  ///
  /// In en, this message translates to:
  /// **'Waterproof liner included'**
  String get garmentWaterproofLiner;

  /// No description provided for @garmentBrand.
  ///
  /// In en, this message translates to:
  /// **'Brand (optional)'**
  String get garmentBrand;

  /// No description provided for @garmentModel.
  ///
  /// In en, this message translates to:
  /// **'Model (optional)'**
  String get garmentModel;

  /// No description provided for @garmentMoreDetails.
  ///
  /// In en, this message translates to:
  /// **'More details'**
  String get garmentMoreDetails;

  /// No description provided for @garmentMoreDetailsHint.
  ///
  /// In en, this message translates to:
  /// **'Adjust warmth and weather properties'**
  String get garmentMoreDetailsHint;

  /// No description provided for @garmentNotes.
  ///
  /// In en, this message translates to:
  /// **'Notes (optional)'**
  String get garmentNotes;

  /// No description provided for @garmentSaveChanges.
  ///
  /// In en, this message translates to:
  /// **'Save changes'**
  String get garmentSaveChanges;

  /// No description provided for @garmentAddToWardrobe.
  ///
  /// In en, this message translates to:
  /// **'Add to wardrobe'**
  String get garmentAddToWardrobe;

  /// No description provided for @garmentNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Name is required'**
  String get garmentNameRequired;

  /// No description provided for @catalogueSearchBrand.
  ///
  /// In en, this message translates to:
  /// **'Search brand'**
  String get catalogueSearchBrand;

  /// No description provided for @catalogueSearchModel.
  ///
  /// In en, this message translates to:
  /// **'Search model'**
  String get catalogueSearchModel;

  /// No description provided for @catalogueWriteYourself.
  ///
  /// In en, this message translates to:
  /// **'Other / write yourself'**
  String get catalogueWriteYourself;

  /// No description provided for @catalogueWriteYourselfHint.
  ///
  /// In en, this message translates to:
  /// **'Your own name stays on this garment. It is not added to the shared catalogue.'**
  String get catalogueWriteYourselfHint;

  /// No description provided for @catalogueYourValue.
  ///
  /// In en, this message translates to:
  /// **'Your value'**
  String get catalogueYourValue;

  /// No description provided for @catalogueAutomaticDefault.
  ///
  /// In en, this message translates to:
  /// **'Automatic default'**
  String get catalogueAutomaticDefault;

  /// No description provided for @catalogueCommunityEstimate.
  ///
  /// In en, this message translates to:
  /// **'Community estimate · {count} contributions'**
  String catalogueCommunityEstimate(int count);

  /// No description provided for @catalogueNotVerified.
  ///
  /// In en, this message translates to:
  /// **'Brand and model choices are a curated list, not verified manufacturer measurements.'**
  String get catalogueNotVerified;

  /// No description provided for @catalogueUseModel.
  ///
  /// In en, this message translates to:
  /// **'Use this model'**
  String get catalogueUseModel;

  /// No description provided for @catalogueChangeProduct.
  ///
  /// In en, this message translates to:
  /// **'Change product'**
  String get catalogueChangeProduct;

  /// No description provided for @catalogueContributeTitle.
  ///
  /// In en, this message translates to:
  /// **'Share this rating'**
  String get catalogueContributeTitle;

  /// No description provided for @catalogueContributeBody.
  ///
  /// In en, this message translates to:
  /// **'Only values you set yourself are counted. Automatic defaults, demo clothes, copied values, and adding the same product again without a new rating are not counted. RideWear stores a count for each score from 1 to 5. It does not store your name, notes, account, or garment. The number is a count of contributions, not of different people. Removing the highest and lowest score is not protection against misuse.'**
  String get catalogueContributeBody;

  /// No description provided for @tierWarmth.
  ///
  /// In en, this message translates to:
  /// **'Warmth'**
  String get tierWarmth;

  /// No description provided for @tierWind.
  ///
  /// In en, this message translates to:
  /// **'Wind resistance'**
  String get tierWind;

  /// No description provided for @tierWater.
  ///
  /// In en, this message translates to:
  /// **'Waterproofness'**
  String get tierWater;

  /// No description provided for @tierBreath.
  ///
  /// In en, this message translates to:
  /// **'Breathability'**
  String get tierBreath;

  /// No description provided for @garmentLiners.
  ///
  /// In en, this message translates to:
  /// **'{count} liner(s)'**
  String garmentLiners(int count);

  /// No description provided for @garmentVents.
  ///
  /// In en, this message translates to:
  /// **'vents'**
  String get garmentVents;

  /// No description provided for @garmentHeatedShort.
  ///
  /// In en, this message translates to:
  /// **'heated'**
  String get garmentHeatedShort;

  /// No description provided for @catBaseLayer.
  ///
  /// In en, this message translates to:
  /// **'Base layer'**
  String get catBaseLayer;

  /// No description provided for @catMidLayer.
  ///
  /// In en, this message translates to:
  /// **'Mid layer'**
  String get catMidLayer;

  /// No description provided for @catShellJacket.
  ///
  /// In en, this message translates to:
  /// **'Shell jacket'**
  String get catShellJacket;

  /// No description provided for @catPants.
  ///
  /// In en, this message translates to:
  /// **'Pants'**
  String get catPants;

  /// No description provided for @catOnePieceSuit.
  ///
  /// In en, this message translates to:
  /// **'One-piece suit'**
  String get catOnePieceSuit;

  /// No description provided for @catGloves.
  ///
  /// In en, this message translates to:
  /// **'Gloves'**
  String get catGloves;

  /// No description provided for @catBoots.
  ///
  /// In en, this message translates to:
  /// **'Boots'**
  String get catBoots;

  /// No description provided for @catSocks.
  ///
  /// In en, this message translates to:
  /// **'Socks'**
  String get catSocks;

  /// No description provided for @catHeadwear.
  ///
  /// In en, this message translates to:
  /// **'Headwear'**
  String get catHeadwear;

  /// No description provided for @catNeckwear.
  ///
  /// In en, this message translates to:
  /// **'Neckwear'**
  String get catNeckwear;

  /// No description provided for @catHeatedVest.
  ///
  /// In en, this message translates to:
  /// **'Heated vest'**
  String get catHeatedVest;

  /// No description provided for @catRainLayer.
  ///
  /// In en, this message translates to:
  /// **'Rain layer'**
  String get catRainLayer;

  /// No description provided for @matTextile.
  ///
  /// In en, this message translates to:
  /// **'Textile'**
  String get matTextile;

  /// No description provided for @matLeather.
  ///
  /// In en, this message translates to:
  /// **'Leather'**
  String get matLeather;

  /// No description provided for @matMesh.
  ///
  /// In en, this message translates to:
  /// **'Mesh'**
  String get matMesh;

  /// No description provided for @matDenim.
  ///
  /// In en, this message translates to:
  /// **'Denim'**
  String get matDenim;

  /// No description provided for @matSynthetic.
  ///
  /// In en, this message translates to:
  /// **'Synthetic'**
  String get matSynthetic;

  /// No description provided for @matMerino.
  ///
  /// In en, this message translates to:
  /// **'Merino'**
  String get matMerino;

  /// No description provided for @matMixed.
  ///
  /// In en, this message translates to:
  /// **'Mixed'**
  String get matMixed;

  /// No description provided for @matOther.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get matOther;

  /// No description provided for @presetTextileJacket.
  ///
  /// In en, this message translates to:
  /// **'Textile motorcycle jacket'**
  String get presetTextileJacket;

  /// No description provided for @presetMeshJacket.
  ///
  /// In en, this message translates to:
  /// **'Mesh / summer jacket'**
  String get presetMeshJacket;

  /// No description provided for @presetLeatherJacket.
  ///
  /// In en, this message translates to:
  /// **'Leather motorcycle jacket'**
  String get presetLeatherJacket;

  /// No description provided for @presetTextilePants.
  ///
  /// In en, this message translates to:
  /// **'Textile motorcycle pants'**
  String get presetTextilePants;

  /// No description provided for @presetMotorcycleJeans.
  ///
  /// In en, this message translates to:
  /// **'Motorcycle jeans'**
  String get presetMotorcycleJeans;

  /// No description provided for @presetOnePieceSuit.
  ///
  /// In en, this message translates to:
  /// **'One-piece suit'**
  String get presetOnePieceSuit;

  /// No description provided for @presetSummerGloves.
  ///
  /// In en, this message translates to:
  /// **'Summer gloves'**
  String get presetSummerGloves;

  /// No description provided for @presetWinterGloves.
  ///
  /// In en, this message translates to:
  /// **'Winter gloves'**
  String get presetWinterGloves;

  /// No description provided for @presetHeatedGloves.
  ///
  /// In en, this message translates to:
  /// **'Heated gloves'**
  String get presetHeatedGloves;

  /// No description provided for @cyclingGarmentType.
  ///
  /// In en, this message translates to:
  /// **'Cycling garment'**
  String get cyclingGarmentType;

  /// No description provided for @cyclingLongTrousers.
  ///
  /// In en, this message translates to:
  /// **'Long cycling trousers / tights'**
  String get cyclingLongTrousers;

  /// No description provided for @cyclingShorts.
  ///
  /// In en, this message translates to:
  /// **'Short cycling shorts'**
  String get cyclingShorts;

  /// No description provided for @cyclingTriathlonSuit.
  ///
  /// In en, this message translates to:
  /// **'Triathlon suit'**
  String get cyclingTriathlonSuit;

  /// No description provided for @cyclingShortSleeveTee.
  ///
  /// In en, this message translates to:
  /// **'Short-sleeve technical T-shirt'**
  String get cyclingShortSleeveTee;

  /// No description provided for @cyclingLongJersey.
  ///
  /// In en, this message translates to:
  /// **'Long-sleeve technical jersey'**
  String get cyclingLongJersey;

  /// No description provided for @cyclingJacket.
  ///
  /// In en, this message translates to:
  /// **'Thin cycling jacket'**
  String get cyclingJacket;

  /// No description provided for @cyclingFingerlessGloves.
  ///
  /// In en, this message translates to:
  /// **'Fingerless cycling gloves'**
  String get cyclingFingerlessGloves;

  /// No description provided for @cyclingFullFingerGloves.
  ///
  /// In en, this message translates to:
  /// **'Thin full-finger cycling gloves'**
  String get cyclingFullFingerGloves;

  /// No description provided for @cyclingWarmthThin.
  ///
  /// In en, this message translates to:
  /// **'Thin'**
  String get cyclingWarmthThin;

  /// No description provided for @cyclingWarmthMedium.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get cyclingWarmthMedium;

  /// No description provided for @cyclingWarmthWarm.
  ///
  /// In en, this message translates to:
  /// **'Warm'**
  String get cyclingWarmthWarm;

  /// No description provided for @cyclingAdvancedWinter.
  ///
  /// In en, this message translates to:
  /// **'Advanced settings / winter'**
  String get cyclingAdvancedWinter;

  /// No description provided for @cyclingDefaultsEstimate.
  ///
  /// In en, this message translates to:
  /// **'These defaults are estimates, not measured manufacturer values.'**
  String get cyclingDefaultsEstimate;

  /// No description provided for @routeNew.
  ///
  /// In en, this message translates to:
  /// **'New route'**
  String get routeNew;

  /// No description provided for @routeEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit route'**
  String get routeEdit;

  /// No description provided for @routeNameHint.
  ///
  /// In en, this message translates to:
  /// **'Work 1, Sunday loop…'**
  String get routeNameHint;

  /// No description provided for @routeDescription.
  ///
  /// In en, this message translates to:
  /// **'Description (optional)'**
  String get routeDescription;

  /// No description provided for @routeFavoriteHint.
  ///
  /// In en, this message translates to:
  /// **'Shows first on the motorcycle home screen'**
  String get routeFavoriteHint;

  /// No description provided for @routeSection.
  ///
  /// In en, this message translates to:
  /// **'Route'**
  String get routeSection;

  /// No description provided for @routeSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search for places — you do not need to enter coordinates.'**
  String get routeSearchHint;

  /// No description provided for @routeAdvancedCoords.
  ///
  /// In en, this message translates to:
  /// **'Advanced: coordinates'**
  String get routeAdvancedCoords;

  /// No description provided for @routeAdvancedHint.
  ///
  /// In en, this message translates to:
  /// **'Developer / fallback only'**
  String get routeAdvancedHint;

  /// No description provided for @coordLatitude.
  ///
  /// In en, this message translates to:
  /// **'{role} latitude'**
  String coordLatitude(String role);

  /// No description provided for @coordLongitude.
  ///
  /// In en, this message translates to:
  /// **'Longitude'**
  String get coordLongitude;

  /// No description provided for @coordApply.
  ///
  /// In en, this message translates to:
  /// **'Apply coordinates'**
  String get coordApply;

  /// No description provided for @routeCatWork.
  ///
  /// In en, this message translates to:
  /// **'Work'**
  String get routeCatWork;

  /// No description provided for @routeCatCommute.
  ///
  /// In en, this message translates to:
  /// **'Commute'**
  String get routeCatCommute;

  /// No description provided for @routeCatHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get routeCatHome;

  /// No description provided for @routeCatWeekend.
  ///
  /// In en, this message translates to:
  /// **'Weekend'**
  String get routeCatWeekend;

  /// No description provided for @routeCatTouring.
  ///
  /// In en, this message translates to:
  /// **'Touring'**
  String get routeCatTouring;

  /// No description provided for @routeCatFavourite.
  ///
  /// In en, this message translates to:
  /// **'Favourite'**
  String get routeCatFavourite;

  /// No description provided for @routeCatCustom.
  ///
  /// In en, this message translates to:
  /// **'Custom'**
  String get routeCatCustom;

  /// No description provided for @mapSelectEndpoints.
  ///
  /// In en, this message translates to:
  /// **'Select start and destination to preview the route'**
  String get mapSelectEndpoints;

  /// No description provided for @placeSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search place or address'**
  String get placeSearchHint;

  /// No description provided for @placeNoResults.
  ///
  /// In en, this message translates to:
  /// **'No places found'**
  String get placeNoResults;

  /// No description provided for @placeSearchFailed.
  ///
  /// In en, this message translates to:
  /// **'Place search failed'**
  String get placeSearchFailed;

  /// No description provided for @placeSearchUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Place search is temporarily unavailable.'**
  String get placeSearchUnavailable;

  /// No description provided for @placeSearchNotConfigured.
  ///
  /// In en, this message translates to:
  /// **'Place search is not configured on the server.'**
  String get placeSearchNotConfigured;

  /// No description provided for @placeNotFound.
  ///
  /// In en, this message translates to:
  /// **'That place could not be selected. Try again.'**
  String get placeNotFound;

  /// No description provided for @routeStraightSegmentsNotice.
  ///
  /// In en, this message translates to:
  /// **'Preview uses straight segments because road routing is not available.'**
  String get routeStraightSegmentsNotice;

  /// No description provided for @plannerCouldNotSave.
  ///
  /// In en, this message translates to:
  /// **'Could not save the route for analysis.'**
  String get plannerCouldNotSave;

  /// No description provided for @feedbackTitle.
  ///
  /// In en, this message translates to:
  /// **'How did the kit feel?'**
  String get feedbackTitle;

  /// No description provided for @feedbackTooCold.
  ///
  /// In en, this message translates to:
  /// **'Too cold'**
  String get feedbackTooCold;

  /// No description provided for @feedbackSlightlyCold.
  ///
  /// In en, this message translates to:
  /// **'Slightly cold'**
  String get feedbackSlightlyCold;

  /// No description provided for @feedbackJustRight.
  ///
  /// In en, this message translates to:
  /// **'Just right'**
  String get feedbackJustRight;

  /// No description provided for @feedbackSlightlyWarm.
  ///
  /// In en, this message translates to:
  /// **'Slightly warm'**
  String get feedbackSlightlyWarm;

  /// No description provided for @feedbackTooWarm.
  ///
  /// In en, this message translates to:
  /// **'Too warm'**
  String get feedbackTooWarm;

  /// No description provided for @feedbackZoneTorso.
  ///
  /// In en, this message translates to:
  /// **'Upper body'**
  String get feedbackZoneTorso;

  /// No description provided for @feedbackZoneLegs.
  ///
  /// In en, this message translates to:
  /// **'Legs'**
  String get feedbackZoneLegs;

  /// No description provided for @feedbackZoneCold.
  ///
  /// In en, this message translates to:
  /// **'Cold'**
  String get feedbackZoneCold;

  /// No description provided for @feedbackZoneComfortable.
  ///
  /// In en, this message translates to:
  /// **'Comfortable'**
  String get feedbackZoneComfortable;

  /// No description provided for @feedbackZoneHot.
  ///
  /// In en, this message translates to:
  /// **'Hot'**
  String get feedbackZoneHot;

  /// No description provided for @feedbackSubmit.
  ///
  /// In en, this message translates to:
  /// **'Submit feedback'**
  String get feedbackSubmit;

  /// No description provided for @feedbackThanks.
  ///
  /// In en, this message translates to:
  /// **'Thanks — comfort profile updated'**
  String get feedbackThanks;

  /// No description provided for @analysisTempChip.
  ///
  /// In en, this message translates to:
  /// **'Temp {value}'**
  String analysisTempChip(String value);

  /// No description provided for @analysisRainChip.
  ///
  /// In en, this message translates to:
  /// **'Rain {value}'**
  String analysisRainChip(String value);

  /// No description provided for @departureCompareTitle.
  ///
  /// In en, this message translates to:
  /// **'Departure times'**
  String get departureCompareTitle;

  /// No description provided for @departureCompareHint.
  ///
  /// In en, this message translates to:
  /// **'Nearby departures along this route. Compare the conditions. None is ranked.'**
  String get departureCompareHint;

  /// No description provided for @departureCompareYours.
  ///
  /// In en, this message translates to:
  /// **'Your departure'**
  String get departureCompareYours;

  /// No description provided for @departureCompareUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Forecast unavailable for this time'**
  String get departureCompareUnavailable;

  /// No description provided for @departureCompareForecastAt.
  ///
  /// In en, this message translates to:
  /// **'Forecast for {time}'**
  String departureCompareForecastAt(String time);

  /// No description provided for @departureCompareForecastSpan.
  ///
  /// In en, this message translates to:
  /// **'Forecast {from}–{to}'**
  String departureCompareForecastSpan(String from, String to);

  /// No description provided for @departureComparePrecip.
  ///
  /// In en, this message translates to:
  /// **'Precipitation {value}'**
  String departureComparePrecip(String value);

  /// No description provided for @departureCompareMissing.
  ///
  /// In en, this message translates to:
  /// **'No forecast for {time}'**
  String departureCompareMissing(String time);

  /// No description provided for @departureCompareStatic.
  ///
  /// In en, this message translates to:
  /// **'This forecast does not change between these departure times.'**
  String get departureCompareStatic;

  /// No description provided for @analysisWindChip.
  ///
  /// In en, this message translates to:
  /// **'Wind {value}'**
  String analysisWindChip(String value);

  /// No description provided for @routeCoordsInvalid.
  ///
  /// In en, this message translates to:
  /// **'Coordinates must be valid numbers.'**
  String get routeCoordsInvalid;

  /// No description provided for @routeEditorIncomplete.
  ///
  /// In en, this message translates to:
  /// **'Enter a name and choose a place for start and destination.'**
  String get routeEditorIncomplete;

  /// No description provided for @coordCustomPoint.
  ///
  /// In en, this message translates to:
  /// **'Custom point'**
  String get coordCustomPoint;

  /// No description provided for @commuteTimesTitle.
  ///
  /// In en, this message translates to:
  /// **'Usual departure times'**
  String get commuteTimesTitle;

  /// No description provided for @commuteTimesHint.
  ///
  /// In en, this message translates to:
  /// **'Europe/Oslo clock times. These are templates, not a forecast.'**
  String get commuteTimesHint;

  /// No description provided for @commuteOutboundTime.
  ///
  /// In en, this message translates to:
  /// **'Outbound'**
  String get commuteOutboundTime;

  /// No description provided for @commuteReturnTime.
  ///
  /// In en, this message translates to:
  /// **'Return'**
  String get commuteReturnTime;

  /// No description provided for @commutePlanTitle.
  ///
  /// In en, this message translates to:
  /// **'Commute'**
  String get commutePlanTitle;

  /// No description provided for @commuteDate.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get commuteDate;

  /// No description provided for @commuteNextDay.
  ///
  /// In en, this message translates to:
  /// **'Return the next day'**
  String get commuteNextDay;

  /// No description provided for @commuteAnalyze.
  ///
  /// In en, this message translates to:
  /// **'See outbound and return'**
  String get commuteAnalyze;

  /// No description provided for @commuteOutboundSection.
  ///
  /// In en, this message translates to:
  /// **'Outbound'**
  String get commuteOutboundSection;

  /// No description provided for @commuteReturnSection.
  ///
  /// In en, this message translates to:
  /// **'Return'**
  String get commuteReturnSection;

  /// No description provided for @commuteWearHeading.
  ///
  /// In en, this message translates to:
  /// **'Wear for the outbound leg'**
  String get commuteWearHeading;

  /// No description provided for @commutePackHeading.
  ///
  /// In en, this message translates to:
  /// **'Pack before you leave'**
  String get commutePackHeading;

  /// No description provided for @commuteAdjustmentHeading.
  ///
  /// In en, this message translates to:
  /// **'Change for the return'**
  String get commuteAdjustmentHeading;

  /// No description provided for @commuteArrival.
  ///
  /// In en, this message translates to:
  /// **'Estimated arrival {time}'**
  String commuteArrival(String time);

  /// No description provided for @commuteUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Return weather is unavailable. Morning conditions are not used for the return. Try again.'**
  String get commuteUnavailable;

  /// No description provided for @commuteOutboundWeatherUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Outbound weather is unavailable. The return forecast is not used for this leg. Try again.'**
  String get commuteOutboundWeatherUnavailable;

  /// No description provided for @routeProviderUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Road routing is unavailable. This is not a travel time from the road provider.'**
  String get routeProviderUnavailable;

  /// No description provided for @weatherUnavailableRetry.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get weatherUnavailableRetry;

  /// No description provided for @weatherUnavailableConfiguration.
  ///
  /// In en, this message translates to:
  /// **'Weather is not configured on the server. No clothing was suggested.'**
  String get weatherUnavailableConfiguration;

  /// No description provided for @weatherUnavailableTimeout.
  ///
  /// In en, this message translates to:
  /// **'The weather service timed out. No clothing was suggested. Try again.'**
  String get weatherUnavailableTimeout;

  /// No description provided for @weatherUnavailableEmpty.
  ///
  /// In en, this message translates to:
  /// **'The weather service returned no forecast. No clothing was suggested. Try again.'**
  String get weatherUnavailableEmpty;

  /// No description provided for @weatherUnavailableMissing.
  ///
  /// In en, this message translates to:
  /// **'The forecast is missing temperature, rain, or wind. No clothing was suggested. Try again.'**
  String get weatherUnavailableMissing;

  /// No description provided for @weatherUnavailableOutOfRange.
  ///
  /// In en, this message translates to:
  /// **'No forecast covers this time. Another time was not used. Try again.'**
  String get weatherUnavailableOutOfRange;

  /// No description provided for @weatherUnavailableProvider.
  ///
  /// In en, this message translates to:
  /// **'The weather service failed. No clothing was suggested. Try again.'**
  String get weatherUnavailableProvider;

  /// No description provided for @weatherUnavailablePartial.
  ///
  /// In en, this message translates to:
  /// **'Part of this forecast is missing. No complete clothing recommendation was made. Try again.'**
  String get weatherUnavailablePartial;

  /// No description provided for @commuteForecastNote.
  ///
  /// In en, this message translates to:
  /// **'A forecast is not a guarantee.'**
  String get commuteForecastNote;

  /// No description provided for @commuteDiffDryRain.
  ///
  /// In en, this message translates to:
  /// **'Dry in the morning, rain is forecast for the return — pack rain gear.'**
  String get commuteDiffDryRain;

  /// No description provided for @commuteDiffWarmCold.
  ///
  /// In en, this message translates to:
  /// **'The outbound leg is forecast warmer than the return. Pack the extra layer for the way back.'**
  String get commuteDiffWarmCold;

  /// No description provided for @commuteLegFeedback.
  ///
  /// In en, this message translates to:
  /// **'How did this leg feel?'**
  String get commuteLegFeedback;

  /// No description provided for @commuteTimeInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter times as HH:mm.'**
  String get commuteTimeInvalid;

  /// No description provided for @commuteRain.
  ///
  /// In en, this message translates to:
  /// **'Rain {amount} mm, {probability}%'**
  String commuteRain(String amount, String probability);

  /// No description provided for @commuteWind.
  ///
  /// In en, this message translates to:
  /// **'Wind {value}'**
  String commuteWind(String value);
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
