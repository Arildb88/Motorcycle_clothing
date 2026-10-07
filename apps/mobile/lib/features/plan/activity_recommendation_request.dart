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

/// Inputs the completed foundations already accept, plus optional motorcycle basics.
class ActivityPlanningInputs {
  const ActivityPlanningInputs({
    this.intensity = RideIntensity.steady,
    this.exposure = AlpineExposureMode.lift,
    this.style,
    this.basicUpper = const [],
    this.basicLower = const [],
  });

  final RideIntensity intensity;
  final AlpineExposureMode exposure;
  final XcSkiStyle? style;

  /// Everyday clothes under motorcycle gear. Empty is the explicit none state.
  final List<String> basicUpper;
  final List<String> basicLower;

  ActivityPlanningInputs copyWith({
    RideIntensity? intensity,
    AlpineExposureMode? exposure,
    XcSkiStyle? style,
    List<String>? basicUpper,
    List<String>? basicLower,
    bool clearStyle = false,
  }) {
    return ActivityPlanningInputs(
      intensity: intensity ?? this.intensity,
      exposure: exposure ?? this.exposure,
      style: clearStyle ? null : (style ?? this.style),
      basicUpper: basicUpper ?? this.basicUpper,
      basicLower: basicLower ?? this.basicLower,
    );
  }
}

/// Canonical order for the motorcycle basic-layer query.
const basicUpperOrder = [
  't_shirt',
  'wool_base_top',
  'thin_sweater',
  'thick_sweater',
];

const basicLowerOrder = ['wool_base_bottom', 'jeans', 'joggers'];

const _upperWarmth = {
  't_shirt': 1,
  'thin_sweater': 2,
  'wool_base_top': 2,
  'thick_sweater': 3,
};

const _lowerWarmth = {'wool_base_bottom': 2, 'jeans': 1, 'joggers': 2};

const _upperBase = {'t_shirt', 'wool_base_top'};
const _upperSweater = {'thin_sweater', 'thick_sweater'};
const _lowerBase = {'wool_base_bottom'};
const _lowerPants = {'jeans', 'joggers'};

/// Keeps one piece per role, preferring the warmer credit, in canonical order.
List<String> normalizeBasicUpper(Iterable<String> raw) {
  return _normalizeRoles(raw, basicUpperOrder, _upperWarmth, [
    _upperBase,
    _upperSweater,
  ]);
}

List<String> normalizeBasicLower(Iterable<String> raw) {
  return _normalizeRoles(raw, basicLowerOrder, _lowerWarmth, [
    _lowerBase,
    _lowerPants,
  ]);
}

List<String> toggleBasicPiece(
  List<String> current,
  String piece, {
  required bool upper,
}) {
  if (piece == 'none') return const [];
  final group = upper ? _upperGroup(piece) : _lowerGroup(piece);
  final next = [...current];
  if (next.contains(piece)) {
    next.remove(piece);
  } else {
    next.removeWhere(group.contains);
    next.add(piece);
  }
  return upper ? normalizeBasicUpper(next) : normalizeBasicLower(next);
}

Set<String> _upperGroup(String piece) {
  if (_upperBase.contains(piece)) return _upperBase;
  if (_upperSweater.contains(piece)) return _upperSweater;
  return {piece};
}

Set<String> _lowerGroup(String piece) {
  if (_lowerBase.contains(piece)) return _lowerBase;
  if (_lowerPants.contains(piece)) return _lowerPants;
  return {piece};
}

