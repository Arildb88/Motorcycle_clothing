import 'package:motorcycle_clothing/features/plan/activity_recommendation_request.dart';
import 'package:motorcycle_clothing/features/routes/waypoint_draft.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';

/// Language-neutral planning mode (matches API `planningMode`).
enum PlanningMode { departure, arrival }

extension PlanningModeApi on PlanningMode {
  String get apiValue => name;
}

/// In-memory planner state. Motorcycle stays the default activity.
class RidePlannerState {
  RidePlannerState({
    this.routeId,
    this.routeName = '',
    List<WaypointDraft>? waypoints,
    this.planningMode = PlanningMode.departure,
    DateTime? anchorAt,
    this.leaveNow = true,
    this.roundTrip = false,
    this.avoidMotorways = false,
    int? durationMin,
    this.activityType = 'motorcycle',
    this.inputs = const ActivityPlanningInputs(),
  })  : waypoints = WaypointListOps.ensureStartAndEnd(
          waypoints ?? [WaypointDraft.empty(), WaypointDraft.empty()],
        ),
        anchorAt = anchorAt ?? DateTime.now(),
        durationMin = durationMin ?? defaultPlanningDurationMin(activityType);

  final String? routeId;
  final String routeName;
  final List<WaypointDraft> waypoints;
  final PlanningMode planningMode;
  final DateTime anchorAt;
  final bool leaveNow;
  final bool roundTrip;
  final bool avoidMotorways;
  final int durationMin;
  final String activityType;
  final ActivityPlanningInputs inputs;

  bool get usesRoadPreview => activityUsesRoadPreview(activityType);

  bool get canAnalyze => WaypointListOps.canAnalyze(waypoints);

  bool get canSave =>
      WaypointListOps.canSave(name: routeName, waypoints: waypoints);

  Map<String, dynamic> preferencesJson() => {
        'avoidMotorways': avoidMotorways,
      };

  Map<String, dynamic> planRequestBody() {
    final body = <String, dynamic>{
      'planningMode': planningMode.apiValue,
      'durationMin': durationMin,
      'preferences': preferencesJson(),
    };
    final when = leaveNow && planningMode == PlanningMode.departure
        ? DateTime.now().toUtc()
        : anchorAt.toUtc();
    if (planningMode == PlanningMode.arrival) {
      body['arrivalAt'] = when.toIso8601String();
    } else {
      body['departureAt'] = when.toIso8601String();
    }
    return body;
  }

  Map<String, dynamic> routeUpsertBody() => {
        'name': routeName.trim().isEmpty ? 'Ride plan' : routeName.trim(),
        'activityType': activityType,
        'waypoints': WaypointListOps.toApiWaypoints(waypoints),
        'typicalDurationMin': durationMin,
        'preferences': preferencesJson(),
        if (roundTrip || WaypointListOps.looksLikeRoundTrip(waypoints))
          'routeKind': 'loop',
      };

  Map<String, String> recommendQuery(String routeId, String departureAt) {
    return recommendationQuery(
      activityType: activityType,
      routeId: routeId,
      departureAt: departureAt,
      inputs: inputs,
    );
  }

  RidePlannerState copyWith({
    String? routeId,
    String? routeName,
    List<WaypointDraft>? waypoints,
    PlanningMode? planningMode,
    DateTime? anchorAt,
    bool? leaveNow,
    bool? roundTrip,
    bool? avoidMotorways,
    int? durationMin,
    String? activityType,
    ActivityPlanningInputs? inputs,
    bool clearRouteId = false,
  }) {
    return RidePlannerState(
      routeId: clearRouteId ? null : (routeId ?? this.routeId),
      routeName: routeName ?? this.routeName,
      waypoints: waypoints ?? this.waypoints,
      planningMode: planningMode ?? this.planningMode,
      anchorAt: anchorAt ?? this.anchorAt,
      leaveNow: leaveNow ?? this.leaveNow,
      roundTrip: roundTrip ?? this.roundTrip,
      avoidMotorways: avoidMotorways ?? this.avoidMotorways,
      durationMin: durationMin ?? this.durationMin,
      activityType: activityType ?? this.activityType,
      inputs: inputs ?? this.inputs,
    );
  }
}

ResolvedPlace currentLocationPlace(
  double lat,
  double lon, {
  String label = 'Current location',
}) =>
    ResolvedPlace(
      providerPlaceId: 'device:$lat,$lon',
      label: label,
      lat: lat,
      lon: lon,
    );
