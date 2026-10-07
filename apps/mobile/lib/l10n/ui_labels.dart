import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/domain/garment.dart';
import 'package:motorcycle_clothing/domain/saved_route.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';

String activityLabel(AppLocalizations l10n, AppActivity activity) {
  switch (activity) {
    case AppActivity.motorcycle:
      return l10n.activityMotorcycle;
    case AppActivity.hiking:
      return l10n.activityHiking;
    case AppActivity.cycling:
      return l10n.activityCycling;
    case AppActivity.alpineSkiing:
      return l10n.activityAlpineSkiing;
    case AppActivity.snowboarding:
      return l10n.activitySnowboarding;
    case AppActivity.xcSkiing:
      return l10n.activityXcSkiing;
  }
}

/// Chooser and home title. Resort snow sports share one label.
String activityMenuLabel(AppLocalizations l10n, AppActivity activity) {
  if (activity.isResortSnowSport) return l10n.activityAlpineAndSnowboard;
  return activityLabel(l10n, activity);
}

String intensityLabel(AppLocalizations l10n, String value) {
  switch (value) {
    case 'easy':
      return l10n.plannerIntensityEasy;
    case 'steady':
      return l10n.plannerIntensitySteady;
    case 'hard':
      return l10n.plannerIntensityHard;
    default:
      return value;
  }
}

String exposureModeLabel(AppLocalizations l10n, String value) {
  switch (value) {
    case 'lift':
      return l10n.plannerExposureLift;
    case 'hike':
      return l10n.plannerExposureHike;
    case 'base':
      return l10n.plannerExposureBase;
    default:
      return value;
  }
}

String basicPieceLabel(AppLocalizations l10n, String value) {
  switch (value) {
    case 't_shirt':
      return l10n.plannerBasicTShirt;
    case 'thin_sweater':
      return l10n.plannerBasicThinSweater;
    case 'thick_sweater':
      return l10n.plannerBasicThickSweater;
    case 'wool_base_top':
      return l10n.plannerBasicWoolTop;
    case 'wool_base_bottom':
      return l10n.plannerBasicWoolBottom;
    case 'jeans':
      return l10n.plannerBasicJeans;
    case 'joggers':
      return l10n.plannerBasicJoggers;
    default:
      return value;
  }
}

String xcStyleLabel(AppLocalizations l10n, String value) {
  switch (value) {
    case 'classic':
      return l10n.plannerStyleClassic;
    case 'skate':
      return l10n.plannerStyleSkate;
    default:
      return value;
  }
}

/// Selected effort, exposure, or style already returned on the recommendation.
String? recommendationInputSummary(AppLocalizations l10n, Object? comfort) {
  if (comfort is! Map) return null;
  final data = Map<String, dynamic>.from(comfort);
  final parts = <String>[];
  final intensity = data['intensity']?.toString();
  if (intensity != null && intensity.isNotEmpty) {
    parts.add(intensityLabel(l10n, intensity));
  }
  final exposure = data['exposureMode']?.toString();
  if (exposure != null && exposure.isNotEmpty) {
    parts.add(exposureModeLabel(l10n, exposure));
  }
  final style = data['style']?.toString();
  if (style != null && style.isNotEmpty) {
    parts.add(xcStyleLabel(l10n, style));
  }
  if (parts.isEmpty) return null;
  return parts.join(' · ');
}

String waypointRole(AppLocalizations l10n, int index, int length) {
  if (index == 0) return l10n.labelStart;
  if (index == length - 1) return l10n.labelDestination;
  return l10n.waypointStop(index);
}

