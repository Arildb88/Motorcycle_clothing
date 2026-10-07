/// Provider-neutral geography models for place search and route preview.
/// Coordinates remain the canonical waypoint representation for persistence.
library;

class GeoPoint {
  const GeoPoint({required this.lat, required this.lon});

  final double lat;
  final double lon;
}

/// Lightweight autocomplete row.
///
/// HeiGIT Pelias autocomplete already includes coordinates. They travel with
/// the suggestion so selection does not depend on `/place`, which that host
/// does not serve.
class PlaceSuggestion {
  const PlaceSuggestion({
    required this.providerPlaceId,
    required this.primaryText,
    this.secondaryText,
    this.label,
    this.lat,
    this.lon,
    this.address,
  });

  final String providerPlaceId;
  final String primaryText;
  final String? secondaryText;
  final String? label;
  final double? lat;
  final double? lon;
  final String? address;

  String get displayLabel {
    final explicit = label?.trim();
    if (explicit != null && explicit.isNotEmpty) return explicit;
    if (secondaryText == null || secondaryText!.isEmpty) return primaryText;
    return '$primaryText, $secondaryText';
  }

  bool get hasCoordinates {
    final latitude = lat;
    final longitude = lon;
    return latitude != null &&
        longitude != null &&
        latitude.isFinite &&
        longitude.isFinite;
  }
}

/// Resolved place ready to become a [RouteWaypoint].
class ResolvedPlace {
  const ResolvedPlace({
    required this.providerPlaceId,
    required this.label,
    required this.lat,
    required this.lon,
    this.address,
  });

  final String providerPlaceId;
  final String label;
  final double lat;
  final double lon;
  final String? address;
}

/// Keep a selected place label distinct from the text the user typed.
///
/// A resolved locality name such as "Kristiansand" must not replace a concrete
/// suggestion such as "Kristiansand lufthavn, Kjevik".
String preserveSelectedPlaceLabel({
  required String typedQuery,
  required String suggestionLabel,
  required String resolvedLabel,
}) {
  final query = typedQuery.trim();
  final suggestion = suggestionLabel.trim();
  final resolved = resolvedLabel.trim();
  if (resolved.isEmpty) return suggestion;
  if (suggestion.isEmpty) return resolved;
  final same = suggestion.toLowerCase() == resolved.toLowerCase();
  if (same) return resolved;
  final resolvedIsQuery =
      query.isNotEmpty && resolved.toLowerCase() == query.toLowerCase();
  final suggestionRicher = suggestion.length > resolved.length;
  if (resolvedIsQuery && suggestionRicher) return suggestion;
  if (suggestionRicher &&
      suggestion.toLowerCase().startsWith(resolved.toLowerCase())) {
    return suggestion;
  }
  return resolved;
}

enum RouteTravelMode {
  /// Motorcycle / scooter where the provider supports it (may be beta).
  twoWheeler,

  /// Documented fallback when two-wheeler routing is unavailable.
  driving,
}

class RouteGeometry {
  const RouteGeometry({
    required this.encodedPolyline,
    required this.points,
    required this.travelMode,
    required this.usedFallbackTravelMode,
    this.durationMin,
    this.distanceMeters,
    this.providerWarning,
    this.noticeCode,
  });

  final String encodedPolyline;
  final List<GeoPoint> points;
  final RouteTravelMode travelMode;
  final bool usedFallbackTravelMode;
  final int? durationMin;
  final int? distanceMeters;

  /// e.g. driving-geometry notice, or a fallback explanation.
  final String? providerWarning;

  /// Stable code for localized copy. `DRIVING_GEOMETRY` is road-following
  /// driving geometry and is not motorcycle-optimized.
  final String? noticeCode;
}

class LocationProviderException implements Exception {
  LocationProviderException(this.message, {this.isNetwork = false, this.code});
  final String message;
  final bool isNetwork;
  final String? code;

  @override
  String toString() => message;
}
