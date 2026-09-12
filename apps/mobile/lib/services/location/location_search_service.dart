import 'package:motorcycle_clothing/services/location/location_models.dart';

/// Place autocomplete + details. Implementations must not log coordinates.
abstract class LocationSearchService {
  Future<List<PlaceSuggestion>> autocomplete(
    String query, {
    String? sessionToken,
  });

  Future<ResolvedPlace> resolve(PlaceSuggestion suggestion);
}
