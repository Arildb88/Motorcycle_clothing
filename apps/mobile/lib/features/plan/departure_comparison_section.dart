import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:motorcycle_clothing/utils/unit_format.dart';

/// Factual conditions for nearby departures. No departure is scored.
class DepartureComparisonSection extends StatelessWidget {
  const DepartureComparisonSection({
    super.key,
    required this.comparison,
    required this.formatter,
  });

  final Map<String, dynamic> comparison;
  final UnitFormat formatter;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final alternatives = comparison['alternatives'];
    if (alternatives is! List || alternatives.isEmpty) {
      return const SizedBox.shrink();
    }
    final variesByTime = comparison['variesByTime'] == true;

    return Column(
      key: const Key('departure-comparison'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 20),
        Text(
          l10n.departureCompareTitle,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 4),
        Text(
          l10n.departureCompareHint,
          style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.9)),
        ),
        if (!variesByTime) ...[
          const SizedBox(height: 4),
          Text(
            l10n.departureCompareStatic,
            style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.9)),
          ),
        ],
        const SizedBox(height: 8),
        ...alternatives.whereType<Map>().map((raw) {
          final alternative = Map<String, dynamic>.from(raw);
          return _DepartureAlternative(
            alternative: alternative,
            formatter: formatter,
          );
        }),
      ],
    );
  }
}

class _DepartureAlternative extends StatelessWidget {
  const _DepartureAlternative({
    required this.alternative,
    required this.formatter,
  });

  final Map<String, dynamic> alternative;
  final UnitFormat formatter;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final departure = _formatWhen(context, alternative['departureAt']);
    final selected = alternative['selected'] == true;
    final rawConditions = alternative['conditions'];
    final conditions = rawConditions is Map
        ? Map<String, dynamic>.from(rawConditions)
        : null;
    final shown = alternative['available'] == true ? conditions : null;
    final missing = alternative['missingAt'];

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            selected ? '${l10n.departureCompareYours} · $departure' : departure,
          ),
          if (shown == null)
            Text(
              l10n.departureCompareUnavailable,
              style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.9)),
            )
          else ...[
            Text(_forecastLine(context, l10n, shown)),
            Text(_conditionLine(l10n, shown)),
          ],
          if (missing is List)
            ...missing.whereType<String>().map(
              (time) => Text(
                l10n.departureCompareMissing(_formatWhen(context, time)),
                style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.9)),
              ),
            ),
        ],
      ),
    );
  }

  String _forecastLine(
    BuildContext context,
    AppLocalizations l10n,
    Map<String, dynamic> conditions,
  ) {
    final from = _formatWhen(context, conditions['forecastFrom']);
    final to = _formatWhen(context, conditions['forecastTo']);
    if (from == to) return l10n.departureCompareForecastAt(from);
    return l10n.departureCompareForecastSpan(from, to);
  }

  String _conditionLine(
    AppLocalizations l10n,
    Map<String, dynamic> conditions,
  ) {
    final parts = <String>[
      if (conditions['minTempC'] is num && conditions['maxTempC'] is num)
        l10n.analysisTempChip(
          formatter.temperatureRangeFromC(
            conditions['minTempC'] as num,
            conditions['maxTempC'] as num,
          ),
        ),
      if (conditions['maxRainProbPct'] is num)
        l10n.analysisRainChip(
          '${(conditions['maxRainProbPct'] as num).toStringAsFixed(0)}%',
        ),
      if (conditions['maxPrecipMm'] is num)
        l10n.departureComparePrecip(
          '${(conditions['maxPrecipMm'] as num).toStringAsFixed(1)} mm',
        ),
      if (conditions['maxWindMs'] is num)
        l10n.analysisWindChip(
          formatter.windFromMs(conditions['maxWindMs'] as num),
        ),
    ];
    return parts.join(' · ');
  }
}

String _formatWhen(BuildContext context, Object? raw) {
  final parsed = raw is String ? DateTime.tryParse(raw) : null;
  if (parsed == null) return raw?.toString() ?? '';
  final locale = Localizations.localeOf(context).toString();
  return DateFormat.MMMd(locale).add_Hm().format(parsed.toLocal());
}
