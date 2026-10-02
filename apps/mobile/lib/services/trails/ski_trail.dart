/// One published vertex used for the existing cross-country line.
class SkiTrailPoint {
  const SkiTrailPoint({required this.lat, required this.lon});

  final double lat;
  final double lon;
}

/// Provider-neutral ski trail returned by the RideWear API.
class SkiTrail {
  const SkiTrail({
    required this.id,
    required this.name,
    required this.lat,
    required this.lon,
    required this.straightLineDistanceM,
    required this.line,
  });

  final String id;
  final String name;
  final double lat;
  final double lon;

  /// Straight-line meters from the nearby origin to the nearest vertex.
  final int straightLineDistanceM;

  /// Published centerline vertices. Not a generated route.
  final List<SkiTrailPoint> line;

  String get providerPlaceId => 'geonorge:$id';
}
