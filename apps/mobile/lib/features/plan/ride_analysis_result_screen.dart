import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/features/plan/departure_comparison_section.dart';
import 'package:motorcycle_clothing/features/plan/recommendation_presentation.dart';
import 'package:motorcycle_clothing/features/plan/recommendation_sections.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/ui_labels.dart';
import 'package:motorcycle_clothing/state/unit_preferences_controller.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:motorcycle_clothing/screens/feedback_sheet.dart';

final _metricUnits = UnitPreferencesController();

/// Clothing recommendation after planner "Analyze ride".
class RideAnalysisResultScreen extends StatelessWidget {
  const RideAnalysisResultScreen({super.key, required this.payload});

  final Map<String, dynamic> payload;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final units = context.watch<UnitPreferencesController?>();
    final fmt = (units ?? _metricUnits).formatter(
      localeName: Localizations.localeOf(context).toString(),
    );
    final route = payload['route'] as Map<String, dynamic>? ?? const {};
    final weather = payload['weather'] as Map<String, dynamic>? ?? const {};
    final recommendation =
        payload['recommendation'] as Map<String, dynamic>? ?? const {};
    final weatherBlocked = _weatherBlocksRecommendation(weather, recommendation);
    final view = presentRecommendation(payload);
    final wear = view.wear;
    final pack = view.pack;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          l10n.plannerAnalysisTitle,
          style: GoogleFonts.barlowCondensed(fontWeight: FontWeight.w600),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
        children: [
          Text(
            route['name']?.toString() ?? l10n.plannerDefaultRouteName,
            style: GoogleFonts.barlowCondensed(
              fontSize: 32,
              fontWeight: FontWeight.w600,
              color: AppTheme.asphalt,
            ),
          ),
          Text(
            l10n.plannerAnalysisSubtitle,
            style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.9)),
          ),
          if (view.routeLine != null) ...[
            const SizedBox(height: 8),
            Text(
              view.routeLine!,
              style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.9)),
            ),
          ],
          if (recommendationInputSummary(l10n, payload['comfort']) != null) ...[
            const SizedBox(height: 8),
            Text(
              recommendationInputSummary(l10n, payload['comfort'])!,
              style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.95)),
            ),
          ],
          const SizedBox(height: 16),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            children: [
              if (weather['minTempC'] != null && weather['maxTempC'] != null)
                Chip(
                  label: Text(
                    l10n.analysisTempChip(
                      fmt.temperatureRangeFromC(
                        weather['minTempC'] as num,
                        weather['maxTempC'] as num,
                      ),
                    ),
                  ),
                ),
              if (view.exposureC != null)
                Chip(
                  label: Text(
                    '${l10n.metricExposure} ${fmt.temperatureFromC(view.exposureC!)}',
                  ),
                ),
              if (weather['maxRainProbPct'] != null)
                Chip(
                  label: Text(
                    l10n.analysisRainChip(
                      '${(weather['maxRainProbPct'] as num).toStringAsFixed(0)}%',
                    ),
                  ),
                ),
              if (weather['maxWindMs'] != null)
                Chip(
                  label: Text(
                    l10n.analysisWindChip(
                      fmt.windFromMs(weather['maxWindMs'] as num),
                    ),
                  ),
                ),
            ],
          ),
          if (payload['departureComparison'] is Map)
            DepartureComparisonSection(
              comparison: Map<String, dynamic>.from(
                payload['departureComparison'] as Map,
              ),
              formatter: fmt,
            ),
          ...recommendationContextWidgets(
            context,
            view,
            formatTemp: fmt.temperatureFromC,
          ),
          const SizedBox(height: 24),
          if (weatherBlocked) ...[
            Text(
              weatherUnavailableMessage(l10n, weather, recommendation),
              key: const Key('weather-unavailable'),
            ),
            const SizedBox(height: 16),
            FilledButton(
              key: const Key('weather-unavailable-retry'),
              style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: () => Navigator.pop(context),
              child: Text(l10n.weatherUnavailableRetry),
            ),
          ] else ...[
          recommendationSectionTitle(l10n.wearSection),
          const SizedBox(height: 4),
          Text(
            l10n.wearSectionHint,
            key: const Key('wear-section'),
            style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.9)),
          ),
          const SizedBox(height: 8),
          if (wear.isEmpty)
            Text(l10n.plannerNoWearItems)
          else
            ...wear.asMap().entries.map(
              (entry) => recommendationKitEntry(
                context: context,
                item: entry.value,
                icon: Icons.checkroom,
                index: entry.key,
              ),
            ),
          const SizedBox(height: 16),
          recommendationSectionTitle(l10n.packSection),
          const SizedBox(height: 4),
          Text(
            l10n.packSectionHint,
            key: const Key('pack-section'),
            style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.9)),
          ),
          const SizedBox(height: 8),
          if (pack.isEmpty)
            Text(l10n.plannerNoPackItems)
          else
            ...pack.asMap().entries.map(
              (entry) => recommendationKitEntry(
                context: context,
                item: entry.value,
                icon: Icons.backpack_outlined,
                index: wear.length + entry.key,
              ),
            ),
          ...recommendationExplanationWidgets(context, view),
          const SizedBox(height: 24),
          FilledButton.tonal(
            key: const Key('thermal-feedback-open'),
            style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
            onPressed: () => showFeedbackSheet(context, payload),
            child: Text(l10n.homeHowWasTheRide),
          ),
          ],
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: () => Navigator.pop(context),
            child: Text(l10n.plannerBackToPlanner),
          ),
        ],
      ),
    );
  }
}

bool _weatherBlocksRecommendation(
  Map<String, dynamic> weather,
  Map<String, dynamic> recommendation,
) {
  final weatherStatus = weather['status']?.toString();
  final recommendationStatus = recommendation['status']?.toString();
  return weatherStatus == 'unavailable' ||
      weatherStatus == 'partial' ||
      recommendationStatus == 'unavailable';
}

String weatherUnavailableMessage(
  AppLocalizations l10n,
  Map<String, dynamic> weather,
  Map<String, dynamic> recommendation,
) {
  if (weather['status']?.toString() == 'partial' ||
      recommendation['status']?.toString() == 'partial') {
    return l10n.weatherUnavailablePartial;
  }
  switch (weather['reason']?.toString() ?? recommendation['reason']?.toString()) {
    case 'configuration':
      return l10n.weatherUnavailableConfiguration;
    case 'timeout':
      return l10n.weatherUnavailableTimeout;
    case 'empty':
      return l10n.weatherUnavailableEmpty;
    case 'missing_fields':
    case 'missing':
      return l10n.weatherUnavailableMissing;
    case 'out_of_range':
      return l10n.weatherUnavailableOutOfRange;
    default:
      return l10n.weatherUnavailableProvider;
  }
}
