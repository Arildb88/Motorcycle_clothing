import 'package:flutter/material.dart';
import 'package:motorcycle_clothing/features/wardrobe/wardrobe_screen.dart';
import 'package:motorcycle_clothing/screens/home_screen.dart';
import 'package:motorcycle_clothing/screens/profile_screen.dart';
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
    HomeScreen(),
    RoutesScreen(),
    WardrobeScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
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
            if (AppConfig.adsEnabled && _index != 0) const AdBannerSlot(),
            NavigationBar(
              selectedIndex: _index,
              backgroundColor: Colors.white.withValues(alpha: 0.85),
              indicatorColor: AppTheme.mist.withValues(alpha: 0.45),
              onDestinationSelected: (i) => setState(() => _index = i),
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.wb_cloudy_outlined),
                  selectedIcon: Icon(Icons.wb_cloudy),
                  label: 'Today',
                ),
                NavigationDestination(
                  icon: Icon(Icons.route_outlined),
                  selectedIcon: Icon(Icons.route),
                  label: 'Routes',
                ),
                NavigationDestination(
                  icon: Icon(Icons.checkroom_outlined),
                  selectedIcon: Icon(Icons.checkroom),
                  label: 'Wardrobe',
                ),
                NavigationDestination(
                  icon: Icon(Icons.person_outline),
                  selectedIcon: Icon(Icons.person),
                  label: 'Profile',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
