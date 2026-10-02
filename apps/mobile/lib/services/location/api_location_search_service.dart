import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';
import 'package:motorcycle_clothing/services/location/location_search_service.dart';

/// Path for `GET /location/places`.
///
/// The query is percent-encoded once as UTF-8. Norwegian letters such as
/// æ, ø, and å stay in the query value and are not folded to ASCII.
String locationPlacesPath(String query) {
  final q = query.trim();
  return Uri(
    path: '/location/places',
    queryParameters: <String, String>{'q': q},
  ).toString();
}

/// Place search through the RideWear API. Provider credentials stay on the server.
class ApiLocationSearchService implements LocationSearchService {
  ApiLocationSearchService({required this.getList, required this.post});

  final Future<List<dynamic>> Function(String path) getList;
  final Future<Map<String, dynamic>> Function(
    String path,
    Map<String, dynamic> body,
  ) post;

  factory ApiLocationSearchService.fromClient(ApiClient api) {
    return ApiLocationSearchService(
      getList: (path) => api.getList(path, auth: true),
      post: (path, body) => api.post(path, body, auth: true),
    );
  }

  @override
  Future<List<PlaceSuggestion>> autocomplete(
    String query, {
    String? sessionToken,
  }) async {
    final q = query.trim();
    if (q.length < 2) return const [];
    try {
      final rows = await getList(locationPlacesPath(q));
      return [
        for (final row in rows)
          if (row is Map)
            PlaceSuggestion(
              providerPlaceId: row['providerPlaceId']?.toString() ?? '',
              primaryText: row['primaryText']?.toString() ?? '',
              secondaryText: row['secondaryText']?.toString(),
            ),
      ].where((hit) => hit.providerPlaceId.isNotEmpty).toList();
    } on ApiException catch (e) {
      throw LocationProviderException(
        e.message,
        isNetwork: e.statusCode == null || e.statusCode! >= 500,
        code: e.code,
      );
    }
  }

  @override
  Future<ResolvedPlace> resolve(PlaceSuggestion suggestion) async {
    try {
      final data = await post('/location/places/resolve', {
        'providerPlaceId': suggestion.providerPlaceId,
      });
      final lat = data['lat'];
      final lon = data['lon'];
      if (lat is! num || lon is! num) {
        throw LocationProviderException('Could not resolve place');
      }
      return ResolvedPlace(
        providerPlaceId:
            data['providerPlaceId']?.toString() ?? suggestion.providerPlaceId,
        label: data['label']?.toString() ?? suggestion.primaryText,
        lat: lat.toDouble(),
        lon: lon.toDouble(),
        address: data['address']?.toString(),
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
