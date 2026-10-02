import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/resorts/resort_directory.dart';
import 'package:motorcycle_clothing/services/resorts/ski_resort.dart';

/// `GET /resorts/search`. The query is percent-encoded once as UTF-8.
String resortSearchPath(String query) {
  return Uri(
    path: '/resorts/search',
    queryParameters: <String, String>{'q': query.trim()},
  ).toString();
}

/// `GET /resorts/nearby`.
String resortNearbyPath({required double lat, required double lon}) {
  return Uri(
    path: '/resorts/nearby',
    queryParameters: <String, String>{
      'lat': lat.toString(),
      'lon': lon.toString(),
    },
  ).toString();
}

class ApiResortDirectory implements ResortDirectory {
  ApiResortDirectory(this._get);

  final Future<Map<String, dynamic>> Function(String path) _get;

  factory ApiResortDirectory.fromClient(ApiClient api) {
    return ApiResortDirectory((path) => api.get(path));
  }

  @override
  Future<List<SkiResort>> searchByName(String query) async {
    final q = query.trim();
    if (q.isEmpty) return const [];
    return _load(resortSearchPath(q));
  }

  @override
  Future<List<SkiResort>> nearby({required double lat, required double lon}) {
    return _load(resortNearbyPath(lat: lat, lon: lon));
  }

  Future<List<SkiResort>> _load(String path) async {
    try {
      final data = await _get(path);
      final rows = data['resorts'];
      if (rows is! List) {
        throw ResortDirectoryException(
          'Ski resort search is temporarily unavailable.',
        );
      }
      return [
        for (final row in rows)
          if (row is Map) _resort(row),
      ].whereType<SkiResort>().toList();
    } on ResortDirectoryException {
      rethrow;
    } on ApiException catch (e) {
      throw ResortDirectoryException(e.message, code: e.code);
    }
  }
}

SkiResort? _resort(Map row) {
  final id = row['id']?.toString().trim() ?? '';
  final name = row['name']?.toString() ?? '';
  final lat = row['lat'];
  final lon = row['lon'];
  if (id.isEmpty || name.trim().isEmpty || lat is! num || lon is! num) {
    return null;
  }
  final distance = row['straightLineDistanceM'];
  return SkiResort(
    id: id,
    name: name,
    lat: lat.toDouble(),
    lon: lon.toDouble(),
    straightLineDistanceM: distance is num ? distance.round() : null,
  );
}
