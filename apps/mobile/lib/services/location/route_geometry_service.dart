import 'package:motorcycle_clothing/services/location/location_models.dart';

/// Route geometry between ordered waypoints (preview only — not navigation).
abstract class RouteGeometryService {
  Future<RouteGeometry?> computeRoute(List<GeoPoint> waypoints);
}
