import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/services/location/fake_location_services.dart';
import 'package:motorcycle_clothing/services/location/google_routes_geometry_service.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';

void main() {
  group('provider failure handling', () {
    test('autocomplete failure surfaces LocationProviderException', () async {
      final search = FakeLocationSearchService(failAutocomplete: true);
      expect(
        () => search.autocomplete('kr'),
        throwsA(isA<LocationProviderException>()),
      );
    });

    test('resolve failure surfaces LocationProviderException', () async {
      final search = FakeLocationSearchService(failResolve: true);
      await expectLater(
        search.resolve(
          const PlaceSuggestion(
            providerPlaceId: 'place_start',
            primaryText: 'Kristiansand',
          ),
        ),
        throwsA(isA<LocationProviderException>()),
      );
    });

    test('geometry failure surfaces LocationProviderException', () async {
      final geometry = FakeRouteGeometryService(fail: true);
      await expectLater(
        geometry.computeRoute([
          const GeoPoint(lat: 1, lon: 1),
          const GeoPoint(lat: 2, lon: 2),
        ]),
        throwsA(isA<LocationProviderException>()),
      );
    });

    test('fake autocomplete returns matching places without network', () async {
      final search = FakeLocationSearchService();
      final hits = await search.autocomplete('krist');
      expect(hits, isNotEmpty);
      final place = await search.resolve(hits.first);
      expect(place.lat, isNonZero);
      expect(place.label, isNotEmpty);
    });

    test('fake geometry returns preview without claiming motorcycle routing',
        () async {
      final geometry = FakeRouteGeometryService();
      final g = await geometry.computeRoute([
        const GeoPoint(lat: 58.14, lon: 7.99),
        const GeoPoint(lat: 58.16, lon: 8.01),
      ]);
      expect(g, isNotNull);
      expect(g!.usedFallbackTravelMode, isTrue);
      expect(g.providerWarning, isNotNull);
      expect(g.points.length, 2);
    });
  });

  group('polyline decode', () {
    test('decodes a known encoded polyline', () {
      // Encoded polyline for roughly (38.5, -120.2) → (40.7, -120.95) → (43.252, -126.453)
      const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
      final pts = decodePolyline(encoded);
      expect(pts.length, 3);
      expect(pts.first.lat, closeTo(38.5, 0.01));
      expect(pts.first.lon, closeTo(-120.2, 0.01));
    });
  });
}
