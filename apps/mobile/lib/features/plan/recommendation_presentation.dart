/// Groups an API recommendation payload for display.
///
/// Values come only from fields the API already returned. Missing elevation,
/// temperature, or confidence stays absent rather than being filled in.
class RecommendationPresentation {
  const RecommendationPresentation({
    required this.wear,
    required this.pack,
    required this.kitReasons,
    required this.contextNotes,
    required this.limitReasons,
    required this.confidenceLevel,
    required this.routeStart,
    required this.routeEnd,
    required this.exposureC,
    required this.elevationMinM,
    required this.elevationMaxM,
    required this.sites,
    required this.elevationAttribution,
  });

  final List<Map<String, dynamic>> wear;
  final List<Map<String, dynamic>> pack;
  final List<String> kitReasons;
  final List<String> contextNotes;
  final List<String> limitReasons;
  final String? confidenceLevel;
  final String? routeStart;
  final String? routeEnd;
  final num? exposureC;
  final int? elevationMinM;
  final int? elevationMaxM;
  final List<ElevationSiteView> sites;
  final String? elevationAttribution;

  bool get hasElevationRange => elevationMinM != null && elevationMaxM != null;

  bool get hasSiteRows => sites.isNotEmpty;

  String? get routeLine {
    if (routeStart != null && routeEnd != null) {
      return '$routeStart → $routeEnd';
    }
    return routeStart ?? routeEnd;
  }
}

class ElevationSiteView {
  const ElevationSiteView({
    required this.role,
    required this.elevationM,
    required this.estimated,
    required this.airTempC,
  });

  final String role;
  final int? elevationM;
  final bool estimated;
  final num? airTempC;
}

const kitReasonCodes = <String>{
  'MILD_CONDITIONS',
  'LOW_EFFECTIVE_TEMPERATURE',
  'SUSTAINED_COLD_EXPOSURE',
  'SHORT_COLD_SEGMENT',
  'SHORT_COLD_STOP_PACKED',
  'RAIN_EXPOSURE',
  'RAIN_PROTECTION_REQUIRED',
  'PACK_RAIN_LAYER',
  'PACK_SHELL',
  'VENT_OR_PACK_SHELL',
  'STRONG_WIND',
  'HIGH_WIND_EXPOSURE',
  'HIGH_WIND_AT_UPPER',
  'TEMPERATURE_VARIATION',
  'TEMPERATURE_SPREAD',
  'THERMAL_LINER_RECOMMENDED',
  'WATERPROOF_LINER_RECOMMENDED',
  'VENTS_CLOSED_RECOMMENDED',
  'VENTS_OPEN_RECOMMENDED',
  'VENTS_FOR_CLIMB',
  'PACK_EXTRA_INSULATION',
  'WARDROBE_GAP',
  'FEET_LIMITING_ZONE',
  'HANDS_WIND_CHILL',
  'UPPER_MOUNTAIN_SETS_KIT',
  'STAYING_AT_BASE',
  'LEAVE_WARMER_LAYER_OFF_HILL',
  'CLIMB_REDUCES_WORN_DEMAND',
  'COLD_MOUNTAIN_SEGMENT',
  'PERSONAL_COLD_HANDS_HISTORY',
};

const contextNoteCodes = <String>{'ELEVATION_USED', 'ROUTE_SPEED_PROFILE_USED'};

const limitReasonCodes = <String>{
  'INCOMPLETE_WEATHER',
  'INCOMPLETE_WARDROBE',
  'BASELINE_NO_PERSONAL_EVIDENCE',
  'GENERIC_CYCLING_KIT',
  'GENERIC_ALPINE_KIT',
  'GENERIC_XC_KIT',
  'ASSUMED_RIDE_STYLE',
  'ASSUMED_INTENSITY',
  'ASSUMED_DURATION',
  'ASSUMED_EXPOSURE_MODE',
  'ASSUMED_CRUISE_SPEED',
  'ROUTE_GEOMETRY_FALLBACK',
  'ROUTE_SPEED_PROFILE_UNAVAILABLE',
  'WIND_DIRECTION_UNAVAILABLE',
  'ELEVATION_PARTIAL',
  'ELEVATION_UNAVAILABLE',
  'UPPER_SITE_MISSING',
  'UPPER_ELEVATION_UNAVAILABLE',
  'VILLAGE_WEATHER_NOT_USED_AS_SUMMIT',
  'SITES_NEED_LABELS',
  'MID_ELEVATION_ESTIMATED',
  'HELMET_ASSUMED',
  'BOOTS_ARE_EQUIPMENT',
  'GOGGLES_ARE_EQUIPMENT',
  'HELMET_IS_EQUIPMENT',
  'CLASSIC_BOOTS_ARE_EQUIPMENT',
  'SKATE_BOOTS_ARE_EQUIPMENT',
  'STYLE_NOT_SPECIFIED',
  'USER_TRACK_NOT_ROAD',
  'NO_GROOMING_STATUS',
  'NO_WAX_ADVICE',
};

