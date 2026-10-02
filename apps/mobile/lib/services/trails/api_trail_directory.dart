import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/trails/ski_trail.dart';
import 'package:motorcycle_clothing/services/trails/trail_directory.dart';

/// `GET /trails/nearby`.
String trailNearbyPath({required double lat, required double lon}) {
  return Uri(
    path: '/trails/nearby',
    queryParameters: <String, String>{
      'lat': lat.toString(),
      'lon': lon.toString(),
    },
  ).toString();
}

class ApiTrailDirectory implements TrailDirectory {
  ApiTrailDirectory(this._get);

  final Future<Map<String, dynamic>> Function(String path) _get;

  factory ApiTrailDirectory.fromClient(ApiClient api) {
    return ApiTrailDirectory((path) => api.get(path));
  }

  @override
  Future<List<SkiTrail>> nearby({required double lat, required double lon}) {
    return _load(trailNearbyPath(lat: lat, lon: lon));
  }

  Future<List<SkiTrail>> _load(String path) async {
    try {
      final data = await _get(path);
      final rows = data['trails'];
      if (rows is! List) {
        throw TrailDirectoryException(
          'Ski trail search is temporarily unavailable.',
        );
      }
      return [
        for (final row in rows)
          if (row is Map) _trail(row),
      ].whereType<SkiTrail>().toList();
    } on TrailDirectoryException {
      rethrow;
    } on ApiException catch (e) {
      throw TrailDirectoryException(e.message, code: e.code);
    }
  }
}

SkiTrail? _trail(Map row) {
  final id = row['id']?.toString().trim() ?? '';
  final name = row['name']?.toString() ?? '';
  final lat = row['lat'];
  final lon = row['lon'];
  final lineRaw = row['line'];
  if (id.isEmpty || name.trim().isEmpty || lat is! num || lon is! num) {
    return null;
  }
  if (lineRaw is! List) return null;
  final line = <SkiTrailPoint>[];
  for (final point in lineRaw) {
    if (point is! Map) continue;
    final parsed = _point(point);
    if (parsed != null) line.add(parsed);
  }
  if (line.length < 2) return null;
  final distance = row['straightLineDistanceM'];
  if (distance is! num || distance < 0) return null;
  return SkiTrail(
    id: id,
    name: name,
    lat: lat.toDouble(),
    lon: lon.toDouble(),
    straightLineDistanceM: distance.round(),
    line: line,
  );
}

SkiTrailPoint? _point(Map row) {
  final lat = row['lat'];
  final lon = row['lon'];
  if (lat is! num || lon is! num) return null;
  return SkiTrailPoint(lat: lat.toDouble(), lon: lon.toDouble());
}