List<String> _normalizeRoles(
  Iterable<String> raw,
  List<String> order,
  Map<String, int> warmth,
  List<Set<String>> groups,
) {
  final selected = raw.where(order.contains).toSet();
  final kept = <String>{};
  for (final group in groups) {
    String? best;
    var bestWarmth = -1;
    for (final piece in group) {
      if (!selected.contains(piece)) continue;
      final value = warmth[piece] ?? 0;
      if (value > bestWarmth) {
        best = piece;
        bestWarmth = value;
      }
    }
    if (best != null) kept.add(best);
  }
  return [
    for (final piece in order)
      if (kept.contains(piece)) piece,
  ];
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

/// Query string for GET /recommend.
///
/// Motorcycle sends route, departure, and optional basic under-layers.
/// An empty selection is omitted so none stays a valid request.
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
    case 'motorcycle':
      final upper = normalizeBasicUpper(inputs.basicUpper);
      final lower = normalizeBasicLower(inputs.basicLower);
      if (upper.isNotEmpty) query['basicUpper'] = upper.join(',');
      if (lower.isNotEmpty) query['basicLower'] = lower.join(',');
    case 'cycling':
      query['intensity'] = inputs.intensity.apiValue;
    case 'alpine_skiing':
    case 'snowboarding':
      // Lift-assisted resort sessions. A stored hike or base choice is not sent.
      query['exposure'] = AlpineExposureMode.lift.apiValue;
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
    if (activityType == 'motorcycle') {
      return _MotorcycleBasicControls(inputs: inputs, onChanged: onChanged);
    }
    final showIntensity =
        activityType == 'cycling' || activityType == 'xc_skiing';
    final showStyle = activityType == 'xc_skiing';
    if (!showIntensity && !showStyle) {
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

class _MotorcycleBasicControls extends StatelessWidget {
  const _MotorcycleBasicControls({
    required this.inputs,
    required this.onChanged,
  });

  final ActivityPlanningInputs inputs;
  final ValueChanged<ActivityPlanningInputs> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final upper = normalizeBasicUpper(inputs.basicUpper);
    final lower = normalizeBasicLower(inputs.basicLower);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(l10n.plannerBasicClothing),
        const SizedBox(height: 4),
        Text(
          l10n.plannerBasicHint,
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 8),
        _BasicLayerDropdown(
          fieldKey: const Key('mc-basic-upper'),
          label: l10n.plannerBasicUpper,
          noneLabel: l10n.plannerBasicNone,
          options: [
            for (final id in basicUpperOrder)
              (id: id, label: basicPieceLabel(l10n, id)),
          ],
          selected: upper,
          onSelected: (piece) => onChanged(
            inputs.copyWith(
              basicUpper: toggleBasicPiece(upper, piece, upper: true),
            ),
          ),
        ),
        const SizedBox(height: 12),
        _BasicLayerDropdown(
          fieldKey: const Key('mc-basic-lower'),
          label: l10n.plannerBasicLower,
          noneLabel: l10n.plannerBasicNone,
          options: [
            for (final id in basicLowerOrder)
              (id: id, label: basicPieceLabel(l10n, id)),
          ],
          selected: lower,
          onSelected: (piece) => onChanged(
            inputs.copyWith(
              basicLower: toggleBasicPiece(lower, piece, upper: false),
            ),
          ),
        ),
      ],
    );
  }
}

class _BasicLayerDropdown extends StatelessWidget {
  const _BasicLayerDropdown({
    required this.fieldKey,
    required this.label,
    required this.noneLabel,
    required this.options,
    required this.selected,
    required this.onSelected,
  });

  final Key fieldKey;
  final String label;
  final String noneLabel;
  final List<({String id, String label})> options;
  final List<String> selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final summary = selected.isEmpty
        ? noneLabel
        : selected
              .map(
                (id) => options.firstWhere((option) => option.id == id).label,
              )
              .join(' + ');
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth.isFinite
            ? constraints.maxWidth
            : 320.0;
        return PopupMenuButton<String>(
          key: fieldKey,
          tooltip: label,
          onSelected: onSelected,
          itemBuilder: (context) => [
            CheckedPopupMenuItem<String>(
              value: 'none',
              checked: selected.isEmpty,
              child: Text(noneLabel),
            ),
            for (final option in options)
              CheckedPopupMenuItem<String>(
                value: option.id,
                checked: selected.contains(option.id),
                child: Text(option.label),
              ),
          ],
          child: SizedBox(
            width: width,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
              child: InputDecorator(
                decoration: InputDecoration(labelText: label),
                child: Row(
                  children: [
                    Expanded(child: Text(summary)),
                    const Icon(Icons.arrow_drop_down),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
