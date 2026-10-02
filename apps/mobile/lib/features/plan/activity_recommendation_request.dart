import 'package:flutter/material.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/ui_labels.dart';

/// Explicit effort already accepted by the cycling and cross-country engines.
enum RideIntensity {
  easy,
  steady,
  hard;

  String get apiValue => name;
}

/// Alpine/snowboard exposure modes accepted by `exposure` on GET /recommend.
enum AlpineExposureMode {
  lift,
  hike,
  base;

  String get apiValue => name;
}

/// Cross-country tag. Omitted from the request when the user leaves it unset.
enum XcSkiStyle {
  classic,
  skate;

  String get apiValue => name;
}

/// Inputs the completed foundations already accept. Nothing else is offered.
class ActivityPlanningInputs {
  const ActivityPlanningInputs({
    this.intensity = RideIntensity.steady,
    this.exposure = AlpineExposureMode.lift,
    this.style,
  });

  final RideIntensity intensity;
  final AlpineExposureMode exposure;
  final XcSkiStyle? style;

  ActivityPlanningInputs copyWith({
    RideIntensity? intensity,
    AlpineExposureMode? exposure,
    XcSkiStyle? style,
    bool clearStyle = false,
  }) {
    return ActivityPlanningInputs(
      intensity: intensity ?? this.intensity,
      exposure: exposure ?? this.exposure,
      style: clearStyle ? null : (style ?? this.style),
    );
  }
}

/// Minutes used when road geometry does not supply a duration.
///
/// Alpine uses the server fallback of 240. Cross-country uses the engine
/// default of 120. Motorcycle and cycling keep the existing 30-minute default.
int defaultPlanningDurationMin(String activityType) {
  switch (activityType) {
    case 'alpine_skiing':
    case 'snowboarding':
      return 240;
    case 'xc_skiing':
      return 120;
    default:
      return 30;
  }
}

/// Alpine and snowboard use one or more places, not a start/destination ride.
bool activityUsesSitePins(String activityType) {
  switch (activityType) {
    case 'alpine_skiing':
    case 'snowboarding':
      return true;
    default:
      return false;
  }
}

/// Road and ski-line activities need two points. A mountain site needs one.
int minimumPlanningWaypoints(String activityType) {
  return activityUsesSitePins(activityType) ? 1 : 2;
}

/// Road preview is for motorcycle and cycling. Alpine sites and a cross-country
/// line are not a driving route.
bool activityUsesRoadPreview(String activityType) {
  switch (activityType) {
    case 'alpine_skiing':
    case 'snowboarding':
    case 'xc_skiing':
      return false;
    default:
      return true;
  }
}

/// Query string for GET /recommend. Motorcycle keeps route id and departure only.
Map<String, String> recommendationQuery({
  required String activityType,
  required String routeId,
  required String departureAt,
  ActivityPlanningInputs inputs = const ActivityPlanningInputs(),
}) {
  final query = <String, String>{
    'routeId': routeId,
    'departureAt': departureAt,
  };
  switch (activityType) {
    case 'cycling':
      query['intensity'] = inputs.intensity.apiValue;
    case 'alpine_skiing':
    case 'snowboarding':
      query['exposure'] = inputs.exposure.apiValue;
    case 'xc_skiing':
      query['intensity'] = inputs.intensity.apiValue;
      final style = inputs.style;
      if (style != null) {
        query['style'] = style.apiValue;
      }
  }
  return query;
}

/// Effort, exposure, and style controls for activities that already accept them.
class ActivityPlanningControls extends StatelessWidget {
  const ActivityPlanningControls({
    super.key,
    required this.activityType,
    required this.inputs,
    required this.onChanged,
  });

  final String activityType;
  final ActivityPlanningInputs inputs;
  final ValueChanged<ActivityPlanningInputs> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final showIntensity =
        activityType == 'cycling' || activityType == 'xc_skiing';
    final showExposure =
        activityType == 'alpine_skiing' || activityType == 'snowboarding';
    final showStyle = activityType == 'xc_skiing';
    if (!showIntensity && !showExposure && !showStyle) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showIntensity) ...[
          Text(l10n.plannerIntensity),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final value in RideIntensity.values)
                ChoiceChip(
                  label: Text(intensityLabel(l10n, value.apiValue)),
                  selected: inputs.intensity == value,
                  onSelected: (_) =>
                      onChanged(inputs.copyWith(intensity: value)),
                ),
            ],
          ),
          const SizedBox(height: 12),
        ],
        if (showExposure) ...[
          Text(l10n.plannerExposure),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final value in AlpineExposureMode.values)
                ChoiceChip(
                  label: Text(exposureModeLabel(l10n, value.apiValue)),
                  selected: inputs.exposure == value,
                  onSelected: (_) =>
                      onChanged(inputs.copyWith(exposure: value)),
                ),
            ],
          ),
          const SizedBox(height: 12),
        ],
        if (showStyle) ...[
          Text(l10n.plannerStyle),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ChoiceChip(
                label: Text(l10n.plannerStyleUnspecified),
                selected: inputs.style == null,
                onSelected: (_) => onChanged(inputs.copyWith(clearStyle: true)),
              ),
              for (final value in XcSkiStyle.values)
                ChoiceChip(
                  label: Text(xcStyleLabel(l10n, value.apiValue)),
                  selected: inputs.style == value,
                  onSelected: (_) => onChanged(inputs.copyWith(style: value)),
                ),
            ],
          ),
          const SizedBox(height: 12),
        ],
      ],
    );
  }
}
