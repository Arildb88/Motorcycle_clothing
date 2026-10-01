import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';
import 'package:motorcycle_clothing/services/location/route_geometry_service.dart';

/// Preview geometry from the RideWear API (server-side OpenRouteService).
///
/// The client never holds the routing provider key. Returned geometry is
/// road-following driving geometry, not motorcycle-optimized routing.
class ApiRouteGeometryService implements RouteGeometryService {
  ApiRouteGeometryService({required this.post});

  final Future<Map<String, dynamic>> Function(
    String path,
    Map<String, dynamic> body,
  ) post;

  factory ApiRouteGeometryService.fromClient(ApiClient api) {
    return ApiRouteGeometryService(
      post: (path, body) => api.post(path, body, auth: true),
    );
  }

  @override
  Future<RouteGeometry?> computeRoute(
    List<GeoPoint> waypoints, {
    bool avoidMotorways = false,
  }) async {
    if (waypoints.length < 2) return null;
    try {
      final data = await post('/location/route-preview', {
        'waypoints': [
          for (final point in waypoints) {'lat': point.lat, 'lon': point.lon},
        ],
        'avoidMotorways': avoidMotorways,
      });
      final points = _points(data['points']);
      if (points.length < 2) {
        throw LocationProviderException(
          'Road routing is temporarily unavailable.',
          isNetwork: true,
          code: 'ROUTING_UNAVAILABLE',
        );
      }
      return RouteGeometry(
        encodedPolyline: '',
        points: points,
        travelMode: RouteTravelMode.driving,
        usedFallbackTravelMode: data['usedFallbackTravelMode'] == true,
        durationMin: (data['durationMin'] as num?)?.round(),
        distanceMeters: (data['distanceM'] as num?)?.round(),
        providerWarning: data['providerWarning'] as String?,
        noticeCode: data['noticeCode'] as String? ?? 'DRIVING_GEOMETRY',
      );
    } on LocationProviderException {
      rethrow;
    } on ApiException catch (e) {
      throw LocationProviderException(
        e.message,
        isNetwork: e.statusCode == null || e.statusCode! >= 500,
        code: e.code,
      );
    }
  }
}

List<GeoPoint> _points(dynamic raw) {
  if (raw is! List) return const [];
  final points = <GeoPoint>[];
  for (final item in raw) {
    if (item is! Map) continue;
    final lat = item['lat'];
    final lon = item['lon'];
    if (lat is! num || lon is! num) continue;
    points.add(GeoPoint(lat: lat.toDouble(), lon: lon.toDouble()));
  }
  return points;
}
