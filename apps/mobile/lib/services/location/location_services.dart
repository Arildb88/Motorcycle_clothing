import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/location/api_location_search_service.dart';
import 'package:motorcycle_clothing/services/location/api_route_geometry_service.dart';
import 'package:motorcycle_clothing/services/location/location_search_service.dart';
import 'package:motorcycle_clothing/services/location/route_geometry_service.dart';

/// Place search and route preview go through the RideWear API.
/// Provider keys stay on the server. Tests pass fakes explicitly.
class LocationServices {
  LocationServices({
    LocationSearchService? search,
    RouteGeometryService? geometry,
    ApiClient? api,
  })  : search = search ??
            ApiLocationSearchService.fromClient(
              api ??
                  (throw ArgumentError(
                    'LocationServices needs an ApiClient. Test fakes must be passed in.',
                  )),
            ),
        geometry = geometry ??
            ApiRouteGeometryService.fromClient(
              api ??
                  (throw ArgumentError(
                    'LocationServices needs an ApiClient. Test fakes must be passed in.',
                  )),
            );

  final LocationSearchService search;
  final RouteGeometryService geometry;
}
