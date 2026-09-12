import 'package:motorcycle_clothing/services/location/location_models.dart';
import 'package:motorcycle_clothing/services/location/location_search_service.dart';
import 'package:motorcycle_clothing/services/location/route_geometry_service.dart';

/// Deterministic in-memory search for tests / offline demos (no network).
class FakeLocationSearchService implements LocationSearchService {
  FakeLocationSearchService({
    List<PlaceSuggestion>? suggestions,
    Map<String, ResolvedPlace>? resolved,
    this.failAutocomplete = false,
    this.failResolve = false,
  })  : suggestions = suggestions ?? _defaults,
        resolved = resolved ?? _defaultResolved;

  final List<PlaceSuggestion> suggestions;
  final Map<String, ResolvedPlace> resolved;
  final bool failAutocomplete;
  final bool failResolve;

  static final _defaults = [
    const PlaceSuggestion(
      providerPlaceId: 'place_start',
      primaryText: 'Kristiansand',
      secondaryText: 'Norway',
    ),
    const PlaceSuggestion(
      providerPlaceId: 'place_end',
      primaryText: 'Odderøya',
      secondaryText: 'Kristiansand, Norway',
    ),
    const PlaceSuggestion(
      providerPlaceId: 'place_mid',
      primaryText: 'Kvadraturen',
      secondaryText: 'Kristiansand, Norway',
    ),
  ];

  static final _defaultResolved = {
    'place_start': const ResolvedPlace(
      providerPlaceId: 'place_start',
      label: 'Kristiansand',
      lat: 58.1467,
      lon: 7.9956,
      address: 'Kristiansand, Norway',
    ),
    'place_end': const ResolvedPlace(
      providerPlaceId: 'place_end',
      label: 'Odderøya',
      lat: 58.1599,
      lon: 8.0180,
      address: 'Odderøya, Kristiansand, Norway',
    ),
    'place_mid': const ResolvedPlace(
      providerPlaceId: 'place_mid',
      label: 'Kvadraturen',
      lat: 58.1472,
      lon: 8.0000,
      address: 'Kvadraturen, Kristiansand, Norway',
    ),
  };

  @override
  Future<List<PlaceSuggestion>> autocomplete(
    String query, {
    String? sessionToken,
  }) async {
    if (failAutocomplete) {
      throw LocationProviderException('Place search failed', isNetwork: true);
    }
    final q = query.trim().toLowerCase();
    if (q.length < 2) return const [];
    return suggestions
        .where(
          (s) =>
              s.primaryText.toLowerCase().contains(q) ||
              (s.secondaryText?.toLowerCase().contains(q) ?? false),
        )
        .toList();
  }

  @override
  Future<ResolvedPlace> resolve(PlaceSuggestion suggestion) async {
    if (failResolve) {
      throw LocationProviderException('Could not resolve place');
    }
    final hit = resolved[suggestion.providerPlaceId];
    if (hit != null) return hit;
    throw LocationProviderException('Unknown place');
  }
}

/// Straight segments between waypoints (tests / no API key).
class FakeRouteGeometryService implements RouteGeometryService {
  FakeRouteGeometryService({this.fail = false});

  final bool fail;

  @override
  Future<RouteGeometry?> computeRoute(List<GeoPoint> waypoints) async {
    if (fail) {
      throw LocationProviderException('Route preview failed', isNetwork: true);
    }
    if (waypoints.length < 2) return null;
    return RouteGeometry(
      encodedPolyline: '',
      points: List<GeoPoint>.from(waypoints),
      travelMode: RouteTravelMode.driving,
      usedFallbackTravelMode: true,
      durationMin: 20,
      distanceMeters: 5000,
      providerWarning:
          'Preview uses straight segments (routing provider not configured).',
    );
  }
}
