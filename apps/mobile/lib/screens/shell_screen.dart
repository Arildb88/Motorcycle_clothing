import 'package:flutter/material.dart';
import 'package:motorcycle_clothing/screens/comfort_screen.dart';
import 'package:motorcycle_clothing/screens/home_screen.dart';
import 'package:motorcycle_clothing/screens/profile_screen.dart';
import 'package:motorcycle_clothing/screens/routes_screen.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:motorcycle_clothing/widgets/common.dart';

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
    ComfortScreen(),
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
            if (_index != 0) const AdBannerSlot(),
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
                  icon: Icon(Icons.thermostat_outlined),
                  selectedIcon: Icon(Icons.thermostat),
                  label: 'Comfort',
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
