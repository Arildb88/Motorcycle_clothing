import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/ui_labels.dart';
import 'package:motorcycle_clothing/state/activity_context.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:motorcycle_clothing/widgets/common.dart';

class ActivityChooserScreen extends StatelessWidget {
  const ActivityChooserScreen({super.key, required this.onChosen});

  final ValueChanged<AppActivity> onChosen;

  @override
  Widget build(BuildContext context) {
    final activity = context.watch<ActivityContext>();
    final l10n = AppLocalizations.of(context);
    return AtmosphereBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const BrandMark(compact: true),
                const SizedBox(height: 12),
                Text(
                  l10n.activityWhatToday,
                  style: GoogleFonts.sourceSerif4(
                    fontSize: 26,
                    color: AppTheme.asphalt,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.activityDefaultLine(
                    activityLabel(l10n, activity.defaultActivity),
                  ),
                  style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.9)),
                ),
                const SizedBox(height: 24),
                ...AppActivity.sessionChoices.map((a) {
                  final isDefault = a == activity.defaultActivity;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: FilledButton.tonal(
                      onPressed: () => onChosen(a),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                activityLabel(l10n, a),
                                style: const TextStyle(fontSize: 18),
                              ),
                            ),
                            if (isDefault)
                              Text(
                                l10n.activityDefaultBadge,
                                style: GoogleFonts.barlowCondensed(
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.amber,
                                ),
                              ),
                            if (!a.hasRecommendationEngine)
                              Padding(
                                padding: const EdgeInsets.only(left: 8),
                                child: Text(
                                  l10n.activitySoon,
                                  style: const TextStyle(fontSize: 12),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
                const Spacer(),
                Text(
                  l10n.activityChooserHint,
                  style: TextStyle(
                    color: AppTheme.steel.withValues(alpha: 0.8),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
