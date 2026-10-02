import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:motorcycle_clothing/features/plan/ride_analysis_result_screen.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/widgets/common.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets('analysis shows engine kit labels and no ad slot', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        locale: const Locale('en'),
        home: RideAnalysisResultScreen(
          payload: {
            'route': {'name': 'Hill loop'},
            'weather': {
              'minTempC': -6,
              'maxTempC': 2,
              'maxRainProbPct': 10,
              'maxWindMs': 4,
            },
            'recommendation': {
              'engine': 'alpine_v1',
              'wear': [
                {
                  'garmentName': 'Shell jacket',
                  'genericLabel': 'Insulated shell',
                  'source': 'wardrobe',
                  'slot': 'shell',
                },
              ],
              'pack': [
                {
                  'genericLabel': 'Light gloves',
                  'source': 'generic',
                  'slot': 'hands',
                },
              ],
            },
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Shell jacket'), findsOneWidget);
    expect(find.text('Light gloves (not owned)'), findsOneWidget);
    expect(find.text('Instance of'), findsNothing);
    expect(find.byType(AdBannerSlot), findsNothing);
  });

  testWidgets('analysis shows the effort and style returned for the activity', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        locale: const Locale('en'),
        home: RideAnalysisResultScreen(
          payload: {
            'route': {'name': 'Lake loop'},
            'comfort': {
              'intensity': 'steady',
              'style': 'classic',
            },
            'weather': {
              'minTempC': -2,
              'maxTempC': 1,
              'maxRainProbPct': 0,
              'maxWindMs': 3,
            },
            'recommendation': {
              'wear': const <Map<String, dynamic>>[],
              'pack': const <Map<String, dynamic>>[],
            },
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Steady · Classic'), findsOneWidget);
  });
}
