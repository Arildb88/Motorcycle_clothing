import 'package:flutter/material.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/ui_labels.dart';
import 'package:motorcycle_clothing/screens/feedback_sheet.dart';
import 'package:motorcycle_clothing/utils/unit_format.dart';

final commuteClockPattern = RegExp(r'^([01]\d|2[0-3]):[0-5]\d$');
final commuteDatePattern = RegExp(r'^\d{4}-\d{2}-\d{2}$');

/// Body for creating or updating a saved route. Commute times are included
/// only for a motorcycle commute. Ordinary routes stay a single direction.
Map<String, dynamic> savedRouteBody({
  required String name,
  String? description,
  String? category,
  required bool isFavorite,
  required String activityType,
  required List<Map<String, dynamic>> waypoints,
  required int typicalDurationMin,
  String? outboundDepartureLocal,
  String? returnDepartureLocal,
}) {
  final commute = activityType == 'motorcycle' && category == 'commute';
  return {
    'name': name,
    if (description != null && description.isNotEmpty) 'description': description,
    'category': ?category,
    'isFavorite': isFavorite,
    'activityType': activityType,
    'waypoints': waypoints,
    'typicalDurationMin': typicalDurationMin,
    if (commute) ...{
      'outboundDepartureLocal': outboundDepartureLocal,
      'returnDepartureLocal': returnDepartureLocal,
    },
  };
}

Map<String, dynamic> commutePlanBody({
  required String date,
  required String outboundTime,
  required String returnTime,
  required bool returnNextDay,
}) {
  return {
    'date': date,
    'outboundTime': outboundTime,
    'returnTime': returnTime,
    'returnNextDay': returnNextDay,
  };
}

String initialCommuteDate(DateTime now) {
  final local = now.toLocal();
  final month = local.month.toString().padLeft(2, '0');
  final day = local.day.toString().padLeft(2, '0');
  return '${local.year}-$month-$day';
}

class CommuteScheduleFields extends StatelessWidget {
  const CommuteScheduleFields({
    super.key,
    this.date,
    required this.outbound,
    required this.returning,
    required this.nextDay,
    required this.onNextDay,
    this.showNextDay = true,
  });

  final TextEditingController? date;
  final TextEditingController outbound;
  final TextEditingController returning;
  final bool nextDay;
  final ValueChanged<bool> onNextDay;
  final bool showNextDay;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(l10n.commuteTimesTitle),
        Text(l10n.commuteTimesHint),
        if (date != null) ...[
          const SizedBox(height: 8),
          TextField(
            key: const Key('commute-date'),
            controller: date,
            decoration: InputDecoration(labelText: l10n.commuteDate),
          ),
        ],
        const SizedBox(height: 8),
        TextField(
          key: const Key('commute-outbound-time'),
          controller: outbound,
          decoration: InputDecoration(labelText: l10n.commuteOutboundTime),
        ),
        const SizedBox(height: 8),
        TextField(
          key: const Key('commute-return-time'),
          controller: returning,
          decoration: InputDecoration(labelText: l10n.commuteReturnTime),
        ),
        if (showNextDay)
          SwitchListTile(
            key: const Key('commute-next-day'),
            contentPadding: EdgeInsets.zero,
            title: Text(l10n.commuteNextDay),
            value: nextDay,
            onChanged: onNextDay,
          ),
      ],
    );
  }
}

class CommuteResultView extends StatelessWidget {
  CommuteResultView({
    super.key,
    required this.payload,
    UnitFormat? units,
    this.onFeedback,
  }) : units = units ?? UnitFormat();

  final Map<String, dynamic> payload;
  final UnitFormat units;
  final void Function(Map<String, dynamic> legPayload)? onFeedback;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final legs = (payload['legs'] as List?) ?? const [];
    final preparation = payload['preparation'];
    final prep = preparation is Map
        ? Map<String, dynamic>.from(preparation)
        : const <String, dynamic>{};
    return Column(
      key: const Key('commute-block'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final code in _codes(payload['differences']))
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(_difference(l10n, code)),
          ),
        Text(l10n.commuteForecastNote),
        const SizedBox(height: 12),
        for (final leg in legs.whereType<Map>())
          _LegSection(
            leg: Map<String, dynamic>.from(leg),
            units: units,
            onFeedback: onFeedback,
            route: payload['route'],
          ),
        const SizedBox(height: 8),
        _KitBlock(
          title: l10n.commuteWearHeading,
          items: prep['wear'],
          sectionKey: const Key('commute-wear'),
        ),
        _KitBlock(
          title: l10n.commutePackHeading,
          items: prep['pack'],
          sectionKey: const Key('commute-pack'),
        ),
        _KitBlock(
          title: l10n.commuteAdjustmentHeading,
          items: prep['returnAdjustments'],
          sectionKey: const Key('commute-adjustments'),
        ),
      ],
    );
  }
}

