import 'package:motorcycle_clothing/domain/saved_route.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';

/// Editable waypoint draft for the route builder.
///
/// Coordinates are canonical once a place is selected; the UI shows [label].
class WaypointDraft {
  WaypointDraft({
    this.providerPlaceId,
    this.label,
    this.address,
    this.lat,
    this.lon,
  });

  factory WaypointDraft.empty() => WaypointDraft();

  factory WaypointDraft.fromRouteWaypoint(RouteWaypoint wp) {
    return WaypointDraft(
      label: wp.label ?? wp.address,
      address: wp.address,
      lat: wp.lat,
      lon: wp.lon,
    );
  }

  factory WaypointDraft.fromResolved(ResolvedPlace place) {
    return WaypointDraft(
      providerPlaceId: place.providerPlaceId,
      label: place.label,
      lat: place.lat,
      lon: place.lon,
      address: place.address,
    );
  }

  String? providerPlaceId;
  String? label;
  String? address;
  double? lat;
  double? lon;

  bool get isResolved => lat != null && lon != null;

  String get displayLabel {
    if (label != null && label!.trim().isNotEmpty) return label!.trim();
    if (address != null && address!.trim().isNotEmpty) return address!.trim();
    if (isResolved) {
      return '${lat!.toStringAsFixed(4)}, ${lon!.toStringAsFixed(4)}';
    }
    return '';
  }

  GeoPoint? get geoPoint =>
      isResolved ? GeoPoint(lat: lat!, lon: lon!) : null;

  RouteWaypoint toRouteWaypoint({
    required int sortOrder,
    String? waypointType,
  }) {
    if (!isResolved) {
      throw StateError('Waypoint is not resolved to coordinates');
    }
    return RouteWaypoint(
      lat: lat!,
      lon: lon!,
      label: label,
      address: address,
      sortOrder: sortOrder,
      waypointType: waypointType,
    );
  }

  Map<String, dynamic> toApiJson() {
    if (!isResolved) {
      throw StateError('Waypoint is not resolved to coordinates');
    }
    return {
      'lat': lat,
      'lon': lon,
      if (label != null && label!.trim().isNotEmpty) 'label': label!.trim(),
      if (address != null && address!.trim().isNotEmpty)
        'address': address!.trim(),
    };
  }

  void clearPlace() {
    providerPlaceId = null;
    label = null;
    address = null;
    lat = null;
    lon = null;
  }

  void applyResolved(ResolvedPlace place) {
    providerPlaceId = place.providerPlaceId;
    label = place.label;
    address = place.address;
    lat = place.lat;
    lon = place.lon;
  }

  /// Advanced/dev fallback — not used in the normal place-search path.
  void applyManualCoordinates({
    required double latitude,
    required double longitude,
    String? manualLabel,
  }) {
    providerPlaceId = null;
    lat = latitude;
    lon = longitude;
    label = manualLabel ?? label ?? 'Custom point';
    address = null;
  }
}

/// Pure helpers for ordered stop list mutations (unit-tested).
class WaypointListOps {
  static List<WaypointDraft> ensureStartAndEnd(List<WaypointDraft> list) {
    if (list.isEmpty) {
      return [WaypointDraft.empty(), WaypointDraft.empty()];
    }
    if (list.length == 1) {
      return [list.first, WaypointDraft.empty()];
    }
    return List<WaypointDraft>.from(list);
  }

  static List<WaypointDraft> addStop(List<WaypointDraft> list) {
    if (list.length < 2) {
      return ensureStartAndEnd([...list, WaypointDraft.empty()]);
    }
    return [
      ...list.sublist(0, list.length - 1),
      WaypointDraft.empty(),
      list.last,
    ];
  }

  static List<WaypointDraft>? removeAt(List<WaypointDraft> list, int index) {
    if (list.length <= 2) return null;
    if (index < 0 || index >= list.length) return null;
    return List<WaypointDraft>.from(list)..removeAt(index);
  }

  static List<WaypointDraft>? move(
    List<WaypointDraft> list,
    int index,
    int delta,
  ) {
    final j = index + delta;
    if (index < 0 || index >= list.length) return null;
    if (j < 0 || j >= list.length) return null;
    final next = List<WaypointDraft>.from(list);
    final item = next.removeAt(index);
    next.insert(j, item);
    return next;
  }

  static bool canSave({
    required String name,
    required List<WaypointDraft> waypoints,
  }) {
    if (name.trim().isEmpty) return false;
    if (waypoints.length < 2) return false;
    return waypoints.every((w) => w.isResolved);
  }

  static List<Map<String, dynamic>> toApiWaypoints(List<WaypointDraft> list) {
    return [for (final w in list) w.toApiJson()];
  }

  static String roleLabel(int index, int length) {
    if (index == 0) return 'Start';
    if (index == length - 1) return 'Destination';
    return 'Stop $index';
  }

  /// Reverse start ↔ destination (and intermediate order).
  static List<WaypointDraft> reverse(List<WaypointDraft> list) {
    final base = ensureStartAndEnd(list);
    return base.reversed
        .map(
          (w) => WaypointDraft(
            providerPlaceId: w.providerPlaceId,
            label: w.label,
            address: w.address,
            lat: w.lat,
            lon: w.lon,
          ),
        )
        .toList();
  }

  /// When enabled, destination becomes a copy of start (loop / return).
  /// Intermediate stops are preserved. Does not add a second destination field.
  static List<WaypointDraft> applyRoundTrip(
    List<WaypointDraft> list, {
    required bool enabled,
  }) {
    final base = ensureStartAndEnd(list);
    if (!enabled) return base;
    final start = base.first;
    if (!start.isResolved) return base;
    final ret = WaypointDraft(
      providerPlaceId: start.providerPlaceId,
      label: start.label,
      address: start.address,
      lat: start.lat,
      lon: start.lon,
    );
    return [...base.sublist(0, base.length - 1), ret];
  }

  /// True when first and last share coordinates (round-trip / loop).
  static bool looksLikeRoundTrip(List<WaypointDraft> list) {
    if (list.length < 2) return false;
    final a = list.first;
    final b = list.last;
    if (!a.isResolved || !b.isResolved) return false;
    return (a.lat! - b.lat!).abs() < 1e-5 && (a.lon! - b.lon!).abs() < 1e-5;
  }

  /// Ready to analyze (coordinates only — name optional until save).
  static bool canAnalyze(List<WaypointDraft> waypoints) {
    if (waypoints.length < 2) return false;
    return waypoints.every((w) => w.isResolved);
  }
}
