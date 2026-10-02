/// Provider-neutral ski resort returned by the RideWear API.
class SkiResort {
  const SkiResort({
    required this.id,
    required this.name,
    required this.lat,
    required this.lon,
    this.straightLineDistanceM,
  });

  final String id;
  final String name;
  final double lat;
  final double lon;

  /// Straight-line meters from a nearby search. Null for name search.
  final int? straightLineDistanceM;

  String get providerPlaceId => 'fnugg:$id';
}
