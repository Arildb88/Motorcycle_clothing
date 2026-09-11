import 'package:flutter/material.dart';
import 'package:motorcycle_clothing/features/activity/activity_home_screen.dart';
import 'package:motorcycle_clothing/features/profile/profile_settings_screen.dart';
import 'package:motorcycle_clothing/features/wardrobe/wardrobe_screen.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/screens/routes_screen.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:motorcycle_clothing/widgets/common.dart';
import 'package:motorcycle_clothing/config/app_config.dart';

class ShellScreen extends StatefulWidget {
  const ShellScreen({super.key});

  @override
  State<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends State<ShellScreen> {
  int _index = 0;

  static const _pages = [
    ActivityHomeScreen(),
    RoutesScreen(),
    WardrobeScreen(),
    ProfileSettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return AtmosphereBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: KeyedSubtree(
            key: ValueKey(_index),
            child: _pages[_index],
          ),
        ),
        bottomNavigationBar: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Ads never on Today/recommendation (index 0) — safety/trust surface
            if (AppConfig.adsEnabled && _index != 0) const AdBannerSlot(),
            NavigationBar(
              selectedIndex: _index,
              backgroundColor: Colors.white.withValues(alpha: 0.85),
              indicatorColor: AppTheme.mist.withValues(alpha: 0.45),
              onDestinationSelected: (i) => setState(() => _index = i),
              destinations: [
                NavigationDestination(
                  icon: const Icon(Icons.home_outlined),
                  selectedIcon: const Icon(Icons.home),
                  label: l10n.navToday,
                ),
                NavigationDestination(
                  icon: const Icon(Icons.route_outlined),
                  selectedIcon: const Icon(Icons.route),
                  label: l10n.navRoutes,
                ),
                NavigationDestination(
                  icon: const Icon(Icons.checkroom_outlined),
                  selectedIcon: const Icon(Icons.checkroom),
                  label: l10n.navWardrobe,
                ),
                NavigationDestination(
                  icon: const Icon(Icons.person_outline),
                  selectedIcon: const Icon(Icons.person),
                  label: l10n.navProfile,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
