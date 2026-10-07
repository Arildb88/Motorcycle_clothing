import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:motorcycle_clothing/features/plan/ride_analysis_result_screen.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/state/unit_preferences_controller.dart';
import 'package:motorcycle_clothing/widgets/common.dart';
import 'package:provider/provider.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets('analysis shows engine kit labels and no ad slot', (
    tester,
  ) async {
    await tester.pumpWidget(
      _analysisApp(
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
      _analysisApp(
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
      _analysisApp(
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
    expect(find.text('Base · 1 °C · 180 m'), findsOneWidget);
    expect(find.text('Mid · -3 °C · 900 m · estimated height'), findsOneWidget);
    expect(find.textContaining('Upper ·'), findsNothing);
    expect(find.text('Elevation source: © Kartverket'), findsOneWidget);
    expect(find.text('Exposure -6 °C'), findsOneWidget);

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
      _analysisApp(
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

  testWidgets('analysis uses the profile temperature and wind units', (
    tester,
  ) async {
    final units = UnitPreferencesController()
      ..temperatureUnit = 'fahrenheit'
      ..windSpeedUnit = 'mph';
    await tester.pumpWidget(
      _analysisApp(
        units: units,
        home: RideAnalysisResultScreen(
          payload: {
            'route': {'name': 'Hill loop'},
            'weather': {'minTempC': -8, 'maxTempC': 1, 'maxWindMs': 12},
            'recommendation': {
              'effectiveTempC': -6,
              'wear': const <Map<String, dynamic>>[],
              'pack': const <Map<String, dynamic>>[],
              'exposure': {
                'baseTempC': 1,
                'sites': [
                  {'role': 'base', 'elevationM': 180, 'estimated': false},
                ],
              },
            },
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Temp 18–34 °F'), findsOneWidget);
    expect(find.text('Exposure 21 °F'), findsOneWidget);
    expect(find.text('Wind 27 mph'), findsOneWidget);
    expect(find.text('Base · 34 °F · 180 m'), findsOneWidget);
    expect(find.textContaining('°C'), findsNothing);
    expect(find.textContaining('m/s'), findsNothing);
  });

  testWidgets('analysis compares nearby departures without ranking one', (
    tester,
  ) async {
    await tester.pumpWidget(
      _analysisApp(
        home: RideAnalysisResultScreen(
          payload: {
            'route': {'name': 'Hill loop'},
            'weather': {
              'minTempC': 4,
              'maxTempC': 6,
              'maxRainProbPct': 20,
              'maxWindMs': 5,
            },
            'departureComparison': {
              'variesByTime': true,
              'alternatives': [
                {
                  'departureAt': '2026-10-03T14:00:00.000Z',
                  'selected': false,
                  'available': true,
                  'conditions': {
                    'minTempC': 4,
                    'maxTempC': 4,
                    'maxRainProbPct': 10,
                    'maxPrecipMm': 0,
                    'maxWindMs': 3,
                    'forecastFrom': '2026-10-03T14:00:00.000Z',
                    'forecastTo': '2026-10-03T15:00:00.000Z',
                  },
                },
                {
                  'departureAt': '2026-10-03T15:00:00.000Z',
                  'selected': true,
                  'available': false,
                  'unavailableReason': 'out_of_range',
                  'missingAt': ['2026-10-03T16:00:00.000Z'],
                },
              ],
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

    expect(find.byKey(const Key('departure-comparison')), findsOneWidget);
    expect(find.text('Departure times'), findsOneWidget);
    expect(find.textContaining('Your departure'), findsOneWidget);
    expect(find.text('Forecast unavailable for this time'), findsOneWidget);
    expect(
      find.text('Temp 4–4 °C · Rain 10% · Precipitation 0.0 mm · Wind 3 m/s'),
      findsOneWidget,
    );
    expect(find.textContaining('No forecast for'), findsOneWidget);
    expect(find.textContaining('Best'), findsNothing);
    expect(find.textContaining('Score'), findsNothing);
  });

  testWidgets('analysis keeps departure comparison in Norwegian', (
    tester,
  ) async {
    await tester.pumpWidget(
      _analysisApp(
        locale: const Locale('nb'),
        home: const RideAnalysisResultScreen(
          payload: {
            'route': {'name': 'Runde'},
            'departureComparison': {
              'variesByTime': false,
              'alternatives': [
                {
                  'departureAt': '2026-10-03T15:00:00.000Z',
                  'selected': true,
                  'available': true,
                  'conditions': {
                    'minTempC': 1,
                    'maxTempC': 2,
                    'maxRainProbPct': 0,
                    'maxPrecipMm': 0,
                    'maxWindMs': 1,
                    'forecastFrom': '2026-10-03T15:00:00.000Z',
                    'forecastTo': '2026-10-03T15:00:00.000Z',
                  },
                },
              ],
            },
            'recommendation': {
              'wear': <Map<String, dynamic>>[],
              'pack': <Map<String, dynamic>>[],
            },
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Avreisetider'), findsOneWidget);
    expect(find.textContaining('Din avreise'), findsOneWidget);
    expect(find.textContaining('Nedbør'), findsOneWidget);
    expect(
      find.text('Denne prognosen endrer seg ikke mellom disse avreisetidene.'),
      findsOneWidget,
    );
    expect(find.text('Departure times'), findsNothing);
  });

  testWidgets(
    'analysis shows Norwegian reasons only for the garment that has them',
    (tester) async {
      await tester.pumpWidget(
        _analysisApp(
          locale: const Locale('nb'),
          home: const RideAnalysisResultScreen(
            payload: {
              'route': {'name': 'Fjell'},
              'weather': {
                'minTempC': -4,
                'maxTempC': -1,
                'maxRainProbPct': 0,
                'maxWindMs': 2,
              },
              'recommendation': {
                'wear': [
                  {
                    'garmentName': 'Skalljakke',
                    'source': 'wardrobe',
                    'slot': 'shell',
                    'because': ['SUSTAINED_COLD_EXPOSURE'],
                  },
                ],
                'pack': [
                  {
                    'genericLabel': 'Ekstra mellomlag',
                    'source': 'generic',
                    'slot': 'mid',
                    'because': ['PACK_EXTRA_INSULATION'],
                  },
                ],
                'reasons': [
                  {'code': 'INCOMPLETE_WEATHER'},
                ],
              },
            },
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Skalljakke'), findsOneWidget);
      expect(find.text('Ekstra mellomlag (ikke i garderoben)'), findsOneWidget);
      expect(
        find.descendant(
          of: find.byKey(const Key('kit-because-0')),
          matching: find.text('Vedvarende kulde øker behovet for varme.'),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: find.byKey(const Key('kit-because-1')),
          matching: find.text(
            'Pakk ekstra isolasjon for korte kalde segmenter.',
          ),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: find.byKey(const Key('kit-because-0')),
          matching: find.text(
            'Pakk ekstra isolasjon for korte kalde segmenter.',
          ),
        ),
        findsNothing,
      );
      expect(
        find.descendant(
          of: find.byKey(const Key('kit-because-0')),
          matching: find.textContaining('ufullstendig'),
        ),
        findsNothing,
      );
      expect(find.textContaining('Best'), findsNothing);
    },
  );

  testWidgets(
    'analysis can record cold, comfortable, or hot for that activity',
    (tester) async {
      await tester.pumpWidget(
        _analysisApp(
          locale: const Locale('nb'),
          home: const RideAnalysisResultScreen(
            payload: {
              'route': {'name': 'Oslo loop', 'activityType': 'cycling'},
              'weather': {
                'minTempC': 8,
                'maxTempC': 11,
                'maxRainProbPct': 10,
                'maxWindMs': 4,
              },
              'recommendation': {
                'engine': 'cycling_v1',
                'wear': [],
                'pack': [],
              },
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.byKey(const Key('thermal-feedback-open')),
        200,
      );
      await tester.tap(find.byKey(const Key('thermal-feedback-open')));
      await tester.pumpAndSettle();
      expect(find.text('For kald'), findsOneWidget);
      expect(find.text('Passe'), findsOneWidget);
      expect(find.text('For varm'), findsOneWidget);
      expect(find.text('Litt kaldt'), findsNothing);
    },
  );

  testWidgets('unavailable weather is not shown as a clothing recommendation', (
    tester,
  ) async {
    await tester.pumpWidget(
      _analysisApp(
        home: const RideAnalysisResultScreen(
          payload: {
            'route': {'name': 'Commute'},
            'weather': {
              'status': 'unavailable',
              'reason': 'timeout',
              'points': [],
            },
            'recommendation': {
              'status': 'unavailable',
              'reason': 'timeout',
              'wear': [
                {'garmentName': 'Should not show'},
              ],
              'pack': [],
            },
          },
        ),
      ),
    );

    expect(find.byKey(const Key('weather-unavailable')), findsOneWidget);
    expect(find.textContaining('timed out'), findsOneWidget);
    expect(find.text('Should not show'), findsNothing);
    expect(find.byKey(const Key('thermal-feedback-open')), findsNothing);
    expect(find.byKey(const Key('weather-unavailable-retry')), findsOneWidget);
  });
}

Widget _analysisApp({
  required Widget home,
  Locale locale = const Locale('en'),
  UnitPreferencesController? units,
}) {
  return ChangeNotifierProvider<UnitPreferencesController>.value(
    value: units ?? UnitPreferencesController(),
    child: MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      locale: locale,
      home: home,
    ),
  );
}
