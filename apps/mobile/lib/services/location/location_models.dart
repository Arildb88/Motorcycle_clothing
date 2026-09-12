/// Provider-neutral geography models for place search and route preview.
/// Coordinates remain the canonical waypoint representation for persistence.
library;

class GeoPoint {
  const GeoPoint({required this.lat, required this.lon});

  final double lat;
  final double lon;
}

/// Lightweight autocomplete row (before place details are resolved).
class PlaceSuggestion {
  const PlaceSuggestion({
    required this.providerPlaceId,
    required this.primaryText,
    this.secondaryText,
  });

  final String providerPlaceId;
  final String primaryText;
  final String? secondaryText;

  String get displayLabel {
    if (secondaryText == null || secondaryText!.isEmpty) return primaryText;
    return '$primaryText, $secondaryText';
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
  });

  final String encodedPolyline;
  final List<GeoPoint> points;
  final RouteTravelMode travelMode;
  final bool usedFallbackTravelMode;
  final int? durationMin;
  final int? distanceMeters;

  /// e.g. Google TWO_WHEELER beta notice, or fallback explanation.
  final String? providerWarning;
}

class LocationProviderException implements Exception {
  LocationProviderException(this.message, {this.isNetwork = false});
  final String message;
  final bool isNetwork;

  @override
  String toString() => message;
}
