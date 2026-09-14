import 'dart:convert';

/// Saved motorcycle route (API `Route` model). Template ≠ ActivityPlan.
class SavedRoute {
  SavedRoute({
    required this.id,
    required this.name,
    this.description,
    required this.activityType,
    required this.routeKind,
    this.category,
    required this.isFavorite,
    required this.isDefaultCommute,
    this.startLabel,
    this.endLabel,
    required this.typicalDurationMin,
    required this.waypoints,
    this.avoidMotorways = false,
  });

  final String id;
  final String name;
  final String? description;
  final String activityType;
  final String routeKind;
  final String? category;
  final bool isFavorite;
  final bool isDefaultCommute;
  final String? startLabel;
  final String? endLabel;
  final int typicalDurationMin;
  final List<RouteWaypoint> waypoints;
  final bool avoidMotorways;

  factory SavedRoute.fromJson(Map<String, dynamic> json) {
    final wps = (json['waypoints'] as List?) ?? const [];
    final prefs = _parsePreferences(json['preferencesJson'] ?? json['preferences']);
    return SavedRoute(
      id: json['id'] as String,
      name: json['name'] as String? ?? 'Route',
      description: json['description'] as String?,
      activityType: json['activityType'] as String? ?? 'motorcycle',
      routeKind: json['routeKind'] as String? ?? 'point_to_point',
      category: json['category'] as String?,
      isFavorite: json['isFavorite'] == true,
      isDefaultCommute: json['isDefaultCommute'] == true,
      startLabel: json['startLabel'] as String?,
      endLabel: json['endLabel'] as String?,
      typicalDurationMin: (json['typicalDurationMin'] as num?)?.toInt() ?? 30,
      waypoints: wps
          .whereType<Map<String, dynamic>>()
          .map(RouteWaypoint.fromJson)
          .toList(),
      avoidMotorways: prefs['avoidMotorways'] == true,
    );
  }

  static Map<String, dynamic> _parsePreferences(dynamic raw) {
    if (raw is Map<String, dynamic>) return raw;
    if (raw is String && raw.isNotEmpty) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is Map<String, dynamic>) return decoded;
      } catch (_) {}
    }
    return const {};
  }

  String get summaryLabel {
    if (waypoints.length >= 2) {
      final a = waypoints.first.label ?? startLabel ?? 'Start';
      final b = waypoints.last.label ?? endLabel ?? 'End';
      if (routeKind == 'loop') return '$a · loop · ${waypoints.length} stops';
      if (waypoints.length > 2) {
        return '$a → … → $b (${waypoints.length})';
      }
      return '$a → $b';
    }
    return '${startLabel ?? 'Start'} → ${endLabel ?? 'End'}';
  }

  String get durationLabel {
    final m = typicalDurationMin;
    if (m >= 60) {
      final h = m ~/ 60;
      final rem = m % 60;
      return rem == 0 ? '~${h}h' : '~${h}h ${rem}m';
    }
    return '~$m min';
  }
}

class RouteWaypoint {
  RouteWaypoint({
    required this.lat,
    required this.lon,
    this.label,
    this.address,
    this.sortOrder = 0,
    this.waypointType,
  });

  final double lat;
  final double lon;
  final String? label;
  final String? address;
  final int sortOrder;
  final String? waypointType;

  factory RouteWaypoint.fromJson(Map<String, dynamic> json) {
    return RouteWaypoint(
      lat: (json['lat'] as num).toDouble(),
      lon: (json['lon'] as num).toDouble(),
      label: json['label'] as String?,
      address: json['address'] as String?,
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
      waypointType: json['waypointType'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'lat': lat,
        'lon': lon,
        if (label != null) 'label': label,
        if (address != null) 'address': address,
        if (waypointType != null) 'waypointType': waypointType,
      };
}
