import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/state/activity_context.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:motorcycle_clothing/widgets/common.dart';

class ActivityChooserScreen extends StatelessWidget {
  const ActivityChooserScreen({super.key, required this.onChosen});

  final ValueChanged<AppActivity> onChosen;

  @override
  Widget build(BuildContext context) {
    final activity = context.watch<ActivityContext>();
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
                  'What are you doing today?',
                  style: GoogleFonts.sourceSerif4(
                    fontSize: 26,
                    color: AppTheme.asphalt,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Default: ${activity.defaultActivity.label}',
                  style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.9)),
                ),
                const SizedBox(height: 24),
                ...AppActivity.selectable.map((a) {
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
                                a.label,
                                style: const TextStyle(fontSize: 18),
                              ),
                            ),
                            if (isDefault)
                              Text(
                                'DEFAULT',
                                style: GoogleFonts.barlowCondensed(
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.amber,
                                ),
                              ),
                            if (!a.hasRecommendationEngine)
                              const Padding(
                                padding: EdgeInsets.only(left: 8),
                                child: Text('Soon', style: TextStyle(fontSize: 12)),
                              ),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
                const Spacer(),
                Text(
                  'Changing today’s activity does not change your saved default.',
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
