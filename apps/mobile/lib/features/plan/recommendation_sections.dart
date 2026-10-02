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

  if (view.limitReasons.isNotEmpty) {
    blocks.add(
      _reasonBlock(
        key: const Key('recommendation-limits'),
        title: l10n.limitsSection,
        lines: view.limitReasons
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
