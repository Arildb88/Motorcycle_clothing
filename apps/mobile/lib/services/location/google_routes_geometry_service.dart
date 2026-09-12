import 'dart:convert';
import 'dart:math' as math;

import 'package:http/http.dart' as http;
import 'package:motorcycle_clothing/services/location/location_models.dart';
import 'package:motorcycle_clothing/services/location/route_geometry_service.dart';

/// Google Routes API for preview geometry (not turn-by-turn navigation).
///
/// Tries `TWO_WHEELER` first (Google beta). If unsupported, falls back to
/// `DRIVE` and surfaces an explicit warning — never silently claims
/// motorcycle-specific routing when unavailable.
class GoogleRoutesGeometryService implements RouteGeometryService {
  GoogleRoutesGeometryService({
    required this.apiKey,
    http.Client? httpClient,
    this.preferTwoWheeler = true,
  }) : _http = httpClient ?? http.Client();

  final String apiKey;
  final http.Client _http;
  final bool preferTwoWheeler;

  static const _url =
      'https://routes.googleapis.com/directions/v2:computeRoutes';

  static const twoWheelerBetaWarning =
      'Two-wheeler routing is a Google Maps Platform beta feature and may be '
      'unavailable or incomplete in some regions.';

  @override
  Future<RouteGeometry?> computeRoute(List<GeoPoint> waypoints) async {
    if (waypoints.length < 2) return null;
    if (apiKey.isEmpty) {
      throw LocationProviderException('Maps/Routes API key is not configured');
    }

    if (preferTwoWheeler) {
      try {
        final geometry = await _request(waypoints, travelMode: 'TWO_WHEELER');
        return RouteGeometry(
          encodedPolyline: geometry.encodedPolyline,
          points: geometry.points,
          travelMode: RouteTravelMode.twoWheeler,
          usedFallbackTravelMode: false,
          durationMin: geometry.durationMin,
          distanceMeters: geometry.distanceMeters,
          providerWarning: twoWheelerBetaWarning,
        );
      } on LocationProviderException {
        // Fall through to DRIVE.
      }
    }

    final geometry = await _request(waypoints, travelMode: 'DRIVE');
    return RouteGeometry(
      encodedPolyline: geometry.encodedPolyline,
      points: geometry.points,
      travelMode: RouteTravelMode.driving,
      usedFallbackTravelMode: preferTwoWheeler,
      durationMin: geometry.durationMin,
      distanceMeters: geometry.distanceMeters,
      providerWarning: preferTwoWheeler
          ? 'Two-wheeler routing unavailable for this route/region; '
              'showing driving geometry as a fallback preview.'
          : null,
    );
  }

  Future<RouteGeometry> _request(
    List<GeoPoint> waypoints, {
    required String travelMode,
  }) async {
    try {
      final origin = waypoints.first;
      final destination = waypoints.last;
      final intermediates = waypoints.length > 2
          ? waypoints.sublist(1, waypoints.length - 1)
          : const <GeoPoint>[];

      final body = <String, dynamic>{
        'origin': {
          'location': {
            'latLng': {'latitude': origin.lat, 'longitude': origin.lon},
          },
        },
        'destination': {
          'location': {
            'latLng': {
              'latitude': destination.lat,
              'longitude': destination.lon,
            },
          },
        },
        'travelMode': travelMode,
        'polylineQuality': 'OVERVIEW',
        'languageCode': 'en',
      };
      if (intermediates.isNotEmpty) {
        body['intermediates'] = intermediates
            .map(
              (p) => {
                'location': {
                  'latLng': {'latitude': p.lat, 'longitude': p.lon},
                },
              },
            )
            .toList();
      }

      final res = await _http.post(
        Uri.parse(_url),
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
              'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
        },
        body: jsonEncode(body),
      );

      if (res.statusCode >= 400) {
        throw LocationProviderException(
          'Route preview failed (${res.statusCode})',
          isNetwork: res.statusCode >= 500,
        );
      }

      final decoded = jsonDecode(res.body);
      if (decoded is! Map<String, dynamic>) {
        throw LocationProviderException('Invalid route response');
      }
      final routes = decoded['routes'];
      if (routes is! List || routes.isEmpty) {
        throw LocationProviderException('No route geometry returned');
      }
      final route = routes.first;
      if (route is! Map) {
        throw LocationProviderException('Invalid route geometry');
      }
      final encoded = route['polyline']?['encodedPolyline']?.toString() ?? '';
      final points = encoded.isEmpty
          ? List<GeoPoint>.from(waypoints)
          : decodePolyline(encoded);
      final durationRaw = route['duration']?.toString() ?? '';
      final durationMin = _parseDurationMin(durationRaw);
      final distanceMeters = (route['distanceMeters'] as num?)?.toInt();

      return RouteGeometry(
        encodedPolyline: encoded,
        points: points,
        travelMode: travelMode == 'TWO_WHEELER'
            ? RouteTravelMode.twoWheeler
            : RouteTravelMode.driving,
        usedFallbackTravelMode: false,
        durationMin: durationMin,
        distanceMeters: distanceMeters,
      );
    } on LocationProviderException {
      rethrow;
    } catch (_) {
      throw LocationProviderException(
        'Route preview unavailable (network error)',
        isNetwork: true,
      );
    }
  }

  static int? _parseDurationMin(String raw) {
    if (raw.endsWith('s')) {
      final secs = int.tryParse(raw.substring(0, raw.length - 1));
      if (secs != null) return math.max(1, (secs / 60).round());
    }
    return null;
  }
}

/// Decodes a Google encoded polyline into [GeoPoint]s.
List<GeoPoint> decodePolyline(String encoded) {
  final points = <GeoPoint>[];
  var index = 0;
  var lat = 0;
  var lng = 0;

  while (index < encoded.length) {
    var shift = 0;
    var result = 0;
    int b;
    do {
      b = encoded.codeUnitAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    final dlat = (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.codeUnitAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    final dlng = (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.add(GeoPoint(lat: lat / 1e5, lon: lng / 1e5));
  }
  return points;
}
