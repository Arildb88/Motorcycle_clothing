import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/screens/home_screen.dart';
import 'package:motorcycle_clothing/state/activity_context.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';

class ActivityHomeScreen extends StatelessWidget {
  const ActivityHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final activity = context.watch<ActivityContext>().currentActivity;
    if (activity == AppActivity.motorcycle) {
      return const HomeScreen();
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
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 56, 24, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _ActivitySwitcher(),
            const SizedBox(height: 24),
            Text(
              '${activity.label} recommendations are coming next.',
              style: GoogleFonts.sourceSerif4(fontSize: 26),
            ),
            const SizedBox(height: 12),
            Text(
              'Your profile and wardrobe are already shared across activities. '
              'Motorcycle recommendations are available today.',
              style: TextStyle(color: AppTheme.steel.withValues(alpha: 0.95)),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () {
                activityCtx.setCurrentActivity(AppActivity.motorcycle);
              },
              child: const Text('Open Motorcycle today'),
            ),
            TextButton(
              onPressed: () async {
                await activityCtx.setDefaultActivity(activity);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('${activity.label} set as default'),
                    ),
                  );
                }
              },
              child: Text('Make ${activity.label} my default'),
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
    return PopupMenuButton<AppActivity>(
      onSelected: (a) => ctx.setCurrentActivity(a),
      itemBuilder: (context) => AppActivity.selectable
          .map(
            (a) => PopupMenuItem(
              value: a,
              child: Row(
                children: [
                  Expanded(child: Text(a.label)),
                  if (a == ctx.defaultActivity)
                    Text(
                      'DEFAULT',
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
            ctx.currentActivity.label,
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