String routeSummary(AppLocalizations l10n, SavedRoute route) {
  final start = route.waypoints.isNotEmpty
      ? (route.waypoints.first.label ?? route.startLabel ?? l10n.labelStart)
      : (route.startLabel ?? l10n.labelStart);
  final end = route.waypoints.length >= 2
      ? (route.waypoints.last.label ?? route.endLabel ?? l10n.labelEnd)
      : (route.endLabel ?? l10n.labelEnd);
  if (route.waypoints.length >= 2) {
    if (route.routeKind == 'loop') {
      return l10n.routeLoopSummary(start, route.waypoints.length);
    }
    if (route.waypoints.length > 2) {
      return l10n.routeViaSummary(start, end, route.waypoints.length);
    }
    return '$start → $end';
  }
  return '$start → $end';
}

String routeDuration(AppLocalizations l10n, int minutes) {
  if (minutes >= 60) {
    final hours = minutes ~/ 60;
    final rem = minutes % 60;
    if (rem == 0) return l10n.durationHours(hours);
    return l10n.durationHoursMinutes(hours, rem);
  }
  return l10n.durationMinutes(minutes);
}

String routeCategoryLabel(AppLocalizations l10n, String? category) {
  switch (category) {
    case 'work':
      return l10n.routeCatWork;
    case 'commute':
      return l10n.routeCatCommute;
    case 'home':
      return l10n.routeCatHome;
    case 'weekend':
      return l10n.routeCatWeekend;
    case 'touring':
      return l10n.routeCatTouring;
    case 'favourite':
      return l10n.routeCatFavourite;
    case 'custom':
      return l10n.routeCatCustom;
    default:
      return category ?? '';
  }
}

String garmentCategoryLabel(AppLocalizations l10n, String category) {
  switch (category) {
    case 'base_layer':
      return l10n.catBaseLayer;
    case 'mid_layer':
      return l10n.catMidLayer;
    case 'shell_jacket':
      return l10n.catShellJacket;
    case 'pants':
      return l10n.catPants;
    case 'one_piece_suit':
      return l10n.catOnePieceSuit;
    case 'gloves':
      return l10n.catGloves;
    case 'boots':
      return l10n.catBoots;
    case 'socks':
      return l10n.catSocks;
    case 'headwear':
      return l10n.catHeadwear;
    case 'neckwear':
      return l10n.catNeckwear;
    case 'heated_vest':
      return l10n.catHeatedVest;
    case 'rain_layer':
      return l10n.catRainLayer;
    default:
      return category.replaceAll('_', ' ');
  }
}

String garmentMaterialLabel(AppLocalizations l10n, String material) {
  switch (material) {
    case 'textile':
      return l10n.matTextile;
    case 'leather':
      return l10n.matLeather;
    case 'mesh':
      return l10n.matMesh;
    case 'denim':
      return l10n.matDenim;
    case 'synthetic':
      return l10n.matSynthetic;
    case 'merino':
      return l10n.matMerino;
    case 'mixed':
      return l10n.matMixed;
    case 'other':
      return l10n.matOther;
    default:
      return material;
  }
}

String garmentPresetLabel(AppLocalizations l10n, String id) {
  switch (id) {
    case 'textile_jacket':
      return l10n.presetTextileJacket;
    case 'mesh_jacket':
      return l10n.presetMeshJacket;
    case 'leather_jacket':
      return l10n.presetLeatherJacket;
    case 'textile_pants':
      return l10n.presetTextilePants;
    case 'motorcycle_jeans':
      return l10n.presetMotorcycleJeans;
    case 'one_piece_suit':
      return l10n.presetOnePieceSuit;
    case 'summer_gloves':
      return l10n.presetSummerGloves;
    case 'winter_gloves':
      return l10n.presetWinterGloves;
    case 'heated_gloves':
      return l10n.presetHeatedGloves;
    default:
      return id;
  }
}

String garmentSubtitle(AppLocalizations l10n, Garment garment) {
  final parts = <String>[
    garmentCategoryLabel(l10n, garment.category),
    if (garment.material != null) garmentMaterialLabel(l10n, garment.material!),
    if (garment.hasVentilation) l10n.garmentVents,
    if (garment.isHeated) l10n.garmentHeatedShort,
    if (garment.components.isNotEmpty)
      l10n.garmentLiners(garment.components.length),
  ];
  return parts.join(' · ');
}

