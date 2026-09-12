import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:motorcycle_clothing/services/location/location_models.dart';
import 'package:motorcycle_clothing/services/location/location_search_service.dart';

/// Google Places API (New). Key via `GOOGLE_MAPS_API_KEY` (dart-define).
/// Does not log coordinates. Query text is sent only to Google Places.
class GooglePlacesSearchService implements LocationSearchService {
  GooglePlacesSearchService({
    required this.apiKey,
    http.Client? httpClient,
  }) : _http = httpClient ?? http.Client();

  final String apiKey;
  final http.Client _http;

  static const _autocompleteUrl =
      'https://places.googleapis.com/v1/places:autocomplete';

  @override
  Future<List<PlaceSuggestion>> autocomplete(
    String query, {
    String? sessionToken,
  }) async {
    final q = query.trim();
    if (q.length < 2) return const [];
    if (apiKey.isEmpty) {
      throw LocationProviderException('Maps/Places API key is not configured');
    }

    try {
      final body = <String, dynamic>{
        'input': q,
        'languageCode': 'en',
      };
      if (sessionToken != null && sessionToken.isNotEmpty) {
        body['sessionToken'] = sessionToken;
      }

      final res = await _http.post(
        Uri.parse(_autocompleteUrl),
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
              'suggestions.placePrediction.placeId,'
              'suggestions.placePrediction.text,'
              'suggestions.placePrediction.structuredFormat',
        },
        body: jsonEncode(body),
      );

      if (res.statusCode >= 400) {
        throw LocationProviderException(
          'Place search failed (${res.statusCode})',
          isNetwork: res.statusCode >= 500,
        );
      }

      final decoded = jsonDecode(res.body);
      if (decoded is! Map<String, dynamic>) return const [];
      final suggestions = decoded['suggestions'];
      if (suggestions is! List) return const [];

      final out = <PlaceSuggestion>[];
      for (final raw in suggestions) {
        if (raw is! Map) continue;
        final pred = raw['placePrediction'];
        if (pred is! Map) continue;
        final placeId = pred['placeId']?.toString();
        if (placeId == null || placeId.isEmpty) continue;

        final structured = pred['structuredFormat'];
        String primary = '';
        String? secondary;
        if (structured is Map) {
          primary = structured['mainText']?['text']?.toString() ?? '';
          secondary = structured['secondaryText']?['text']?.toString();
        }
        if (primary.isEmpty) {
          primary = pred['text']?['text']?.toString() ?? placeId;
        }
        out.add(
          PlaceSuggestion(
            providerPlaceId: placeId,
            primaryText: primary,
            secondaryText: secondary,
          ),
        );
      }
      return out;
    } on LocationProviderException {
      rethrow;
    } catch (_) {
      throw LocationProviderException(
        'Place search is unavailable (network error)',
        isNetwork: true,
      );
    }
  }

  @override
  Future<ResolvedPlace> resolve(PlaceSuggestion suggestion) async {
    if (apiKey.isEmpty) {
      throw LocationProviderException('Maps/Places API key is not configured');
    }
    try {
      final id = Uri.encodeComponent(suggestion.providerPlaceId);
      final res = await _http.get(
        Uri.parse('https://places.googleapis.com/v1/places/$id'),
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
        },
      );
      if (res.statusCode >= 400) {
        throw LocationProviderException(
          'Could not resolve place (${res.statusCode})',
          isNetwork: res.statusCode >= 500,
        );
      }
      final decoded = jsonDecode(res.body);
      if (decoded is! Map<String, dynamic>) {
        throw LocationProviderException('Invalid place details response');
      }
      final location = decoded['location'];
      if (location is! Map) {
        throw LocationProviderException('Place has no coordinates');
      }
      final lat = (location['latitude'] as num?)?.toDouble();
      final lon = (location['longitude'] as num?)?.toDouble();
      if (lat == null || lon == null) {
        throw LocationProviderException('Place has no coordinates');
      }
      final label =
          decoded['displayName']?['text']?.toString() ?? suggestion.primaryText;
      final address =
          decoded['formattedAddress']?.toString() ?? suggestion.secondaryText;
      return ResolvedPlace(
        providerPlaceId: suggestion.providerPlaceId,
        label: label,
        lat: lat,
        lon: lon,
        address: address,
      );
    } on LocationProviderException {
      rethrow;
    } catch (_) {
      throw LocationProviderException(
        'Could not resolve place (network error)',
        isNetwork: true,
      );
    }
  }
}
