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

  testWidgets('analysis shows engine kit labels and no ad slot', (
    tester,
  ) async {
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
            'comfort': {'intensity': 'steady', 'style': 'classic'},
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

  testWidgets('analysis separates kit, limits, confidence, and elevation', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(800, 2400));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        locale: const Locale('en'),
        home: RideAnalysisResultScreen(
          payload: {
            'route': {
              'name': 'Summit day',
              'startLabel': 'Village',
              'endLabel': 'Top station',
            },
            'weather': {
              'minTempC': -8,
              'maxTempC': 1,
              'maxRainProbPct': 20,
              'maxWindMs': 12,
              'elevation': {'attribution': '© Kartverket'},
            },
            'comfort': {'exposureMode': 'lift'},
            'recommendation': {
              'effectiveTempC': -6,
              'wear': [
                {'garmentName': 'Insulated shell', 'source': 'wardrobe'},
              ],
              'pack': [
                {'genericLabel': 'Extra gloves', 'source': 'generic'},
              ],
              'exposure': {
                'baseTempC': 1,
                'midTempC': -3,
                'upperTempC': null,
                'sites': [
                  {'role': 'base', 'elevationM': 180, 'estimated': false},
                  {'role': 'mid', 'elevationM': 900, 'estimated': true},
                  {'role': 'upper', 'elevationM': null, 'estimated': false},
                ],
              },
              'reasons': [
                {'code': 'UPPER_MOUNTAIN_SETS_KIT'},
                {'code': 'VILLAGE_WEATHER_NOT_USED_AS_SUMMIT'},
                {'code': 'UPPER_SITE_MISSING'},
                {'code': 'ELEVATION_PARTIAL'},
                {'code': 'NO_WAX_ADVICE'},
              ],
              'confidence': {
                'level': 'LOW',
                'reasons': ['ELEVATION_PARTIAL'],
              },
            },
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Village → Top station'), findsOneWidget);
    expect(find.text('Worn for this session'), findsOneWidget);
    expect(find.text('Packed, not worn the whole time'), findsOneWidget);
    expect(find.text('Insulated shell'), findsOneWidget);
    expect(find.text('Extra gloves (not owned)'), findsOneWidget);
    expect(find.text('Why this kit'), findsOneWidget);
    expect(
      find.text('• The colder upper mountain sets what you wear.'),
      findsOneWidget,
    );
    expect(find.text('Limits and assumptions'), findsOneWidget);
    expect(
      find.text(
        '• Village or base weather is not used as the summit forecast.',
      ),
      findsOneWidget,
    );
    expect(
      find.text('• This recommendation does not include wax advice.'),
      findsOneWidget,
    );
    expect(find.text('ELEVATION_PARTIAL'), findsNothing);
    expect(find.text('Low'), findsOneWidget);
    expect(find.text('Base · 1°C · 180 m'), findsOneWidget);
    expect(find.text('Mid · -3°C · 900 m · estimated height'), findsOneWidget);
    expect(find.textContaining('Upper ·'), findsNothing);
    expect(find.text('Elevation source: © Kartverket'), findsOneWidget);
    expect(find.text('Exposure -6°C'), findsOneWidget);

    final wearY = tester.getTopLeft(find.text('Wear')).dy;
    final packY = tester.getTopLeft(find.text('Pack')).dy;
    final whyY = tester.getTopLeft(find.text('Why this kit')).dy;
    final limitsY = tester.getTopLeft(find.text('Limits and assumptions')).dy;
    final confidenceY = tester.getTopLeft(find.text('Confidence')).dy;
    expect(wearY, lessThan(packY));
    expect(packY, lessThan(whyY));
    expect(whyY, lessThan(limitsY));
    expect(limitsY, lessThan(confidenceY));
  });

  testWidgets('analysis keeps uncertainty in Norwegian', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        locale: const Locale('nb'),
        home: const RideAnalysisResultScreen(
          payload: {
            'route': {'name': 'Topptur'},
            'recommendation': {
              'wear': <Map<String, dynamic>>[],
              'pack': <Map<String, dynamic>>[],
              'reasons': [
                {'code': 'VILLAGE_WEATHER_NOT_USED_AS_SUMMIT'},
              ],
              'confidence': {'level': 'LOW'},
            },
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.text('• Vær fra dalen eller bunnen brukes ikke som toppvær.'),
      findsOneWidget,
    );
    expect(find.text('Lav'), findsOneWidget);
    expect(find.text('VILLAGE_WEATHER_NOT_USED_AS_SUMMIT'), findsNothing);
  });
}
