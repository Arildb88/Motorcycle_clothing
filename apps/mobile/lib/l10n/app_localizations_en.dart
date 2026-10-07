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
  String get reasonBasicUnderlayerWarmth =>
      'Basic clothes already worn cover some warmth, so less extra layering is suggested.';

  @override
  String get reasonRouteSpeedProfileUsed =>
      'Timing uses the route\'s own speed profile.';

  @override
  String get reasonRouteSpeedProfileUnavailable =>
      'No route speed profile was available, so a default pace was used.';

  @override
  String get reasonAssumedCruiseSpeed =>
      'Cruise speed was assumed because the route did not provide one.';

  @override
  String get reasonWindDirectionUnavailable =>
      'Wind direction was not available, so airflow is not calculated as a vector.';

  @override
  String get reasonElevationUsed =>
      'Ground elevation was included with the weather request where a height was known.';

  @override
  String get reasonElevationPartial =>
      'Ground elevation is missing for part of this plan.';

  @override
  String get reasonElevationUnavailable =>
      'Ground elevation was not available, so the weather request did not include height.';

  @override
  String get reasonVentOrPackShell =>
      'Use vents or pack a shell for changing conditions.';

  @override
  String get reasonGenericCyclingKit =>
      'This is a generic cycling kit because matching owned garments were not found.';

  @override
  String get reasonAssumedRideStyle =>
      'Ride effort was assumed because it was not specified.';

  @override
  String get reasonRouteGeometryFallback =>
      'Road geometry was unavailable, so weather samples follow the saved points.';

  @override
  String get reasonHelmetAssumed =>
      'A helmet is assumed and is not chosen by this clothing kit.';

  @override
  String get reasonFeetLimitingZone =>
      'Feet need more warmth than the torso on this ride.';

  @override
  String get reasonHandsWindChill =>
      'Hands see more wind than the torso on this ride.';

  @override
  String get reasonUpperMountainSetsKit =>
      'The colder upper mountain sets what you wear.';

  @override
  String get reasonStayingAtBase =>
      'The plan stays at the base, so the base forecast sets the kit.';

  @override
  String get reasonVillageWeatherNotUsedAsSummit =>
      'Village or base weather is not used as the summit forecast.';

  @override
  String get reasonUpperSiteMissing =>
      'No upper-mountain site was identified, so summit conditions are unknown.';

  @override
  String get reasonUpperElevationUnavailable =>
      'The upper site has no elevation, so its forecast was not requested.';

  @override
  String get reasonSitesNeedLabels =>
      'Sites could not be ordered into base and summit. Add labels or heights.';

  @override
  String get reasonMidElevationEstimated =>
      'The mid-mountain height is estimated, not measured.';

  @override
  String get reasonTemperatureSpread =>
      'Temperature differs between the base and the upper mountain.';

  @override
  String get reasonHighWindAtUpper => 'Wind at the upper mountain is high.';

  @override
  String get reasonAssumedExposureMode =>
      'Exposure mode was assumed because it was not specified.';

  @override
  String get reasonGenericAlpineKit =>
      'This is a generic alpine kit because matching owned garments were not found.';

  @override
  String get reasonLeaveWarmerLayerOffHill =>
      'Leave the warmer layer off while you are on the hill.';

  @override
  String get reasonBootsAreEquipment =>
      'Boots are equipment and are not chosen by this clothing kit.';

  @override
  String get reasonGogglesAreEquipment =>
      'Goggles are equipment and are not chosen by this clothing kit.';

  @override
  String get reasonHelmetIsEquipment =>
      'A helmet is equipment and is not chosen by this clothing kit.';

  @override
  String get reasonShortColdStopPacked =>
      'A short cold stop is covered by something packed, not worn the whole time.';

  @override
  String get reasonPackShell =>
      'Pack a shell instead of wearing it the whole time.';

  @override
  String get reasonVentsForClimb => 'Open vents while climbing.';

  @override
  String get reasonGenericXcKit =>
      'This is a generic cross-country kit because matching owned garments were not found.';

  @override
  String get reasonAssumedIntensity =>
      'Intensity was assumed because it was not specified.';

  @override
  String get reasonAssumedDuration =>
      'Duration was assumed because the route has no saved length.';

  @override
  String get reasonStyleNotSpecified =>
      'Classic or skate was not specified, so boots are not chosen.';

  @override
  String get reasonClassicBootsAreEquipment =>
      'Classic boots are equipment and are not chosen by this clothing kit.';

  @override
  String get reasonSkateBootsAreEquipment =>
      'Skate boots are equipment and are not chosen by this clothing kit.';

  @override
  String get reasonUserTrackNotRoad =>
      'Weather follows your track, not a road route.';

  @override
  String get reasonClimbReducesWornDemand =>
      'Climbing reduces how much insulation you need to wear.';

  @override
  String get reasonNoGroomingStatus =>
      'Grooming status is not known and is not part of this recommendation.';

  @override
  String get reasonNoWaxAdvice =>
      'This recommendation does not include wax advice.';

  @override
  String get reasonsSection => 'Why this kit';

  @override
  String get limitsSection => 'Limits and assumptions';

  @override
  String get wearSectionHint => 'Worn for this session';

  @override
  String get packSectionHint => 'Packed, not worn the whole time';

  @override
  String elevationRange(String min, String max) {
    return 'Elevation $min–$max m';
  }

  @override
  String elevationSingle(String value) {
    return 'Elevation $value m';
  }

  @override
  String get elevationEstimated => 'estimated height';

  @override
  String get siteBase => 'Base';

  @override
  String get siteMid => 'Mid';

  @override
  String get siteUpper => 'Upper';

  @override
  String elevationAttribution(String source) {
    return 'Elevation source: $source';
  }

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
  String get plannerSiteSubtitle =>
      'Choose the mountain or area. One place is enough. Extra places can mark base and summit.';

  @override
  String get plannerResortSubtitle =>
      'Which ski resort will you use? Search by name, or find resorts near you or near a place.';

  @override
  String get plannerResortName => 'Ski resort';

  @override
  String get plannerResortNearby => 'Find resorts nearby';

  @override
  String get plannerResortNearPlace => 'Near a place';

  @override
  String get plannerResortEmpty => 'No ski resorts found.';

  @override
  String get plannerResortUnavailable =>
      'Ski resort search is temporarily unavailable.';

  @override
  String get plannerResortAttribution => 'Resort information from Fnugg.no';

  @override
  String get plannerResortSelected => 'Selected resort';

  @override
  String plannerResortStraightLineKm(String distance) {
    return '$distance km in a straight line';
  }

  @override
  String plannerResortStraightLineMeters(int meters) {
    return '$meters m in a straight line';
  }

  @override
  String get plannerResortLocationDenied =>
      'Location permission was denied. You can still search for a ski resort by name.';

  @override
  String get plannerResortLocationDeniedForever =>
      'Location permission is blocked. Enable it in system settings, or search for a ski resort by name.';

  @override
  String get plannerResortLocationDisabled =>
      'Location services are off. Turn them on, or search for a ski resort by name.';

  @override
  String get plannerResortLocationTemporary =>
      'Could not read your location right now. Try again or search for a ski resort.';

  @override
  String get plannerTrailSubtitle =>
      'Find a cross-country trail near you, or plan your own start and finish.';

  @override
  String get plannerTrailNearby => 'Find a trail nearby';

  @override
  String get plannerTrailManual => 'Plan your own trip';

  @override
  String get plannerTrailNearPlace => 'Near a place';

  @override
  String get plannerTrailEmpty => 'No ski trails found.';

  @override
  String get plannerTrailUnavailable =>
      'Ski trail search is temporarily unavailable.';

  @override
  String get plannerTrailAttribution => 'Trail information from Kartverket';

  @override
  String get plannerTrailSelected => 'Selected trail';

  @override
  String get plannerTrailLocationDenied =>
      'Location permission was denied. You can still search near a place, or plan your own trip.';

  @override
  String get plannerTrailLocationDeniedForever =>
      'Location permission is blocked. Enable it in system settings, search near a place, or plan your own trip.';

  @override
  String get plannerTrailLocationDisabled =>
      'Location services are off. Turn them on, search near a place, or plan your own trip.';

  @override
  String get plannerTrailLocationTemporary =>
      'Could not read your location right now. Try again, search near a place, or plan your own trip.';

  @override
  String get plannerIncompleteResort => 'Choose a ski resort before analyzing.';

  @override
  String get plannerSaveDisabledResort =>
      'Add a name and choose a ski resort before saving.';

  @override
  String get plannerPlace => 'Place';

  @override
  String plannerPlaceNumber(int number) {
    return 'Place $number';
  }

  @override
  String get plannerAddPlace => 'Add place';

  @override
  String get plannerSaveDisabledSite =>
      'Add a name and choose a place before saving.';

  @override
  String get plannerIncompleteSite => 'Choose a place before analyzing.';

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
  String get routeDrivingGeometryNotice =>
      'Road-following driving geometry. This route is not motorcycle-optimized.';

  @override
  String get routeRoutingUnavailable =>
      'Road routing is temporarily unavailable.';

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

  @override
  String get authTagline =>
      'Dress for the ride — personalized across outdoor activities.';

  @override
  String get authEmailLabel => 'Email';

  @override
  String get authPasswordLabel => 'Password';

  @override
  String get authDisplayNameLabel => 'Display name';

  @override
  String get authContinueWithEmail => 'Continue with email';

  @override
  String get authCreateAccount => 'Create account';

  @override
  String get authHaveAccountSignIn => 'Have an account? Sign in';

  @override
  String get authNewHereRegister => 'New here? Register';

  @override
  String get authForgotPassword => 'Forgot password?';

  @override
  String get authContinueMicrosoft => 'Continue with Microsoft';

  @override
  String get authContinueMicrosoftDev => 'Continue with Microsoft (dev)';

  @override
  String get authContinueFacebook => 'Continue with Facebook';

  @override
  String get authContinueFacebookDev => 'Continue with Facebook (dev)';

  @override
  String get authSocialLoginHint =>
      'Social login buttons enable when Facebook/Microsoft apps are configured on the API.';

  @override
  String get authEmailAlreadyRegistered =>
      'An account with this email already exists.';

  @override
  String get authInvalidCredentials => 'Invalid email or password.';

  @override
  String get authInvalidEmail => 'Enter a valid email address.';

  @override
  String get authPasswordRequired => 'Enter your password.';

  @override
  String get authPasswordTooShort => 'Password must be at least 8 characters.';

  @override
  String get authDisplayNameRequired => 'Enter a display name.';

  @override
  String get authNetworkError =>
      'Could not reach the server. Check your connection and try again.';

  @override
  String get authGenericFailure => 'Something went wrong. Please try again.';

  @override
  String get authForgotPasswordTitle => 'Forgot password';

  @override
  String get authForgotPasswordSubtitle =>
      'Enter your email and we will send a reset link if an account exists.';

  @override
  String get authSendResetLink => 'Send reset link';

  @override
  String get authForgotPasswordSuccess =>
      'If an account exists for this email, a password reset link has been sent.';

  @override
  String get authHaveResetToken => 'I already have a reset token';

  @override
  String get authResetPasswordTitle => 'Reset password';

  @override
  String get authResetPasswordSubtitle =>
      'Paste your reset token and choose a new password.';

  @override
  String get authResetTokenLabel => 'Reset token';

  @override
  String get authNewPasswordLabel => 'New password';

  @override
  String get authConfirmPasswordLabel => 'Confirm password';

  @override
  String get authSetNewPassword => 'Set new password';

  @override
  String get authPasswordMismatch => 'Passwords do not match.';

  @override
  String get authPasswordResetSuccess =>
      'Password updated. You can sign in now.';

  @override
  String get authInvalidResetToken =>
      'This password reset link is invalid or has expired.';

  @override
  String get authChangePassword => 'Change password';

  @override
  String get authChangePasswordTitle => 'Change password';

  @override
  String get authChangePasswordSubtitle =>
      'Enter your current password, then choose a new one.';

  @override
  String get authCurrentPasswordLabel => 'Current password';

  @override
  String get authCurrentPasswordRequired => 'Enter your current password.';

  @override
  String get authInvalidCurrentPassword => 'Current password is incorrect.';

  @override
  String get authNoLocalPassword => 'This account does not use a password.';

  @override
  String get authPasswordChanged => 'Password updated.';

  @override
  String get commonCancel => 'Cancel';

  @override
  String get commonDelete => 'Delete';

  @override
  String get commonSave => 'Save';

  @override
  String get commonEdit => 'Edit';

  @override
  String get commonRetry => 'Retry';

  @override
  String get commonContinue => 'Continue';

  @override
  String get commonClear => 'Clear';

  @override
  String get commonRemove => 'Remove';

  @override
  String get commonNone => 'None';

  @override
  String get commonCustom => 'Custom';

  @override
  String get commonName => 'Name';

  @override
  String get commonCategory => 'Category';

  @override
  String get commonFavorite => 'Favorite';

  @override
  String get commonUnfavorite => 'Unfavorite';

  @override
  String get errorGeneric => 'Something went wrong. Please try again.';

  @override
  String get errorCouldNotLoad => 'Could not load this. Try again.';

  @override
  String get currentLocation => 'Current location';

  @override
  String get labelStart => 'Start';

  @override
  String get labelDestination => 'Destination';

  @override
  String get labelEnd => 'End';

  @override
  String waypointStop(int index) {
    return 'Stop $index';
  }

  @override
  String routeLoopSummary(String start, int count) {
    return '$start · loop · $count stops';
  }

  @override
  String routeViaSummary(String start, String end, int count) {
    return '$start → … → $end ($count)';
  }

  @override
  String durationMinutes(int minutes) {
    return '~$minutes min';
  }

  @override
  String durationHours(int hours) {
    return '~$hours h';
  }

  @override
  String durationHoursMinutes(int hours, int minutes) {
    return '~$hours h $minutes m';
  }

  @override
  String get homePlanNewChip => '+ Plan new';

  @override
  String get homeSaveRouteChip => 'Save a route';

  @override
  String get homeHowWasTheRide => 'How was the ride?';

  @override
  String get homeFallbackRide => 'Ride';

  @override
  String get metricTemp => 'Temp';

  @override
  String get metricExposure => 'Exposure';

  @override
  String get metricRain => 'Rain';

  @override
  String get metricWind => 'Wind';

  @override
  String kitNotOwned(String name) {
    return '$name (not owned)';
  }

  @override
  String get kitFallbackItem => 'Item';

  @override
  String get confidenceHigh => 'High';

  @override
  String get confidenceMedium => 'Medium';

  @override
  String get confidenceLow => 'Low';

  @override
  String get configInstallThermalLiner => 'install thermal liner';

  @override
  String get configInstallWaterproofLiner => 'install waterproof liner';

  @override
  String get configRemoveThermalLiner => 'remove thermal liner';

  @override
  String get configVentsOpen => 'vents open';

  @override
  String get configVentsClosed => 'vents closed';

  @override
  String get routesTitle => 'Saved routes';

  @override
  String get routesSubtitle =>
      'Reusable templates for motorcycle. Weather and kit are always recalculated when you launch a ride.';

  @override
  String get routesEditTemplate => 'Edit route template';

  @override
  String get routesDeleteTitle => 'Delete route?';

  @override
  String routesDeleteBody(String name) {
    return '“$name” will be removed. Past rides keep their route snapshot.';
  }

  @override
  String get profileSection => 'Profile';

  @override
  String get profileDisplayName => 'Display name';

  @override
  String get profileAvatarInitials => 'Avatar: initials for now';

  @override
  String get profileAvatarProvider => 'provider image available';

  @override
  String get profileActivitySection => 'Activity';

  @override
  String get profileDefaultActivity => 'Default activity';

  @override
  String get profileShowChooser => 'Show activity chooser at startup';

  @override
  String get profileLoginMethods => 'Connected login methods';

  @override
  String get profileLinked => 'Linked';

  @override
  String get profileConnectFacebook => 'Connect Facebook login';

  @override
  String get profileConnectMicrosoft => 'Connect Microsoft login';

  @override
  String get profileServices => 'Connected services';

  @override
  String get profileConnected => 'Connected';

  @override
  String get profileSync => 'Sync';

  @override
  String get profileDisconnect => 'Disconnect';

  @override
  String get profileConnectStrava => 'Connect Strava';

  @override
  String get profileStravaNotConfigured =>
      'Strava is not set up on the server yet.';

  @override
  String get profileSave => 'Save profile';

  @override
  String get profileAccount => 'Account';

  @override
  String get profileSignOut => 'Sign out';

  @override
  String get profileDeleteAccount => 'Delete account';

  @override
  String get profileDeleteTitle => 'Delete account?';

  @override
  String get profileDeleteBody =>
      'This permanently deletes your RideWear account, wardrobe, and history.';

  @override
  String get profileDemoLinkHint =>
      'Set up Facebook or Microsoft on the server to link them to this account.';

  @override
  String get profileLoginFallback => 'Login';

  @override
  String get activityMotorcycle => 'Motorcycle';

  @override
  String get activityHiking => 'Hiking';

  @override
  String get activityCycling => 'Cycling';

  @override
  String get activityAlpineSkiing => 'Alpine skiing';

  @override
  String get activitySnowboarding => 'Snowboarding';

  @override
  String get activityAlpineAndSnowboard => 'Alpine & snowboard';

  @override
  String get activityXcSkiing => 'Cross-country skiing';

  @override
  String get plannerResortDiscipline => 'Skiing or snowboarding';

  @override
  String get plannerIntensity => 'Effort';

  @override
  String get plannerIntensityEasy => 'Easy';

  @override
  String get plannerIntensitySteady => 'Steady';

  @override
  String get plannerIntensityHard => 'Hard';

  @override
  String get plannerExposure => 'Where you spend time';

  @override
  String get plannerExposureLift => 'Lifts';

  @override
  String get plannerExposureHike => 'Hiking up';

  @override
  String get plannerExposureBase => 'Staying at the base';

  @override
  String get plannerStyle => 'Style';

  @override
  String get plannerStyleUnspecified => 'Not specified';

  @override
  String get plannerStyleClassic => 'Classic';

  @override
  String get plannerStyleSkate => 'Skate';

  @override
  String get plannerBasicClothing => 'Clothes under the protective gear';

  @override
  String get plannerBasicHint =>
      'Optional. None is a valid choice, including when the motorcycle garment is the only layer you need.';

  @override
  String get plannerBasicUpper => 'Upper layer';

  @override
  String get plannerBasicLower => 'Lower layer';

  @override
  String get plannerBasicNone => 'None';

  @override
  String get plannerBasicTShirt => 'T-shirt';

  @override
  String get plannerBasicThinSweater => 'Thin sweater';

  @override
  String get plannerBasicThickSweater => 'Thick sweater';

  @override
  String get plannerBasicWoolTop => 'Wool base-layer top';

  @override
  String get plannerBasicWoolBottom => 'Wool base-layer bottom';

  @override
  String get plannerBasicJeans => 'Jeans';

  @override
  String get plannerBasicJoggers => 'Sweatpants/joggers';

  @override
  String get plannerSessionLength => 'Session length';

  @override
  String get plannerActiveDuration => 'How long are you active?';

  @override
  String get activityWhatToday => 'What are you doing today?';

  @override
  String activityDefaultLine(String activity) {
    return 'Default: $activity';
  }

  @override
  String get activityDefaultBadge => 'DEFAULT';

  @override
  String get activitySoon => 'Soon';

  @override
  String get activityChooserHint =>
      'Changing today’s activity does not change your saved default.';

  @override
  String get onboardingInterests => 'What do you ride or move for?';

  @override
  String get onboardingOpen => 'How should RideWear open?';

  @override
  String get onboardingTemperature => 'How do you feel temperature?';

  @override
  String get onboardingStart => 'Start RideWear';

  @override
  String get onboardingComingLater => 'Recommendations coming later';

  @override
  String get onboardingShowChooser =>
      'Show activity chooser when I open RideWear';

  @override
  String get onboardingCold => 'I get cold easily';

  @override
  String get onboardingAverage => 'Average';

  @override
  String get onboardingWarm => 'I usually run warm';

  @override
  String activityComingNext(String activity) {
    return '$activity recommendations are coming next.';
  }

  @override
  String get activitySharedBody =>
      'Hiking recommendations are not available yet and do not use the motorcycle recommendation.';

  @override
  String get activityOpenMotorcycle => 'Open Motorcycle today';

  @override
  String activityMakeDefault(String activity) {
    return 'Make $activity my default';
  }

  @override
  String activityNowDefault(String activity) {
    return '$activity set as default';
  }

  @override
  String get wardrobeIntro =>
      'Add what you actually own. Category sets sensible defaults — refine later.';

  @override
  String get wardrobeEmptyTitle => 'No garments yet';

  @override
  String get wardrobeEmptyBody =>
      'Add a few pieces you ride in, or load a demo kit for testing.';

  @override
  String get wardrobeAdd => 'Add garment';

  @override
  String get wardrobeLoadDemo => 'Add demo clothes';

  @override
  String get wardrobeDeleteTitle => 'Delete garment?';

  @override
  String wardrobeDeleteBody(String name) {
    return 'Remove “$name” from your wardrobe.';
  }

  @override
  String get wardrobeDemoBadge => 'DEMO';

  @override
  String get wardrobeDeleteDemo => 'Delete demo wardrobe';

  @override
  String get wardrobeDeleteDemoTitle => 'Delete demo wardrobe?';

  @override
  String get wardrobeDeleteDemoBody =>
      'Only demo clothes for this activity are removed. Your own garments stay.';

  @override
  String get wardrobeSharingTitle => 'Share personal clothes';

  @override
  String get wardrobeSharingBody =>
      'Motorcycle clothes can never be shared. Choose two or more activities to share personal garments. Demo clothes stay with their activity.';

  @override
  String get wardrobeMotorcycleIsolated =>
      'Motorcycle clothes stay in their own wardrobe.';

  @override
  String get wardrobeHikingUnavailable =>
      'Hiking does not have a wardrobe yet.';

  @override
  String get wardrobeActivityMembership => 'Available for';

  @override
  String get garmentMotorcycleLocked =>
      'This piece stays in the motorcycle wardrobe and is not shared.';

  @override
  String get garmentEditTitle => 'Edit garment';

  @override
  String get garmentUpdatePiece => 'Update kit piece';

  @override
  String get garmentKeepSimple => 'Keep it simple';

  @override
  String get garmentNameHint => 'e.g. Dainese Carve Master';

  @override
  String get garmentQuickType => 'Quick type (optional)';

  @override
  String get garmentMaterial => 'Material';

  @override
  String get garmentUnspecified => 'Unspecified';

  @override
  String get garmentVentilation => 'Has ventilation';

  @override
  String get garmentVentilationHint =>
      'Open or closed is chosen per ride later';

  @override
  String get garmentHeated => 'Heated';

  @override
  String get garmentThermalLiner => 'Thermal liner included';

  @override
  String get garmentThermalLinerHint =>
      'Same jacket — the liner can be installed, it is not a second item';

  @override
  String get garmentWaterproofLiner => 'Waterproof liner included';

  @override
  String get garmentBrand => 'Brand (optional)';

  @override
  String get garmentModel => 'Model (optional)';

  @override
  String get garmentMoreDetails => 'More details';

  @override
  String get garmentMoreDetailsHint => 'Adjust warmth and weather properties';

  @override
  String get garmentNotes => 'Notes (optional)';

  @override
  String get garmentSaveChanges => 'Save changes';

  @override
  String get garmentAddToWardrobe => 'Add to wardrobe';

  @override
  String get garmentNameRequired => 'Name is required';

  @override
  String get catalogueSearchBrand => 'Search brand';

  @override
  String get catalogueSearchModel => 'Search model';

  @override
  String get catalogueWriteYourself => 'Other / write yourself';

  @override
  String get catalogueWriteYourselfHint =>
      'Your own name stays on this garment. It is not added to the shared catalogue.';

  @override
  String get catalogueYourValue => 'Your value';

  @override
  String get catalogueAutomaticDefault => 'Automatic default';

  @override
  String catalogueCommunityEstimate(int count) {
    return 'Community estimate · $count contributions';
  }

  @override
  String get catalogueNotVerified =>
      'Brand and model choices are a curated list, not verified manufacturer measurements.';

  @override
  String get catalogueUseModel => 'Use this model';

  @override
  String get catalogueChangeProduct => 'Change product';

  @override
  String get catalogueContributeTitle => 'Share this rating';

  @override
  String get catalogueContributeBody =>
      'Only values you set yourself are counted. Automatic defaults, demo clothes, copied values, and adding the same product again without a new rating are not counted. RideWear stores a count for each score from 1 to 5. It does not store your name, notes, account, or garment. The number is a count of contributions, not of different people. Removing the highest and lowest score is not protection against misuse.';

  @override
  String get tierWarmth => 'Warmth';

  @override
  String get tierWind => 'Wind resistance';

  @override
  String get tierWater => 'Waterproofness';

  @override
  String get tierBreath => 'Breathability';

  @override
  String garmentLiners(int count) {
    return '$count liner(s)';
  }

  @override
  String get garmentVents => 'vents';

  @override
  String get garmentHeatedShort => 'heated';

  @override
  String get catBaseLayer => 'Base layer';

  @override
  String get catMidLayer => 'Mid layer';

  @override
  String get catShellJacket => 'Shell jacket';

  @override
  String get catPants => 'Pants';

  @override
  String get catOnePieceSuit => 'One-piece suit';

  @override
  String get catGloves => 'Gloves';

  @override
  String get catBoots => 'Boots';

  @override
  String get catSocks => 'Socks';

  @override
  String get catHeadwear => 'Headwear';

  @override
  String get catNeckwear => 'Neckwear';

  @override
  String get catHeatedVest => 'Heated vest';

  @override
  String get catRainLayer => 'Rain layer';

  @override
  String get matTextile => 'Textile';

  @override
  String get matLeather => 'Leather';

  @override
  String get matMesh => 'Mesh';

  @override
  String get matDenim => 'Denim';

  @override
  String get matSynthetic => 'Synthetic';

  @override
  String get matMerino => 'Merino';

  @override
  String get matMixed => 'Mixed';

  @override
  String get matOther => 'Other';

  @override
  String get presetTextileJacket => 'Textile motorcycle jacket';

  @override
  String get presetMeshJacket => 'Mesh / summer jacket';

  @override
  String get presetLeatherJacket => 'Leather motorcycle jacket';

  @override
  String get presetTextilePants => 'Textile motorcycle pants';

  @override
  String get presetMotorcycleJeans => 'Motorcycle jeans';

  @override
  String get presetOnePieceSuit => 'One-piece suit';

  @override
  String get presetSummerGloves => 'Summer gloves';

  @override
  String get presetWinterGloves => 'Winter gloves';

  @override
  String get presetHeatedGloves => 'Heated gloves';

  @override
  String get cyclingGarmentType => 'Cycling garment';

  @override
  String get cyclingLongTrousers => 'Long cycling trousers / tights';

  @override
  String get cyclingShorts => 'Short cycling shorts';

  @override
  String get cyclingTriathlonSuit => 'Triathlon suit';

  @override
  String get cyclingShortSleeveTee => 'Short-sleeve technical T-shirt';

  @override
  String get cyclingLongJersey => 'Long-sleeve technical jersey';

  @override
  String get cyclingJacket => 'Thin cycling jacket';

  @override
  String get cyclingFingerlessGloves => 'Fingerless cycling gloves';

  @override
  String get cyclingFullFingerGloves => 'Thin full-finger cycling gloves';

  @override
  String get cyclingWarmthThin => 'Thin';

  @override
  String get cyclingWarmthMedium => 'Medium';

  @override
  String get cyclingWarmthWarm => 'Warm';

  @override
  String get cyclingAdvancedWinter => 'Advanced settings / winter';

  @override
  String get cyclingDefaultsEstimate =>
      'These defaults are estimates, not measured manufacturer values.';

  @override
  String get routeNew => 'New route';

  @override
  String get routeEdit => 'Edit route';

  @override
  String get routeNameHint => 'Work 1, Sunday loop…';

  @override
  String get routeDescription => 'Description (optional)';

  @override
  String get routeFavoriteHint => 'Shows first on the motorcycle home screen';

  @override
  String get routeSection => 'Route';

  @override
  String get routeSearchHint =>
      'Search for places — you do not need to enter coordinates.';

  @override
  String get routeAdvancedCoords => 'Advanced: coordinates';

  @override
  String get routeAdvancedHint => 'Developer / fallback only';

  @override
  String coordLatitude(String role) {
    return '$role latitude';
  }

  @override
  String get coordLongitude => 'Longitude';

  @override
  String get coordApply => 'Apply coordinates';

  @override
  String get routeCatWork => 'Work';

  @override
  String get routeCatCommute => 'Commute';

  @override
  String get routeCatHome => 'Home';

  @override
  String get routeCatWeekend => 'Weekend';

  @override
  String get routeCatTouring => 'Touring';

  @override
  String get routeCatFavourite => 'Favourite';

  @override
  String get routeCatCustom => 'Custom';

  @override
  String get mapSelectEndpoints =>
      'Select start and destination to preview the route';

  @override
  String get placeSearchHint => 'Search place or address';

  @override
  String get placeNoResults => 'No places found';

  @override
  String get placeSearchFailed => 'Place search failed';

  @override
  String get placeSearchUnavailable =>
      'Place search is temporarily unavailable.';

  @override
  String get placeSearchNotConfigured =>
      'Place search is not configured on the server.';

  @override
  String get placeNotFound => 'That place could not be selected. Try again.';

  @override
  String get routeStraightSegmentsNotice =>
      'Preview uses straight segments because road routing is not available.';

  @override
  String get plannerCouldNotSave => 'Could not save the route for analysis.';

  @override
  String get feedbackTitle => 'How did the kit feel?';

  @override
  String get feedbackTooCold => 'Too cold';

  @override
  String get feedbackSlightlyCold => 'Slightly cold';

  @override
  String get feedbackJustRight => 'Just right';

  @override
  String get feedbackSlightlyWarm => 'Slightly warm';

  @override
  String get feedbackTooWarm => 'Too warm';

  @override
  String get feedbackZoneTorso => 'Upper body';

  @override
  String get feedbackZoneLegs => 'Legs';

  @override
  String get feedbackZoneCold => 'Cold';

  @override
  String get feedbackZoneComfortable => 'Comfortable';

  @override
  String get feedbackZoneHot => 'Hot';

  @override
  String get feedbackSubmit => 'Submit feedback';

  @override
  String get feedbackThanks => 'Thanks — comfort profile updated';

  @override
  String analysisTempChip(String value) {
    return 'Temp $value';
  }

  @override
  String analysisRainChip(String value) {
    return 'Rain $value';
  }

  @override
  String get departureCompareTitle => 'Departure times';

  @override
  String get departureCompareHint =>
      'Nearby departures along this route. Compare the conditions. None is ranked.';

  @override
  String get departureCompareYours => 'Your departure';

  @override
  String get departureCompareUnavailable =>
      'Forecast unavailable for this time';

  @override
  String departureCompareForecastAt(String time) {
    return 'Forecast for $time';
  }

  @override
  String departureCompareForecastSpan(String from, String to) {
    return 'Forecast $from–$to';
  }

  @override
  String departureComparePrecip(String value) {
    return 'Precipitation $value';
  }

  @override
  String departureCompareMissing(String time) {
    return 'No forecast for $time';
  }

  @override
  String get departureCompareStatic =>
      'This forecast does not change between these departure times.';

  @override
  String analysisWindChip(String value) {
    return 'Wind $value';
  }

  @override
  String get routeCoordsInvalid => 'Coordinates must be valid numbers.';

  @override
  String get routeEditorIncomplete =>
      'Enter a name and choose a place for start and destination.';

  @override
  String get coordCustomPoint => 'Custom point';

  @override
  String get commuteTimesTitle => 'Usual departure times';

  @override
  String get commuteTimesHint =>
      'Europe/Oslo clock times. These are templates, not a forecast.';

  @override
  String get commuteOutboundTime => 'Outbound';

  @override
  String get commuteReturnTime => 'Return';

  @override
  String get commutePlanTitle => 'Commute';

  @override
  String get commuteDate => 'Date';

  @override
  String get commuteNextDay => 'Return the next day';

  @override
  String get commuteAnalyze => 'See outbound and return';

  @override
  String get commuteOutboundSection => 'Outbound';

  @override
  String get commuteReturnSection => 'Return';

  @override
  String get commuteWearHeading => 'Wear for the outbound leg';

  @override
  String get commutePackHeading => 'Pack before you leave';

  @override
  String get commuteAdjustmentHeading => 'Change for the return';

  @override
  String commuteArrival(String time) {
    return 'Estimated arrival $time';
  }

  @override
  String get commuteUnavailable =>
      'Return weather is unavailable. Morning conditions are not used for the return. Try again.';

  @override
  String get commuteOutboundWeatherUnavailable =>
      'Outbound weather is unavailable. The return forecast is not used for this leg. Try again.';

  @override
  String get routeProviderUnavailable =>
      'Road routing is unavailable. This is not a travel time from the road provider.';

  @override
  String get weatherUnavailableRetry => 'Try again';

  @override
  String get weatherUnavailableConfiguration =>
      'Weather is not configured on the server. No clothing was suggested.';

  @override
  String get weatherUnavailableTimeout =>
      'The weather service timed out. No clothing was suggested. Try again.';

  @override
  String get weatherUnavailableEmpty =>
      'The weather service returned no forecast. No clothing was suggested. Try again.';

  @override
  String get weatherUnavailableMissing =>
      'The forecast is missing temperature, rain, or wind. No clothing was suggested. Try again.';

  @override
  String get weatherUnavailableOutOfRange =>
      'No forecast covers this time. Another time was not used. Try again.';

  @override
  String get weatherUnavailableProvider =>
      'The weather service failed. No clothing was suggested. Try again.';

  @override
  String get weatherUnavailablePartial =>
      'Part of this forecast is missing. No complete clothing recommendation was made. Try again.';

  @override
  String get commuteForecastNote => 'A forecast is not a guarantee.';

  @override
  String get commuteDiffDryRain =>
      'Dry in the morning, rain is forecast for the return — pack rain gear.';

  @override
  String get commuteDiffWarmCold =>
      'The outbound leg is forecast warmer than the return. Pack the extra layer for the way back.';

  @override
  String get commuteLegFeedback => 'How did this leg feel?';

  @override
  String get commuteTimeInvalid => 'Enter times as HH:mm.';

  @override
  String commuteRain(String amount, String probability) {
    return 'Rain $amount mm, $probability%';
  }

  @override
  String commuteWind(String value) {
    return 'Wind $value';
  }
}
