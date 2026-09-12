import 'package:flutter/foundation.dart';
import 'package:motorcycle_clothing/config/app_config.dart';
import 'package:motorcycle_clothing/services/location/fake_location_services.dart';
import 'package:motorcycle_clothing/services/location/google_places_search_service.dart';
import 'package:motorcycle_clothing/services/location/google_routes_geometry_service.dart';
import 'package:motorcycle_clothing/services/location/location_search_service.dart';
import 'package:motorcycle_clothing/services/location/route_geometry_service.dart';

/// Builds location/search services from [AppConfig] without scattering
/// Google-specific construction across widgets.
class LocationServices {
  LocationServices({
    LocationSearchService? search,
    RouteGeometryService? geometry,
  })  : search = search ?? _defaultSearch(),
        geometry = geometry ?? _defaultGeometry();

  final LocationSearchService search;
  final RouteGeometryService geometry;

  static LocationSearchService _defaultSearch() {
    if (AppConfig.hasGoogleMapsApiKey) {
      return GooglePlacesSearchService(apiKey: AppConfig.googleMapsApiKey);
    }
    // Local/CI without a key: searchable fake catalog (never used in prod builds
    // that ship a restricted Maps key).
    if (kDebugMode) {
      return FakeLocationSearchService();
    }
    return GooglePlacesSearchService(apiKey: '');
  }

  static RouteGeometryService _defaultGeometry() {
    if (AppConfig.hasGoogleMapsApiKey) {
      return GoogleRoutesGeometryService(apiKey: AppConfig.googleMapsApiKey);
    }
    return FakeRouteGeometryService();
  }
}
