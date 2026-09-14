import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/reason_lookup.dart';
import 'package:motorcycle_clothing/state/locale_controller.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

/// Clothing recommendation after planner "Analyze ride".
class RideAnalysisResultScreen extends StatelessWidget {
  const RideAnalysisResultScreen({super.key, required this.payload});

  final Map<String, dynamic> payload;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final reasonL10n = AppLocalizationsReasonLookup(l10n);
    final route = payload['route'] as Map<String, dynamic>? ?? const {};
    final weather = payload['weather'] as Map<String, dynamic>? ?? const {};
    final rec =
        payload['recommendation'] as Map<String, dynamic>? ?? const {};
    final wear = _asMaps(rec['wear']);
    final pack = _asMaps(rec['pack']);
    final reasons = _reasonCodes(rec);

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
          const SizedBox(height: 16),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            children: [
              if (weather['minTempC'] != null && weather['maxTempC'] != null)
                Chip(
                  label: Text(
                    'Temp ${(weather['minTempC'] as num).toStringAsFixed(0)}–${(weather['maxTempC'] as num).toStringAsFixed(0)}°C',
                  ),
                ),
              if (weather['maxRainProbPct'] != null)
                Chip(
                  label: Text(
                    'Rain ${(weather['maxRainProbPct'] as num).toStringAsFixed(0)}%',
                  ),
                ),
              if (weather['maxWindMs'] != null)
                Chip(
                  label: Text(
                    'Wind ${(weather['maxWindMs'] as num).toStringAsFixed(0)} m/s',
                  ),
                ),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            l10n.wearSection,
            style: GoogleFonts.barlowCondensed(
              fontSize: 22,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          if (wear.isEmpty)
            Text(l10n.plannerNoWearItems)
          else
            ...wear.map(
              (item) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.checkroom),
                title: Text(item['name']?.toString() ?? item.toString()),
              ),
            ),
          const SizedBox(height: 16),
          Text(
            l10n.packSection,
            style: GoogleFonts.barlowCondensed(
              fontSize: 22,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          if (pack.isEmpty)
            Text(l10n.plannerNoPackItems)
          else
            ...pack.map(
              (item) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.backpack_outlined),
                title: Text(item['name']?.toString() ?? item.toString()),
              ),
            ),
          if (reasons.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              l10n.confidenceLabel,
              style: GoogleFonts.barlowCondensed(
                fontSize: 20,
                fontWeight: FontWeight.w600,
              ),
            ),
            ...reasons.map(
              (code) => Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text('• ${localizeReasonCode(code, reasonL10n)}'),
              ),
            ),
          ],
          const SizedBox(height: 24),
          OutlinedButton(
            onPressed: () => Navigator.pop(context),
            child: Text(l10n.plannerBackToPlanner),
          ),
        ],
      ),
    );
  }

  static List<Map<String, dynamic>> _asMaps(dynamic raw) {
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  static List<String> _reasonCodes(Map<String, dynamic> rec) {
    final codes = <String>[];
    final reasons = rec['reasons'];
    if (reasons is List) {
      for (final r in reasons) {
        if (r is Map && r['code'] != null) {
          codes.add(r['code'].toString());
        } else if (r != null) {
          codes.add(r.toString());
        }
      }
    }
    final legacy = rec['reasonCodes'];
    if (codes.isEmpty && legacy is List) {
      return legacy.map((e) => e.toString()).toList();
    }
    return codes;
  }
}
