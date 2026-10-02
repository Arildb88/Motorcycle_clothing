import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/ui_labels.dart';
import 'package:motorcycle_clothing/screens/home_screen.dart';
import 'package:motorcycle_clothing/state/activity_context.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

class ActivityHomeScreen extends StatelessWidget {
  const ActivityHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final activity = context.watch<ActivityContext>().currentActivity;
    if (activity.hasRecommendationEngine) {
      return HomeScreen(key: ValueKey(activity));
    }
    return _ComingSoonHome(activity: activity);
  }
}

class _ComingSoonHome extends StatelessWidget {
  const _ComingSoonHome({required this.activity});

  final AppActivity activity;

  @override
  Widget build(BuildContext context) {
    final activityCtx = context.read<ActivityContext>();
    final l10n = AppLocalizations.of(context);
    final name = activityLabel(l10n, activity);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 56, 24, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _ActivitySwitcher(),
            const SizedBox(height: 24),
            Text(
              l10n.activityComingNext(name),
              style: GoogleFonts.sourceSerif4(fontSize: 26),
            ),
            const SizedBox(height: 12),
            Text(
              l10n.activitySharedBody,
              style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.95)),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () {
                activityCtx.setCurrentActivity(AppActivity.motorcycle);
              },
              child: Text(l10n.activityOpenMotorcycle),
            ),
            TextButton(
              onPressed: () async {
                await activityCtx.setDefaultActivity(activity);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(l10n.activityNowDefault(name)),
                    ),
                  );
                }
              },
              child: Text(l10n.activityMakeDefault(name)),
            ),
          ],
        ),
      ),
    );
  }
}

class ActivitySwitcher extends StatelessWidget {
  const ActivitySwitcher({super.key});

  @override
  Widget build(BuildContext context) => const _ActivitySwitcher();
}

class _ActivitySwitcher extends StatelessWidget {
  const _ActivitySwitcher();

  @override
  Widget build(BuildContext context) {
    final ctx = context.watch<ActivityContext>();
    final l10n = AppLocalizations.of(context);
    return PopupMenuButton<AppActivity>(
      onSelected: (a) => ctx.setCurrentActivity(a),
      itemBuilder: (context) => AppActivity.sessionChoices
          .map(
            (a) => PopupMenuItem(
              value: a,
              child: Row(
                children: [
                  Expanded(child: Text(activityLabel(l10n, a))),
                  if (a == ctx.defaultActivity)
                    Text(
                      l10n.activityDefaultBadge,
                      style: GoogleFonts.barlowCondensed(
                        color: AppTheme.amber,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                ],
              ),
            ),
          )
          .toList(),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            activityLabel(l10n, ctx.currentActivity),
            style: GoogleFonts.barlowCondensed(
              fontSize: 28,
              fontWeight: FontWeight.w600,
            ),
          ),
          const Icon(Icons.arrow_drop_down),
        ],
      ),
    );
  }
}
