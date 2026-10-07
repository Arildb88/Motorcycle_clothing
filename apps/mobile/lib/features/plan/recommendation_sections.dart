import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:motorcycle_clothing/features/plan/recommendation_presentation.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/reason_lookup.dart';
import 'package:motorcycle_clothing/l10n/ui_labels.dart';
import 'package:motorcycle_clothing/state/locale_controller.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

/// Route, weather, and elevation facts already present on the payload.
List<Widget> recommendationContextWidgets(
  BuildContext context,
  RecommendationPresentation view, {
  String Function(num celsius)? formatTemp,
}) {
  final l10n = AppLocalizations.of(context);
  final reasonL10n = AppLocalizationsReasonLookup(l10n);
  final lines = <Widget>[];

  if (view.hasElevationRange) {
    final min = view.elevationMinM!;
    final max = view.elevationMaxM!;
    lines.add(
      Padding(
        padding: const EdgeInsets.only(top: 8),
        child: Text(
          min == max
              ? l10n.elevationSingle('$min')
              : l10n.elevationRange('$min', '$max'),
        ),
      ),
    );
  }

  for (final site in view.sites) {
    lines.add(
      Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Text(_siteLine(l10n, site, formatTemp)),
      ),
    );
  }

  if (view.elevationAttribution != null) {
    lines.add(
      Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Text(
          l10n.elevationAttribution(view.elevationAttribution!),
          style: TextStyle(
            color: AppTheme.steel.withValues(alpha: 0.85),
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  for (final code in view.contextNotes) {
    lines.add(
      Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Text(localizeReasonCode(code, reasonL10n)),
      ),
    );
  }

  if (lines.isEmpty) return const [];
  return [
    KeyedSubtree(
      key: const Key('recommendation-context'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: lines,
      ),
    ),
  ];
}

/// Kit reasons, limits, and the confidence level. Each block is omitted when
/// the payload has nothing for it.
List<Widget> recommendationExplanationWidgets(
  BuildContext context,
  RecommendationPresentation view, {
  bool showConfidenceLevel = true,
  bool resortSnowLimits = false,
}) {
  final l10n = AppLocalizations.of(context);
  final reasonL10n = AppLocalizationsReasonLookup(l10n);
  final blocks = <Widget>[];

  if (view.kitReasons.isNotEmpty) {
    blocks.add(
      _reasonBlock(
        key: const Key('recommendation-reasons'),
        title: l10n.reasonsSection,
        lines: view.kitReasons
            .map((code) => localizeReasonCode(code, reasonL10n))
            .toList(),
      ),
    );
  }

  final limits = visibleLimitReasonCodes(
    view.limitReasons,
    resortSnow: resortSnowLimits,
  );
  if (limits.isNotEmpty) {
    blocks.add(
      _reasonBlock(
        key: const Key('recommendation-limits'),
        title: l10n.limitsSection,
        lines: limits
            .map((code) => localizeReasonCode(code, reasonL10n))
            .toList(),
      ),
    );
  }

  if (showConfidenceLevel && view.confidenceLevel != null) {
    blocks.add(
      Padding(
        padding: const EdgeInsets.only(top: 16),
        child: Column(
          key: const Key('recommendation-confidence'),
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.confidenceLabel,
              style: GoogleFonts.barlowCondensed(
                fontSize: 20,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 6),
            Text(confidenceValue(l10n, view.confidenceLevel!)),
          ],
        ),
      ),
    );
  }

  return blocks;
}

/// One wear or pack row, with the reason codes the API attached to it.
Widget recommendationKitEntry({
  required BuildContext context,
  required Map<String, dynamic> item,
  required IconData icon,
  required int index,
}) {
  final l10n = AppLocalizations.of(context);
  final reasonL10n = AppLocalizationsReasonLookup(l10n);
  final because = kitBecauseCodes(item)
      .map((code) => localizeReasonCode(code, reasonL10n))
      .toList();
  return Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(kitLine(l10n, item), style: const TextStyle(fontSize: 17)),
              if (because.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Column(
                    key: Key('kit-because-$index'),
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final line in because)
                        Text(
                          line,
                          style: TextStyle(
                            color: AppTheme.steel.withValues(alpha: 0.9),
                            fontSize: 14,
                          ),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    ),
  );
}

Widget recommendationSectionTitle(String text) {
  return Text(
    text,
    style: GoogleFonts.barlowCondensed(
      fontSize: 22,
      fontWeight: FontWeight.w600,
    ),
  );
}

String _siteLine(
  AppLocalizations l10n,
  ElevationSiteView site,
  String Function(num celsius)? formatTemp,
) {
  final parts = <String>[_siteLabel(l10n, site.role)];
  if (site.airTempC != null) {
    parts.add(
      formatTemp != null
          ? formatTemp(site.airTempC!)
          : '${site.airTempC!.toStringAsFixed(0)}°C',
    );
  }
  if (site.elevationM != null) {
    parts.add('${site.elevationM} m');
  }
  if (site.estimated) {
    parts.add(l10n.elevationEstimated);
  }
  return parts.join(' · ');
}

String _siteLabel(AppLocalizations l10n, String role) {
  switch (role) {
    case 'base':
      return l10n.siteBase;
    case 'mid':
      return l10n.siteMid;
    case 'upper':
      return l10n.siteUpper;
    default:
      return role;
  }
}

Widget _reasonBlock({
  required Key key,
  required String title,
  required List<String> lines,
}) {
  return Padding(
    padding: const EdgeInsets.only(top: 16),
    child: Column(
      key: key,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        recommendationSectionTitle(title),
        const SizedBox(height: 8),
        ...lines.map(
          (line) => Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text('• $line'),
          ),
        ),
      ],
    ),
  );
}