class _LegSection extends StatelessWidget {
  const _LegSection({
    required this.leg,
    required this.units,
    required this.route,
    this.onFeedback,
  });

  final Map<String, dynamic> leg;
  final UnitFormat units;
  final dynamic route;
  final void Function(Map<String, dynamic> legPayload)? onFeedback;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final outbound = leg['leg'] == 'outbound';
    final title =
        outbound ? l10n.commuteOutboundSection : l10n.commuteReturnSection;
    final available = leg['available'] == true;
    final weather = leg['weather'];
    final weatherMap = weather is Map
        ? Map<String, dynamic>.from(weather)
        : null;
    return Padding(
      key: Key(outbound ? 'commute-leg-outbound' : 'commute-leg-return'),
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600)),
          Text('${leg['startLabel'] ?? ''} → ${leg['endLabel'] ?? ''}'),
          Text('${leg['departureLocal'] ?? ''} · ${leg['civilDate'] ?? ''}'),
          if (leg['arrivalLocal'] != null)
            Text(l10n.commuteArrival('${leg['arrivalLocal']}')),
          if (!available)
            Text(
              l10n.commuteUnavailable,
              key: const Key('commute-return-unavailable'),
            )
          else if (weatherMap != null) ...[
            Text(
              units.temperatureRangeFromC(
                weatherMap['minTempC'] as num? ?? weatherMap['maxTempC'] as num? ?? 0,
                weatherMap['maxTempC'] as num? ?? weatherMap['minTempC'] as num? ?? 0,
              ),
              key: Key(outbound ? 'commute-temp-outbound' : 'commute-temp-return'),
            ),
            Text(
              l10n.commuteRain(
                '${weatherMap['maxPrecipMm']}',
                '${weatherMap['maxRainProbPct']}',
              ),
            ),
            Text(l10n.commuteWind('${weatherMap['maxWindMs']} m/s')),
            if (leg['recommendation'] is Map)
              Text(_confidence(l10n, Map<String, dynamic>.from(leg['recommendation'] as Map))),
          ],
          if (available)
            TextButton(
              key: Key(outbound ? 'commute-feedback-outbound' : 'commute-feedback-return'),
              onPressed: () {
                final recommendation = leg['recommendation'];
                final body = <String, dynamic>{
                  'planId': leg['planId'],
                  'departureAt': leg['departureAt'],
                  'weather': weatherMap ?? <String, dynamic>{},
                  'recommendation': recommendation is Map
                      ? Map<String, dynamic>.from(recommendation)
                      : <String, dynamic>{},
                  'route': route is Map
                      ? Map<String, dynamic>.from(route)
                      : <String, dynamic>{'activityType': 'motorcycle'},
                };
                if (onFeedback != null) {
                  onFeedback!(body);
                } else {
                  showFeedbackSheet(context, body);
                }
              },
              child: Text(l10n.commuteLegFeedback),
            ),
        ],
      ),
    );
  }
}

class _KitBlock extends StatelessWidget {
  const _KitBlock({
    required this.title,
    required this.items,
    required this.sectionKey,
  });

  final String title;
  final dynamic items;
  final Key sectionKey;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final rows = items is List ? items.whereType<Map>().toList() : const <Map>[];
    if (rows.isEmpty) return const SizedBox.shrink();
    return Padding(
      key: sectionKey,
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
          for (final row in rows)
            Text(kitLine(l10n, Map<String, dynamic>.from(row))),
        ],
      ),
    );
  }
}

List<String> _codes(dynamic raw) {
  if (raw is! List) return const [];
  return raw.map((code) => code.toString()).toList();
}

String _difference(AppLocalizations l10n, String code) {
  switch (code) {
    case 'DRY_MORNING_RAIN_RETURN':
      return l10n.commuteDiffDryRain;
    case 'WARM_OUTBOUND_COLD_RETURN':
      return l10n.commuteDiffWarmCold;
    default:
      return '';
  }
}

String _confidence(AppLocalizations l10n, Map<String, dynamic> recommendation) {
  final confidence = recommendation['confidence'];
  final level = confidence is Map ? confidence['level']?.toString() : null;
  final label = switch (level) {
    'HIGH' => l10n.confidenceHigh,
    'MEDIUM' => l10n.confidenceMedium,
    'LOW' => l10n.confidenceLow,
    _ => level ?? '',
  };
  return '${l10n.confidenceLabel}: $label';
}

/// One-way planner requests keep a single departure and no return clock.
bool commuteFieldsApply(String? category, String activityType) {
  return activityType == 'motorcycle' && category == 'commute';
}
