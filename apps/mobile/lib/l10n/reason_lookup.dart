import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/state/locale_controller.dart';

/// Adapts generated AppLocalizations to the reason-code lookup interface.
class AppLocalizationsReasonLookup implements AppLocalizationsLookup {
  AppLocalizationsReasonLookup(this._l10n);
  final AppLocalizations _l10n;

  @override
  String get reasonColdMountain => _l10n.reasonColdMountain;
  @override
  String get reasonRain => _l10n.reasonRain;
  @override
  String get reasonStrongWind => _l10n.reasonStrongWind;
  @override
  String get reasonPersonalColdHands => _l10n.reasonPersonalColdHands;
  @override
  String get reasonMildConditions => _l10n.reasonMildConditions;
  @override
  String get reasonLowEffectiveTemperature =>
      _l10n.reasonLowEffectiveTemperature;
  @override
  String get reasonSustainedColdExposure => _l10n.reasonSustainedColdExposure;
  @override
  String get reasonShortColdSegment => _l10n.reasonShortColdSegment;
  @override
  String get reasonRainProtectionRequired => _l10n.reasonRainProtectionRequired;
  @override
  String get reasonPackRainLayer => _l10n.reasonPackRainLayer;
  @override
  String get reasonHighWindExposure => _l10n.reasonHighWindExposure;
  @override
  String get reasonTemperatureVariation => _l10n.reasonTemperatureVariation;
  @override
  String get reasonThermalLinerRecommended =>
      _l10n.reasonThermalLinerRecommended;
  @override
  String get reasonWaterproofLinerRecommended =>
      _l10n.reasonWaterproofLinerRecommended;
  @override
  String get reasonVentsClosedRecommended => _l10n.reasonVentsClosedRecommended;
  @override
  String get reasonVentsOpenRecommended => _l10n.reasonVentsOpenRecommended;
  @override
  String get reasonPackExtraInsulation => _l10n.reasonPackExtraInsulation;
  @override
  String get reasonWardrobeGap => _l10n.reasonWardrobeGap;
  @override
  String get reasonIncompleteWeather => _l10n.reasonIncompleteWeather;
  @override
  String get reasonIncompleteWardrobe => _l10n.reasonIncompleteWardrobe;
  @override
  String get reasonBaselineNoPersonalEvidence =>
      _l10n.reasonBaselineNoPersonalEvidence;

  @override
  String reasonOrCode(String code) {
    switch (code) {
      case 'ROUTE_SPEED_PROFILE_USED':
        return _l10n.reasonRouteSpeedProfileUsed;
      case 'ROUTE_SPEED_PROFILE_UNAVAILABLE':
        return _l10n.reasonRouteSpeedProfileUnavailable;
      case 'ASSUMED_CRUISE_SPEED':
        return _l10n.reasonAssumedCruiseSpeed;
      case 'WIND_DIRECTION_UNAVAILABLE':
        return _l10n.reasonWindDirectionUnavailable;
      case 'ELEVATION_USED':
        return _l10n.reasonElevationUsed;
      case 'ELEVATION_PARTIAL':
        return _l10n.reasonElevationPartial;
      case 'ELEVATION_UNAVAILABLE':
        return _l10n.reasonElevationUnavailable;
      case 'VENT_OR_PACK_SHELL':
        return _l10n.reasonVentOrPackShell;
      case 'GENERIC_CYCLING_KIT':
        return _l10n.reasonGenericCyclingKit;
      case 'ASSUMED_RIDE_STYLE':
        return _l10n.reasonAssumedRideStyle;
      case 'ROUTE_GEOMETRY_FALLBACK':
        return _l10n.reasonRouteGeometryFallback;
      case 'HELMET_ASSUMED':
        return _l10n.reasonHelmetAssumed;
      case 'FEET_LIMITING_ZONE':
        return _l10n.reasonFeetLimitingZone;
      case 'HANDS_WIND_CHILL':
        return _l10n.reasonHandsWindChill;
      case 'UPPER_MOUNTAIN_SETS_KIT':
        return _l10n.reasonUpperMountainSetsKit;
      case 'STAYING_AT_BASE':
        return _l10n.reasonStayingAtBase;
      case 'VILLAGE_WEATHER_NOT_USED_AS_SUMMIT':
        return _l10n.reasonVillageWeatherNotUsedAsSummit;
      case 'UPPER_SITE_MISSING':
        return _l10n.reasonUpperSiteMissing;
      case 'UPPER_ELEVATION_UNAVAILABLE':
        return _l10n.reasonUpperElevationUnavailable;
      case 'SITES_NEED_LABELS':
        return _l10n.reasonSitesNeedLabels;
      case 'MID_ELEVATION_ESTIMATED':
        return _l10n.reasonMidElevationEstimated;
      case 'TEMPERATURE_SPREAD':
        return _l10n.reasonTemperatureSpread;
      case 'HIGH_WIND_AT_UPPER':
        return _l10n.reasonHighWindAtUpper;
      case 'ASSUMED_EXPOSURE_MODE':
        return _l10n.reasonAssumedExposureMode;
      case 'GENERIC_ALPINE_KIT':
        return _l10n.reasonGenericAlpineKit;
      case 'LEAVE_WARMER_LAYER_OFF_HILL':
        return _l10n.reasonLeaveWarmerLayerOffHill;
      case 'BOOTS_ARE_EQUIPMENT':
        return _l10n.reasonBootsAreEquipment;
      case 'GOGGLES_ARE_EQUIPMENT':
        return _l10n.reasonGogglesAreEquipment;
      case 'HELMET_IS_EQUIPMENT':
        return _l10n.reasonHelmetIsEquipment;
      case 'SHORT_COLD_STOP_PACKED':
        return _l10n.reasonShortColdStopPacked;
      case 'PACK_SHELL':
        return _l10n.reasonPackShell;
      case 'VENTS_FOR_CLIMB':
        return _l10n.reasonVentsForClimb;
      case 'GENERIC_XC_KIT':
        return _l10n.reasonGenericXcKit;
      case 'ASSUMED_INTENSITY':
        return _l10n.reasonAssumedIntensity;
      case 'ASSUMED_DURATION':
        return _l10n.reasonAssumedDuration;
      case 'STYLE_NOT_SPECIFIED':
        return _l10n.reasonStyleNotSpecified;
      case 'CLASSIC_BOOTS_ARE_EQUIPMENT':
        return _l10n.reasonClassicBootsAreEquipment;
      case 'SKATE_BOOTS_ARE_EQUIPMENT':
        return _l10n.reasonSkateBootsAreEquipment;
      case 'USER_TRACK_NOT_ROAD':
        return _l10n.reasonUserTrackNotRoad;
      case 'CLIMB_REDUCES_WORN_DEMAND':
        return _l10n.reasonClimbReducesWornDemand;
      case 'NO_GROOMING_STATUS':
        return _l10n.reasonNoGroomingStatus;
      case 'NO_WAX_ADVICE':
        return _l10n.reasonNoWaxAdvice;
      case 'BASIC_UNDERLAYER_WARMTH':
        return _l10n.reasonBasicUnderlayerWarmth;
      default:
        return code;
    }
  }
}
