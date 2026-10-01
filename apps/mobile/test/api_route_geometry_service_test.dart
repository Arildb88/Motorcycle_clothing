import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/location/api_location_search_service.dart';
import 'package:motorcycle_clothing/services/location/api_route_geometry_service.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';

void main() {
  const start = GeoPoint(lat: 58.1467, lon: 7.9956);
  const mid = GeoPoint(lat: 58.16, lon: 8.01);
  const end = GeoPoint(lat: 58.2, lon: 8.08);

  test('maps road geometry, distance, duration, and driving notice', () async {
    Map<String, dynamic>? posted;
    final service = ApiRouteGeometryService(
      post: (path, body) async {
        expect(path, '/location/route-preview');
        posted = body;
        return {
          'points': [
            {'lat': 58.1467, 'lon': 7.9956},
            {'lat': 58.15, 'lon': 8.0},
            {'lat': 58.16, 'lon': 8.01},
            {'lat': 58.18, 'lon': 8.04},
            {'lat': 58.2, 'lon': 8.08},
          ],
          'distanceM': 18500,
          'durationMin': 22,
          'travelMode': 'driving',
          'usedFallbackTravelMode': false,
          'noticeCode': 'DRIVING_GEOMETRY',
          'providerWarning':
              'Road-following driving geometry. This route is not motorcycle-optimized.',
        };
      },
    );

    final geometry = await service.computeRoute(
      [start, mid, end],
      avoidMotorways: true,
    );

    expect(posted?['avoidMotorways'], isTrue);
    expect((posted?['waypoints'] as List).length, 3);
    expect(geometry, isNotNull);
    expect(geometry!.points.length, 5);
    expect(geometry.points.first.lat, closeTo(58.1467, 0.0001));
    expect(geometry.distanceMeters, 18500);
    expect(geometry.durationMin, 22);
    expect(geometry.travelMode, RouteTravelMode.driving);
    expect(geometry.usedFallbackTravelMode, isFalse);
    expect(geometry.noticeCode, 'DRIVING_GEOMETRY');
    expect(geometry.providerWarning, contains('not motorcycle-optimized'));
  });

  test('provider errors surface as LocationProviderException', () async {
    final service = ApiRouteGeometryService(
      post: (_, _) async {
        throw ApiException(
          'Road routing is temporarily unavailable.',
          statusCode: 503,
          code: 'ROUTING_UNAVAILABLE',
        );
      },
    );
    expect(
      () => service.computeRoute([start, end]),
      throwsA(
        isA<LocationProviderException>()
            .having((error) => error.code, 'code', 'ROUTING_UNAVAILABLE')
            .having((error) => error.isNetwork, 'isNetwork', isTrue),
      ),
    );
  });

  test('place search uses the API and keeps labels', () async {
    final search = ApiLocationSearchService(
      getList: (path) async {
        expect(path, contains('/location/places?q='));
        return [
          {
            'providerPlaceId': 'whosonfirst:locality:101',
            'primaryText': 'Kristiansand',
            'secondaryText': 'Agder, Norway',
          },
        ];
      },
      post: (path, body) async {
        expect(path, '/location/places/resolve');
        expect(body['providerPlaceId'], 'whosonfirst:locality:101');
        return {
          'providerPlaceId': 'whosonfirst:locality:101',
          'label': 'Kristiansand',
          'lat': 58.1467,
          'lon': 7.9956,
          'address': 'Kristiansand, Agder, Norway',
        };
      },
    );
    final hits = await search.autocomplete('Kristiansand');
    expect(hits.single.displayLabel, 'Kristiansand, Agder, Norway');
    final place = await search.resolve(hits.single);
    expect(place.label, 'Kristiansand');
    expect(place.address, 'Kristiansand, Agder, Norway');
    expect(place.lat, closeTo(58.1467, 0.0001));
  });
}
