import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/domain/saved_route.dart';
import 'package:motorcycle_clothing/services/api_client.dart';

/// Loads saved routes for the current session.
///
/// Resort snow sports combine `alpine_skiing` and `snowboarding` so one home
/// list covers both stored disciplines. Other activities stay on one type.
Future<List<SavedRoute>> fetchSavedRoutesForActivity(
  ApiClient api,
  AppActivity activity,
) async {
  final groups = <List<SavedRoute>>[];
  for (final type in activity.savedRouteActivityTypes) {
    final list = await api.getList('/routes?activityType=$type');
    groups.add(
      list.whereType<Map<String, dynamic>>().map(SavedRoute.fromJson).toList(),
    );
  }
  return mergeSavedRouteGroups(groups);
}

/// Favorites stay first. The first copy of an id wins.
List<SavedRoute> mergeSavedRouteGroups(Iterable<List<SavedRoute>> groups) {
  final merged = <SavedRoute>[];
  final seen = <String>{};
  for (final group in groups) {
    for (final route in group) {
      if (seen.add(route.id)) merged.add(route);
    }
  }
  final favorites = <SavedRoute>[];
  final rest = <SavedRoute>[];
  for (final route in merged) {
    (route.isFavorite ? favorites : rest).add(route);
  }
  return [...favorites, ...rest];
}
