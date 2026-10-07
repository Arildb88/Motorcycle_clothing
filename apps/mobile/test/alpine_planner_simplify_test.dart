import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/features/activity/activity_home_screen.dart';
import 'package:motorcycle_clothing/features/plan/device_location_service.dart';
import 'package:motorcycle_clothing/features/plan/fnugg_attribution_link.dart';
import 'package:motorcycle_clothing/features/plan/recommendation_presentation.dart';
import 'package:motorcycle_clothing/features/plan/resort_discovery.dart';
import 'package:motorcycle_clothing/features/plan/ride_analysis_result_screen.dart';
import 'package:motorcycle_clothing/features/plan/ride_planner_models.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/location/fake_location_services.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';
import 'package:motorcycle_clothing/services/location/location_search_service.dart';
import 'package:motorcycle_clothing/services/location/location_services.dart';
import 'package:motorcycle_clothing/services/resorts/fnugg_source.dart';
import 'package:motorcycle_clothing/services/resorts/resort_directory.dart';
import 'package:motorcycle_clothing/services/resorts/ski_resort.dart';
import 'package:motorcycle_clothing/state/activity_context.dart';
import 'package:motorcycle_clothing/state/unit_preferences_controller.dart';
import 'package:provider/provider.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  test('active-duration wording does not change the session calculation', () {
    final en = lookupAppLocalizations(const Locale('en'));
    final nb = lookupAppLocalizations(const Locale('nb'));
    expect(en.plannerActiveDuration, 'How long are you active?');
    expect(nb.plannerActiveDuration, 'Hvor lenge er du aktiv?');
    expect(en.plannerActiveDuration, isNot(contains('Session length')));
    expect(nb.plannerSessionLength, 'Øktlengde');
    expect(nb.plannerActiveDuration, isNot(contains('Øktlengde')));
    expect(nb.plannerActiveDuration, isNot(contains('skal du være')));

    final alpine = RidePlannerState(activityType: 'alpine_skiing');
    expect(alpine.durationMin, 240);
    final body = alpine.planRequestBody();
    expect(body['durationMin'], 240);
    expect(body['planningMode'], 'departure');
    expect(body.containsKey('departureAt'), isTrue);
    expect(body.containsKey('arrivalAt'), isFalse);

    final longer = alpine.copyWith(durationMin: 180);
    expect(longer.planRequestBody()['durationMin'], 180);
    expect(longer.recommendQuery('resort', '2026-10-07T09:00:00.000Z'), {
      'routeId': 'resort',
      'departureAt': '2026-10-07T09:00:00.000Z',
      'exposure': 'lift',
    });

    final xc = RidePlannerState(activityType: 'xc_skiing');
    expect(xc.durationMin, 120);
  });

  test('resort limits keep only the missing top station', () {
    const codes = [
      'UPPER_SITE_MISSING',
      'ELEVATION_PARTIAL',
      'VILLAGE_WEATHER_NOT_USED_AS_SUMMIT',
      'ASSUMED_EXPOSURE_MODE',
      'BOOTS_ARE_EQUIPMENT',
    ];
    expect(visibleLimitReasonCodes(codes, resortSnow: true), [
      'UPPER_SITE_MISSING',
    ]);
    expect(
      visibleLimitReasonCodes([
        'ELEVATION_PARTIAL',
        'GENERIC_ALPINE_KIT',
      ], resortSnow: true),
      isEmpty,
    );
    expect(visibleLimitReasonCodes(codes, resortSnow: false), codes);
  });

  testWidgets(
    'home omits alpine selectors and launches the selected discipline',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final activity = ActivityContext()
        ..setCurrentActivity(AppActivity.snowboarding);
      await tester.pumpWidget(_homeApp(activity));
      await tester.pumpAndSettle();

      expect(find.text('Alpine & snowboard'), findsOneWidget);
      expect(find.text('Skiing or snowboarding'), findsNothing);
      expect(find.text('Alpine skiing'), findsNothing);
      expect(find.text('Snowboarding'), findsNothing);
      expect(find.text('Where you spend time'), findsNothing);
      expect(find.text('Lifts'), findsNothing);
      expect(find.text('Hiking up'), findsNothing);
      expect(find.text('Staying at the base'), findsNothing);

      await tester.tap(find.widgetWithText(OutlinedButton, 'Plan new ride'));
      await tester.pumpAndSettle();

      expect(find.text('Skiing or snowboarding'), findsOneWidget);
      expect(find.text('Where you spend time'), findsNothing);
      expect(find.text('Lifts'), findsNothing);
      expect(find.text('Hiking up'), findsNothing);
      expect(find.text('How long are you active?'), findsOneWidget);
      expect(find.text('Session length'), findsNothing);
      expect(find.textContaining('Hvor lenge skal du'), findsNothing);
      expect(
        tester
            .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'Snowboarding'))
            .selected,
        isTrue,
      );
      expect(
        tester
            .widget<ChoiceChip>(
              find.widgetWithText(ChoiceChip, 'Alpine skiing'),
            )
            .selected,
        isFalse,
      );
      expect(activity.currentActivity, AppActivity.snowboarding);
    },
  );

  testWidgets(
    'Hafjell hides coordinates and keeps one Fnugg link and the selection',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      const hafjell = SkiResort(
        id: 'hafjell',
        name: 'Hafjell Alpinsenter',
        lat: 61.24,
        lon: 10.45,
        sourceUrl: 'https://fnugg.no/hafjell/',
      );
      SkiResort? selected;
      final opened = <Uri>[];
      await tester.pumpWidget(
        MaterialApp(
          locale: const Locale('nb'),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                return ListView(
                  children: [
                    ResortDiscoverySection(
                      directory: _FixedDirectory(const [hafjell]),
                      deviceLocation: FakeDeviceLocationService(),
                      places: _QuietPlaces(),
                      selectedResortId: selected?.id,
                      onOpenAttribution: (uri) async => opened.add(uri),
                      onSelected: (resort) => setState(() => selected = resort),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(FnuggAttributionLink), findsOneWidget);
      expect(
        find.text('Informasjon om skianlegg er hentet fra Fnugg.no'),
        findsOneWidget,
      );

      await tester.enterText(find.byType(TextField).first, 'Hafjell');
      await tester.pump(const Duration(milliseconds: 400));

      expect(find.text('Hafjell Alpinsenter'), findsOneWidget);
      expect(find.textContaining('61.24'), findsNothing);
      expect(find.textContaining('10.45'), findsNothing);
      expect(find.byType(FnuggAttributionLink), findsOneWidget);
      expect(
        tester
            .widget<FnuggAttributionLink>(
              find.byKey(const Key('fnugg-attribution')),
            )
            .uri,
        fnuggHomeUri,
      );
      expect(find.text('Fnugg.no'), findsNothing);
      expect(find.textContaining('Valgt skianlegg'), findsNothing);

      await tester.tap(find.text('Hafjell Alpinsenter'));
      await tester.pump();

      expect(selected?.id, 'hafjell');
      expect(selected?.lat, 61.24);
      expect(selected?.lon, 10.45);
      expect(find.textContaining('61.24'), findsNothing);
      expect(find.textContaining('10.45'), findsNothing);
      expect(find.textContaining('Valgt skianlegg'), findsNothing);
      expect(find.byType(FnuggAttributionLink), findsOneWidget);
      expect(
        tester
            .widget<Icon>(
              find.descendant(
                of: find.byKey(const ValueKey('resort-hafjell')),
                matching: find.byType(Icon),
              ),
            )
            .icon,
        Icons.check_circle,
      );

      opened.clear();
      await tester.tap(find.byKey(const Key('fnugg-attribution')));
      await tester.pump();
      expect(opened, [fnuggHomeUri]);
    },
  );

  testWidgets('alpine limits show only a missing top station', (tester) async {
    tester.view.physicalSize = const Size(800, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      _analysis(
        locale: const Locale('nb'),
        payload: _alpinePayload(includeMissingTop: true),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Begrensninger og antakelser'), findsOneWidget);
    expect(
      find.text(
        '• Ingen toppstasjon ble funnet, så forholdene på toppen er ukjente.',
      ),
      findsOneWidget,
    );
    expect(
      find.text('• Terrenghøyde mangler for deler av denne planen.'),
      findsNothing,
    );
    expect(
      find.text('• Vær fra dalen eller bunnen brukes ikke som toppvær.'),
      findsNothing,
    );
    expect(
      find.text(
        '• Støvler er utstyr og velges ikke av dette bekledningsantrekket.',
      ),
      findsNothing,
    );
    expect(
      find.text('• Denne anbefalingen inneholder ikke skismøring.'),
      findsNothing,
    );
    expect(find.text('Lav'), findsOneWidget);
    expect(find.byKey(const Key('weather-unavailable')), findsNothing);

    await tester.pumpWidget(
      _analysis(
        locale: const Locale('en'),
        payload: _alpinePayload(includeMissingTop: false),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Limits and assumptions'), findsNothing);
    expect(find.textContaining('No upper-mountain site'), findsNothing);
    expect(find.text('Low'), findsOneWidget);

    await tester.pumpWidget(
      _analysis(
        payload: {
          'route': {'name': 'Commute', 'activityType': 'motorcycle'},
          'weather': {
            'minTempC': 4,
            'maxTempC': 8,
            'maxRainProbPct': 10,
            'maxWindMs': 5,
          },
          'recommendation': {
            'engine': 'motorcycle_v1',
            'wear': const <Map<String, dynamic>>[],
            'pack': const <Map<String, dynamic>>[],
            'reasons': [
              {'code': 'ELEVATION_PARTIAL'},
            ],
            'confidence': {'level': 'MEDIUM', 'reasons': <String>[]},
          },
        },
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Limits and assumptions'), findsOneWidget);
    expect(
      find.text('• Ground elevation is missing for part of this plan.'),
      findsOneWidget,
    );
  });

  testWidgets('alpine weather failure stays outside the limits section', (
    tester,
  ) async {
    await tester.pumpWidget(
      _analysis(
        payload: {
          'route': {'name': 'Hafjell', 'activityType': 'alpine_skiing'},
          'weather': {'status': 'unavailable', 'reason': 'timeout'},
          'recommendation': {
            'discipline': 'alpine_skiing',
            'status': 'unavailable',
            'reasons': [
              {'code': 'UPPER_SITE_MISSING'},
            ],
          },
        },
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('weather-unavailable')), findsOneWidget);
    expect(find.textContaining('timed out'), findsOneWidget);
    expect(find.text('Limits and assumptions'), findsNothing);
    expect(find.byKey(const Key('weather-unavailable-retry')), findsOneWidget);
  });
}

Widget _homeApp(ActivityContext activity) {
  return MultiProvider(
    providers: [
      ChangeNotifierProvider<ActivityContext>.value(value: activity),
      Provider<ApiClient>.value(value: _EmptyRoutesApi()),
      Provider<LocationServices>.value(
        value: LocationServices(
          search: _QuietPlaces(),
          geometry: FakeRouteGeometryService(),
        ),
      ),
      Provider<DeviceLocationService>.value(value: FakeDeviceLocationService()),
      Provider<ResortDirectory>.value(value: _FixedDirectory(const [])),
    ],
    child: const MaterialApp(
      locale: Locale('en'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(body: ActivityHomeScreen()),
    ),
  );
}

Widget _analysis({
  required Map<String, dynamic> payload,
  Locale locale = const Locale('en'),
}) {
  return ChangeNotifierProvider<UnitPreferencesController>.value(
    value: UnitPreferencesController(),
    child: MaterialApp(
      locale: locale,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: RideAnalysisResultScreen(payload: payload),
    ),
  );
}

Map<String, dynamic> _alpinePayload({required bool includeMissingTop}) {
  return {
    'route': {
      'name': 'Hafjell',
      'activityType': 'snowboarding',
      'startLabel': 'Hafjell Alpinsenter',
      'endLabel': 'Hafjell Alpinsenter',
    },
    'weather': {
      'minTempC': -8,
      'maxTempC': -2,
      'maxRainProbPct': 20,
      'maxWindMs': 9,
    },
    'comfort': {'exposureMode': 'lift'},
    'recommendation': {
      'engine': 'alpine_v1',
      'discipline': 'snowboarding',
      'effectiveTempC': -7,
      'wear': const <Map<String, dynamic>>[],
      'pack': const <Map<String, dynamic>>[],
      'reasons': [
        if (includeMissingTop) {'code': 'UPPER_SITE_MISSING'},
        {'code': 'ELEVATION_PARTIAL'},
        {'code': 'VILLAGE_WEATHER_NOT_USED_AS_SUMMIT'},
        {'code': 'BOOTS_ARE_EQUIPMENT'},
        {'code': 'NO_WAX_ADVICE'},
      ],
      'confidence': {
        'level': 'LOW',
        'reasons': ['ELEVATION_PARTIAL'],
      },
    },
  };
}

class _EmptyRoutesApi extends ApiClient {
  _EmptyRoutesApi() : super(baseUrl: 'http://example.test');

  @override
  Future<List<dynamic>> getList(String path, {bool auth = true}) async {
    return const [];
  }
}

class _FixedDirectory implements ResortDirectory {
  const _FixedDirectory(this.hits);

  final List<SkiResort> hits;

  @override
  Future<List<SkiResort>> searchByName(String query) async => hits;

  @override
  Future<List<SkiResort>> nearby({
    required double lat,
    required double lon,
  }) async => hits;
}

class _QuietPlaces implements LocationSearchService {
  @override
  Future<List<PlaceSuggestion>> autocomplete(
    String query, {
    String? sessionToken,
  }) async => const [];

  @override
  Future<ResolvedPlace> resolve(PlaceSuggestion suggestion) async {
    return ResolvedPlace(
      providerPlaceId: suggestion.providerPlaceId,
      label: suggestion.primaryText,
      lat: 0,
      lon: 0,
    );
  }
}