String confidenceValue(AppLocalizations l10n, String level) {
  switch (level.toLowerCase()) {
    case 'high':
      return l10n.confidenceHigh;
    case 'medium':
      return l10n.confidenceMedium;
    case 'low':
      return l10n.confidenceLow;
    default:
      return level;
  }
}

String configCodeLabel(AppLocalizations l10n, String code) {
  switch (code.toUpperCase()) {
    case 'INSTALL_THERMAL_LINER':
      return l10n.configInstallThermalLiner;
    case 'INSTALL_WATERPROOF_LINER':
      return l10n.configInstallWaterproofLiner;
    case 'REMOVE_THERMAL_LINER':
      return l10n.configRemoveThermalLiner;
    case 'VENTS_OPEN':
      return l10n.configVentsOpen;
    case 'VENTS_CLOSED':
      return l10n.configVentsClosed;
    default:
      return code.toLowerCase().replaceAll('_', ' ');
  }
}

String kitLine(AppLocalizations l10n, Map<String, dynamic> item) {
  final name = item['garmentName']?.toString();
  final generic = item['genericLabel']?.toString();
  final configs = (item['configuration'] as List?) ?? const [];
  final configText = configs
      .map((c) {
        if (c is Map && c['code'] != null) {
          return configCodeLabel(l10n, c['code'].toString());
        }
        return '';
      })
      .where((s) => s.isNotEmpty)
      .join(', ');
  final base = (name != null && name.isNotEmpty)
      ? name
      : (generic ?? item['slot']?.toString() ?? l10n.kitFallbackItem);
  final labeled = item['source'] == 'generic' ? l10n.kitNotOwned(base) : base;
  return configText.isEmpty ? labeled : '$labeled ($configText)';
}

String localizeUserError(Object error, AppLocalizations l10n) {
  if (error is ApiException) {
    return localizeApiMessage(error, l10n);
  }
  if (error is LocationProviderException) {
    return localizeLocationError(error, l10n);
  }
  final text = error.toString().toLowerCase();
  if (text.contains('socketexception') ||
      text.contains('failed host lookup') ||
      text.contains('connection refused') ||
      text.contains('network is unreachable') ||
      text.contains('clientexception')) {
    return l10n.authNetworkError;
  }
  return l10n.errorGeneric;
}

String localizeApiMessage(ApiException error, AppLocalizations l10n) {
  if (error.code == 'ROUTING_UNAVAILABLE') return l10n.routeRoutingUnavailable;
  if (error.code == 'GEOCODING_NOT_CONFIGURED') {
    return l10n.placeSearchNotConfigured;
  }
  if (error.code == 'PLACE_NOT_FOUND') return l10n.placeNotFound;
  if (error.code == 'GEOCODING_UNAVAILABLE') return l10n.placeSearchUnavailable;
  final text = error.toString().toLowerCase();
  if (error.statusCode == null ||
      text.contains('socket') ||
      text.contains('network') ||
      text.contains('connection')) {
    return l10n.authNetworkError;
  }
  return l10n.errorGeneric;
}

String localizeLocationError(
  LocationProviderException error,
  AppLocalizations l10n,
) {
  if (error.code == 'ROUTING_UNAVAILABLE') return l10n.routeRoutingUnavailable;
  if (error.code == 'GEOCODING_NOT_CONFIGURED') {
    return l10n.placeSearchNotConfigured;
  }
  if (error.code == 'PLACE_NOT_FOUND') return l10n.placeNotFound;
  if (error.code == 'GEOCODING_UNAVAILABLE') return l10n.placeSearchUnavailable;
  if (error.isNetwork) return l10n.placeSearchFailed;
  return l10n.errorGeneric;
}
