import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/location/api_location_search_service.dart';
import 'package:motorcycle_clothing/services/location/api_route_geometry_service.dart';
import 'package:motorcycle_clothing/services/location/fake_location_services.dart';
import 'package:motorcycle_clothing/services/location/location_search_service.dart';
import 'package:motorcycle_clothing/services/location/route_geometry_service.dart';

/// Place search and route preview go through the RideWear API.
/// Provider keys stay on the server. Tests may inject fakes directly.
class LocationServices {
  LocationServices({
    LocationSearchService? search,
    RouteGeometryService? geometry,
    ApiClient? api,
  })  : search = search ??
            (api != null
                ? ApiLocationSearchService.fromClient(api)
                : FakeLocationSearchService()),
        geometry = geometry ??
            (api != null
                ? ApiRouteGeometryService.fromClient(api)
                : FakeRouteGeometryService());

  final LocationSearchService search;
  final RouteGeometryService geometry;
}
