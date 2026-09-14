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
  String get wearSection => 'Wear';

  @override
  String get packSection => 'Pack';

  @override
  String get confidenceLabel => 'Confidence';

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
  String get reasonVentsOpenRecommended => 'Open vents for warmer exposure.';

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

  @override
  String get unitsSection => 'Units';

  @override
  String get unitsPresetMetric => 'Metric';

  @override
  String get unitsPresetImperial => 'Imperial';

  @override
  String get unitsTemperature => 'Temperature';

  @override
  String get unitsDistance => 'Distance';

  @override
  String get unitsRidingSpeed => 'Riding speed';

  @override
  String get unitsWindSpeed => 'Wind speed';

  @override
  String get unitCelsius => 'Celsius (°C)';

  @override
  String get unitFahrenheit => 'Fahrenheit (°F)';

  @override
  String get unitKilometers => 'Kilometres (km)';

  @override
  String get unitMiles => 'Miles (mi)';

  @override
  String get unitKmh => 'km/h';

  @override
  String get unitMph => 'mph';

  @override
  String get unitMs => 'm/s';

  @override
  String get unitsSaved => 'Units saved';

  @override
  String get plannerTitle => 'Plan ride';

  @override
  String get plannerSubtitle =>
      'Choose where you ride, when you leave or arrive, then analyze weather and kit.';

  @override
  String get plannerSavedRoutes => 'Saved';

  @override
  String get plannerChooseSavedRoute => 'Use a saved route';

  @override
  String get plannerNoSavedRoutes =>
      'No saved routes yet. Build one here, then save it.';

  @override
  String get plannerUseCurrentLocation => 'Use current location';

  @override
  String get plannerLocationPermissionDenied =>
      'Location permission was denied. You can still search for a start place.';

  @override
  String get plannerLocationPermissionDeniedForever =>
      'Location permission is blocked. Enable it in system settings, or search for a start place.';

  @override
  String get plannerLocationServicesDisabled =>
      'Location services are off. Turn them on, or search for a start place.';

  @override
  String get plannerLocationTemporaryFailure =>
      'Could not read your location right now. Try again or search for a place.';

  @override
  String get plannerMoveUp => 'Move up';

  @override
  String get plannerMoveDown => 'Move down';

  @override
  String get plannerRemoveStop => 'Remove stop';

  @override
  String get plannerAddStop => 'Add stop';

  @override
  String get plannerReverse => 'Reverse';

  @override
  String get plannerRoundTrip => 'Return to start';

  @override
  String get plannerWhenSection => 'When';

  @override
  String get plannerDeparture => 'Departure';

  @override
  String get plannerArrival => 'Arrival';

  @override
  String get plannerDepartureHint => 'The time is when you leave.';

  @override
  String get plannerArrivalHint =>
      'The time is when you want to arrive. Departure is estimated from ride duration.';

  @override
  String get plannerDepartureTime => 'Departure time';

  @override
  String get plannerArrivalTime => 'Arrival time';

  @override
  String get plannerOptionsSection => 'Route options';

  @override
  String get plannerAvoidMotorways => 'Avoid motorways';

  @override
  String get plannerAvoidMotorwaysHint =>
      'Prefer non-motorway roads when the provider supports it.';

  @override
  String get plannerRouteName => 'Route name';

  @override
  String get plannerRouteNameHint => 'e.g. Work commute';

  @override
  String get plannerAnalyzeRide => 'Analyze ride';

  @override
  String get plannerSaveRoute => 'Save route';

  @override
  String get plannerPrimaryActionHint =>
      'Analyze ride checks weather and clothing. It does not start navigation.';

  @override
  String get plannerSaveDisabledHint =>
      'Add a name and choose start and destination before saving.';

  @override
  String get plannerIncompleteRoute =>
      'Choose a start and destination before analyzing.';

  @override
  String get plannerDefaultRouteName => 'Ride plan';

  @override
  String get plannerRouteSaved => 'Route saved';

  @override
  String get plannerMapFailed => 'Map preview failed';

  @override
  String get plannerAnalysisTitle => 'Ride analysis';

  @override
  String get plannerAnalysisSubtitle =>
      'Weather, exposure, and kit for this plan';

  @override
  String get plannerNoWearItems => 'No wear items returned.';

  @override
  String get plannerNoPackItems => 'No pack items returned.';

  @override
  String get plannerBackToPlanner => 'Back to planner';
}