RecommendationPresentation presentRecommendation(Map<String, dynamic> payload) {
  final route = _map(payload['route']);
  final weather = _map(payload['weather']);
  final rec = _map(payload['recommendation']);
  final exposure = _map(rec['exposure']);
  final codes = _reasonCodes(rec);
  final kit = <String>[];
  final notes = <String>[];
  final limits = <String>[];
  for (final code in codes) {
    if (contextNoteCodes.contains(code)) {
      notes.add(code);
    } else if (limitReasonCodes.contains(code)) {
      limits.add(code);
    } else {
      kit.add(code);
    }
  }

  final heights = <int>[];
  void addHeight(dynamic raw) {
    final value = _finite(raw);
    if (value == null) return;
    heights.add(value.round());
  }

  final sites = <ElevationSiteView>[];
  final siteList = exposure['sites'];
  if (siteList is List) {
    for (final raw in siteList) {
      final site = _map(raw);
      if (site.isEmpty) continue;
      final role = site['role']?.toString();
      if (role != 'base' && role != 'mid' && role != 'upper') continue;
      final knownRole = role!;
      addHeight(site['elevationM']);
      final elevationM = _finite(site['elevationM'])?.round();
      final airTempC = _tempForRole(exposure, knownRole);
      if (elevationM == null && airTempC == null) continue;
      sites.add(
        ElevationSiteView(
          role: knownRole,
          elevationM: elevationM,
          estimated: site['estimated'] == true,
          airTempC: airTempC,
        ),
      );
    }
  }

  for (final point in _maps(weather['points'])) {
    addHeight(point['groundElevationM']);
  }
  for (final point in _maps(exposure['samples'])) {
    addHeight(point['groundElevationM']);
  }
  for (final point in _maps(exposure['segments'])) {
    addHeight(point['groundElevationM']);
  }

  int? minM;
  int? maxM;
  if (heights.isNotEmpty && sites.isEmpty) {
    minM = heights.reduce((a, b) => a < b ? a : b);
    maxM = heights.reduce((a, b) => a > b ? a : b);
  }

  final confidence = _map(rec['confidence']);
  final level = confidence['level']?.toString();
  final attribution = _map(weather['elevation'])['attribution']?.toString();

  return RecommendationPresentation(
    wear: _maps(rec['wear']),
    pack: _maps(rec['pack']),
    kitReasons: kit,
    contextNotes: notes,
    limitReasons: limits,
    confidenceLevel: (level == null || level.isEmpty) ? null : level,
    routeStart: _text(route['startLabel']),
    routeEnd: _text(route['endLabel']),
    exposureC: _finite(rec['effectiveTempC']),
    elevationMinM: minM,
    elevationMaxM: maxM,
    sites: sites,
    elevationAttribution: (attribution == null || attribution.isEmpty)
        ? null
        : attribution,
  );
}

List<String> _reasonCodes(Map<String, dynamic> rec) {
  final codes = <String>[];
  void add(dynamic raw) {
    if (raw == null) return;
    final code = raw is Map ? raw['code']?.toString() : raw.toString();
    if (code == null || code.isEmpty || codes.contains(code)) return;
    codes.add(code);
  }

  final reasons = rec['reasons'];
  if (reasons is List && reasons.isNotEmpty) {
    for (final reason in reasons) {
      add(reason);
    }
  }
  if (codes.isEmpty && rec['reasonCodes'] is List) {
    for (final reason in rec['reasonCodes'] as List) {
      add(reason);
    }
  }
  final confidence = _map(rec['confidence']);
  final confidenceReasons = confidence['reasons'];
  if (confidenceReasons is List) {
    for (final reason in confidenceReasons) {
      add(reason);
    }
  }
  return codes;
}

num? _tempForRole(Map<String, dynamic> exposure, String role) {
  switch (role) {
    case 'base':
      return _finite(exposure['baseTempC']);
    case 'mid':
      return _finite(exposure['midTempC']);
    case 'upper':
      return _finite(exposure['upperTempC']);
    default:
      return null;
  }
}

Map<String, dynamic> _map(dynamic raw) {
  if (raw is Map) return Map<String, dynamic>.from(raw);
  return const {};
}

List<Map<String, dynamic>> _maps(dynamic raw) {
  if (raw is! List) return const [];
  return raw
      .whereType<Map>()
      .map((item) => Map<String, dynamic>.from(item))
      .toList();
}

String? _text(dynamic raw) {
  final text = raw?.toString();
  if (text == null || text.isEmpty) return null;
  return text;
}

num? _finite(dynamic raw) {
  if (raw is num && raw.isFinite) return raw;
  return null;
}
