import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/features/activity/activity_home_screen.dart';
import 'package:motorcycle_clothing/features/plan/device_location_service.dart';
import 'package:motorcycle_clothing/features/plan/ride_planner_screen.dart';
import 'package:motorcycle_clothing/features/profile/profile_settings_screen.dart';
import 'package:motorcycle_clothing/features/routes/place_search_field.dart';
import 'package:motorcycle_clothing/features/routes/route_map_preview.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/screens/routes_screen.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';
import 'package:motorcycle_clothing/services/location/api_location_search_service.dart';
import 'package:motorcycle_clothing/services/location/location_search_service.dart';
import 'package:motorcycle_clothing/services/location/location_services.dart';
import 'package:motorcycle_clothing/services/location/fake_location_services.dart';
import 'package:motorcycle_clothing/services/resorts/resort_directory.dart';
import 'package:motorcycle_clothing/services/resorts/ski_resort.dart';
import 'package:motorcycle_clothing/state/activity_context.dart';
import 'package:motorcycle_clothing/state/auth_state.dart';
import 'package:motorcycle_clothing/state/locale_controller.dart';
import 'package:motorcycle_clothing/state/unit_preferences_controller.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
    SharedPreferences.setMockInitialValues({});
  });

  test('selected place label stays independent of the typed query', () {
    expect(
      preserveSelectedPlaceLabel(
        typedQuery: 'Kristiansand',
        suggestionLabel: 'Kristiansand lufthavn, Kjevik',
        resolvedLabel: 'Kristiansand',
      ),
      'Kristiansand lufthavn, Kjevik',
    );
    expect(
      preserveSelectedPlaceLabel(
        typedQuery: 'Arendal',
        suggestionLabel: 'Arendal Trefoldighetskirke',
        resolvedLabel: 'Arendal',
      ),
      'Arendal Trefoldighetskirke',
    );
    expect(
      preserveSelectedPlaceLabel(
        typedQuery: 'Kristiansand',
        suggestionLabel: 'Kristiansand, Agder, Norway',
        resolvedLabel: 'Kristiansand, Agder, Norway',
      ),
      'Kristiansand, Agder, Norway',
    );
  });

  testWidgets('a stale search error does not replace selectable results', (
    tester,
  ) async {
    final search = _HoldingSearch();
    await tester.pumpWidget(_searchHarness(search));
    await tester.enterText(find.byType(TextField), 'Kr');
    await tester.pump(const Duration(milliseconds: 400));
    await tester.enterText(find.byType(TextField), 'Krist');
    await tester.pump(const Duration(milliseconds: 400));
    expect(search.pending, 2);

    search.complete(1, const [
      PlaceSuggestion(
        providerPlaceId: 'airport',
        primaryText: 'Kristiansand lufthavn, Kjevik',
      ),
    ]);
    await tester.pump();
    expect(find.text('Kristiansand lufthavn, Kjevik'), findsOneWidget);
    expect(find.text('Place search is temporarily unavailable.'), findsNothing);

    search.fail(
      0,
      LocationProviderException(
        'Place search is temporarily unavailable.',
        code: 'GEOCODING_UNAVAILABLE',
      ),
    );
    await tester.pump();
    expect(find.text('Kristiansand lufthavn, Kjevik'), findsOneWidget);
    expect(find.text('Place search is temporarily unavailable.'), findsNothing);
  });

  testWidgets('the latest provider failure still shows the real error', (
    tester,
  ) async {
    final search = _HoldingSearch();
    await tester.pumpWidget(_searchHarness(search));
    await tester.enterText(find.byType(TextField), 'Kristiansand');
    await tester.pump(const Duration(milliseconds: 400));
    search.fail(
      0,
      LocationProviderException('down', code: 'GEOCODING_UNAVAILABLE'),
    );
    await tester.pump();
    expect(
      find.text('Place search is temporarily unavailable.'),
      findsOneWidget,
    );
    expect(find.byType(ListTile), findsNothing);
  });

  testWidgets('select, swap, preview, save, and analyze keep place state', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 2200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = _FlowApi();
    await _pumpPlanner(tester, search: _PlaceCatalog(), api: api);

    await _choosePlace(
      tester,
      'Start',
      'Kristiansand',
      'Kristiansand lufthavn, Kjevik',
    );
    await _choosePlace(
      tester,
      'Destination',
      'Arendal',
      'Arendal Trefoldighetskirke',
    );

    expect(_fieldText(tester, 'Start'), 'Kristiansand lufthavn, Kjevik');
    expect(_fieldText(tester, 'Destination'), 'Arendal Trefoldighetskirke');
    expect(_fieldText(tester, 'Start'), isNot('Kristiansand'));

    await tester.ensureVisible(find.text('Reverse'));
    await tester.tap(find.text('Reverse'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(_fieldText(tester, 'Start'), 'Arendal Trefoldighetskirke');
    expect(_fieldText(tester, 'Destination'), 'Kristiansand lufthavn, Kjevik');
    expect(find.byType(RouteMapPreview), findsOneWidget);

    final name = find.byWidgetPredicate(
      (widget) =>
          widget is TextField && widget.decoration?.labelText == 'Route name',
    );
    await tester.ensureVisible(name);
    await tester.enterText(name, 'Airport swap');
    await tester.pump();

    final save = find.widgetWithText(OutlinedButton, 'Save route');
    await tester.ensureVisible(save);
    await tester.tap(save);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Route saved'), findsOneWidget);

    final waypoints = (api.saved?['waypoints'] as List).cast<Map>();
    expect(waypoints.first['label'], 'Arendal Trefoldighetskirke');
    expect(waypoints.first['lat'], 58.461);
    expect(waypoints.last['label'], 'Kristiansand lufthavn, Kjevik');
    expect(waypoints.last['lat'], 58.204);

    final analyze = find.widgetWithText(FilledButton, 'Analyze ride');
    await tester.ensureVisible(analyze);
    await tester.tap(analyze);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('Ride analysis'), findsOneWidget);
    expect(api.recommendPath, contains('routeId=route-1'));
    expect(api.planned, isNotNull);
    await tester.pump(const Duration(milliseconds: 250));
  });

  testWidgets('alpine and snowboard plan from a place, not a ride', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await _pumpPlanner(tester, activityType: 'alpine_skiing');
    expect(find.text('Ski resort'), findsOneWidget);
    expect(find.text('Resort information from Fnugg.no'), findsOneWidget);
    expect(find.text('Destination'), findsNothing);
    expect(find.text('Avoid motorways'), findsNothing);
    expect(find.text('Lifts'), findsNothing);
    expect(find.text('Where you spend time'), findsNothing);
    expect(find.text('How long are you active?'), findsOneWidget);
    expect(find.byType(RouteMapPreview), findsNothing);

    await _pumpPlanner(tester, activityType: 'snowboarding');
    expect(find.text('Ski resort'), findsOneWidget);
    expect(find.text('Staying at the base'), findsNothing);
    expect(find.text('How long are you active?'), findsOneWidget);

    await _pumpPlanner(tester, activityType: 'cycling');
    expect(find.text('Start'), findsWidgets);
    expect(find.text('Destination'), findsWidgets);
    expect(find.text('Easy'), findsOneWidget);
    expect(find.text('Avoid motorways'), findsOneWidget);

    await _pumpPlanner(tester, activityType: 'xc_skiing');
    expect(find.text('Start'), findsWidgets);
    expect(find.text('Destination'), findsWidgets);
    expect(find.text('Classic'), findsWidgets);
    expect(find.text('Avoid motorways'), findsNothing);
    expect(find.text('Session length'), findsOneWidget);
    expect(find.text('How long are you active?'), findsNothing);
    expect(find.text('Lifts'), findsNothing);
  });

  testWidgets('hiking is marked unavailable and does not open motorcycle', (
    tester,
  ) async {
    final activity = ActivityContext()..setCurrentActivity(AppActivity.hiking);
    final api = _FlowApi();
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<ActivityContext>.value(value: activity),
          Provider<ApiClient>.value(value: api),
        ],
        child: const MaterialApp(
          locale: Locale('en'),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(body: ActivityHomeScreen()),
        ),
      ),
    );
    await tester.pump();
    expect(find.text('Open Motorcycle today'), findsNothing);
    expect(find.textContaining('not available yet'), findsOneWidget);
    expect(find.textContaining('motorcycle recommendation'), findsOneWidget);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<ActivityContext>.value(value: activity),
          Provider<ApiClient>.value(value: api),
        ],
        child: const MaterialApp(
          locale: Locale('en'),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(body: RoutesScreen()),
        ),
      ),
    );
    await tester.pump();
    expect(api.listCalls, 0);
    expect(find.textContaining('coming next'), findsOneWidget);
  });

  testWidgets('change password is a RideWear button with a 48dp target', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = _ProfileApi();
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          Provider<ApiClient>.value(value: api),
          ChangeNotifierProvider<AuthState>(create: (_) => AuthState(api)),
          ChangeNotifierProvider<ActivityContext>(
            create: (_) => ActivityContext(),
          ),
          ChangeNotifierProvider<LocaleController>(
            create: (_) => LocaleController(),
          ),
          ChangeNotifierProvider<UnitPreferencesController>(
            create: (_) => UnitPreferencesController(),
          ),
        ],
        child: const MaterialApp(
          locale: Locale('en'),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(body: ProfileSettingsScreen()),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    final button = find.widgetWithText(FilledButton, 'Change password');
    expect(button, findsOneWidget);
    expect(find.widgetWithText(TextButton, 'Change password'), findsNothing);
    expect(tester.getSize(button).height, greaterThanOrEqualTo(48));

    final signOut = find.widgetWithText(FilledButton, 'Sign out');
    expect(signOut, findsOneWidget);
    expect(tester.getSize(signOut).height, greaterThanOrEqualTo(48));
    final gap = tester.getTopLeft(signOut).dy - tester.getBottomLeft(button).dy;
    expect(gap, greaterThanOrEqualTo(12));
  });

  test('norwegian place queries are percent-encoded once', () {
    final tromso = locationPlacesPath('Tromsø');
    expect(tromso, contains('%C3%B8'));
    expect(tromso, isNot(contains('%25')));
    expect(tromso.toLowerCase(), isNot(contains('tromso')));
    expect(
      Uri.parse('http://example.test$tromso').queryParameters['q'],
      'Tromsø',
    );

    final alesund = locationPlacesPath('Ålesund');
    expect(alesund, contains('%C3%85'));
    expect(alesund, isNot(contains('Alesund')));
    expect(
      Uri.parse('http://example.test$alesund').queryParameters['q'],
      'Ålesund',
    );

    expect(
      Uri.parse('http://example.test${locationPlacesPath('Ærøy')}')
          .queryParameters['q'],
      'Ærøy',
    );
    expect(
      Uri.parse('http://example.test${locationPlacesPath('Øvre Åmot')}')
          .queryParameters['q'],
      'Øvre Åmot',
    );
  });

  test('selected norwegian labels stay richer than the short locality', () {
    expect(
      preserveSelectedPlaceLabel(
        typedQuery: 'Ål',
        suggestionLabel: 'Ålesund, Møre og Romsdal',
        resolvedLabel: 'Ål',
      ),
      'Ålesund, Møre og Romsdal',
    );
  });

  testWidgets('planner fields drop a stale search error when results arrive', (
    tester,
  ) async {
    Future<void> check(String activityType, String label) async {
      final search = _HoldingSearch();
      await _pumpPlanner(tester, activityType: activityType, search: search);
      final field = _fieldFinder(label);
      await tester.enterText(field, 'Kr');
      await tester.pump(const Duration(milliseconds: 400));
      await tester.enterText(field, 'Krist');
      await tester.pump(const Duration(milliseconds: 400));
      expect(search.pending, 2);

      search.complete(1, const [
        PlaceSuggestion(
          providerPlaceId: 'airport',
          primaryText: 'Kristiansand lufthavn, Kjevik',
        ),
      ]);
      await tester.pump();
      expect(find.text('Kristiansand lufthavn, Kjevik'), findsOneWidget);
      expect(
        find.text('Place search is temporarily unavailable.'),
        findsNothing,
      );

      search.fail(
        0,
        LocationProviderException(
          'Place search is temporarily unavailable.',
          code: 'GEOCODING_UNAVAILABLE',
        ),
      );
      await tester.pump();
      expect(find.text('Kristiansand lufthavn, Kjevik'), findsOneWidget);
      expect(
        find.text('Place search is temporarily unavailable.'),
        findsNothing,
      );
    }

    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await check('motorcycle', 'Start');
    await check('motorcycle', 'Destination');
  });

  testWidgets('a newer provider failure still replaces selectable results', (
    tester,
  ) async {
    final search = _HoldingSearch();
    await _pumpPlanner(tester, search: search);
    await tester.enterText(_fieldFinder('Destination'), 'Arendal');
    await tester.pump(const Duration(milliseconds: 400));
    search.fail(
      0,
      LocationProviderException('down', code: 'GEOCODING_UNAVAILABLE'),
    );
    await tester.pump();
    expect(
      find.text('Place search is temporarily unavailable.'),
      findsOneWidget,
    );
    expect(find.text('Arendal Trefoldighetskirke'), findsNothing);
  });

  testWidgets('location fields keep norwegian characters in the query', (
    tester,
  ) async {
    final search = _RecordingSearch(
      hits: const [
        PlaceSuggestion(providerPlaceId: 'alesund', primaryText: 'Ålesund'),
      ],
    );
    await tester.pumpWidget(_searchHarness(search));
    await tester.enterText(find.byType(TextField), 'Ålesund');
    await tester.pump(const Duration(milliseconds: 400));
    expect(search.queries, ['Ålesund']);
    expect(_fieldText(tester, 'Start'), 'Ålesund');
    expect(find.text('Ålesund'), findsWidgets);
    expect(find.text('Place search is temporarily unavailable.'), findsNothing);

    await tester.enterText(find.byType(TextField), 'Ærøy');
    await tester.pump(const Duration(milliseconds: 400));
    await tester.enterText(find.byType(TextField), 'Øvre Åmot');
    await tester.pump(const Duration(milliseconds: 400));
    expect(search.queries, containsAll(['Ærøy', 'Øvre Åmot']));
  });

  testWidgets('editing a selected place keeps the new norwegian query', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final search = _RecordingSearch(
      hits: const [
        PlaceSuggestion(
          providerPlaceId: 'airport',
          primaryText: 'Kristiansand lufthavn, Kjevik',
        ),
      ],
    );
    await _pumpPlanner(tester, search: search);
    await tester.enterText(_fieldFinder('Start'), 'Kristiansand');
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.text('Kristiansand lufthavn, Kjevik'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 20));
    expect(_fieldText(tester, 'Start'), 'Kristiansand lufthavn, Kjevik');

    await tester.enterText(_fieldFinder('Start'), 'Tromsø');
    expect(_fieldText(tester, 'Start'), 'Tromsø');
    await tester.pump(const Duration(milliseconds: 400));
    expect(search.queries, contains('Tromsø'));
    expect(_fieldText(tester, 'Start'), 'Tromsø');
  });

  testWidgets('current position fills coordinates and surfaces denial', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 2000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = _FlowApi();
    await _pumpPlanner(
      tester,
      api: api,
      deviceLocation: FakeDeviceLocationService(
        place: const ResolvedPlace(
          providerPlaceId: 'device:59.9,10.7',
          label: 'Current location',
          lat: 59.9,
          lon: 10.7,
        ),
      ),
    );
    final useHere = find.text('Use current location');
    await tester.ensureVisible(useHere);
    await tester.tap(useHere);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(_fieldText(tester, 'Start'), 'Current location');
    expect(
      find.text(
        'Location permission was denied. You can still search for a start place.',
      ),
      findsNothing,
    );

    await _choosePlace(
      tester,
      'Destination',
      'Arendal',
      'Arendal Trefoldighetskirke',
    );
    final name = find.byWidgetPredicate(
      (widget) =>
          widget is TextField && widget.decoration?.labelText == 'Route name',
    );
    await tester.ensureVisible(name);
    await tester.enterText(name, 'Here');
    await tester.pump();
    final save = find.widgetWithText(OutlinedButton, 'Save route');
    await tester.ensureVisible(save);
    await tester.tap(save);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    final waypoints = (api.saved?['waypoints'] as List).cast<Map>();
    expect(waypoints.first['lat'], 59.9);
    expect(waypoints.first['lon'], 10.7);
    expect(waypoints.first['label'], 'Current location');

    await _pumpPlanner(
      tester,
      deviceLocation: FakeDeviceLocationService(
        failure: DeviceLocationFailure.permissionDenied,
      ),
    );
    final deniedButton = find.text('Use current location');
    await tester.ensureVisible(deniedButton);
    await tester.tap(deniedButton);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 20));
    expect(
      find.text(
        'Location permission was denied. You can still search for a start place.',
      ),
      findsOneWidget,
    );
    expect(_fieldText(tester, 'Start'), isEmpty);

    await _pumpPlanner(
      tester,
      activityType: 'alpine_skiing',
      deviceLocation: FakeDeviceLocationService(
        failure: DeviceLocationFailure.serviceDisabled,
      ),
    );
    final alpineButton = find.text('Find resorts nearby');
    await tester.ensureVisible(alpineButton);
    await tester.tap(alpineButton);
    await tester.pump();
    expect(
      find.text(
        'Location services are off. Turn them on, or search for a ski resort by name.',
      ),
      findsOneWidget,
    );

    final resorts = _NearbyResorts(const [
      SkiResort(
        id: '5',
        name: 'SkiStar Hemsedal',
        lat: 60.86,
        lon: 8.52,
        straightLineDistanceM: 12000,
      ),
      SkiResort(
        id: '141',
        name: 'Ål Skisenter',
        lat: 60.63,
        lon: 8.56,
        straightLineDistanceM: 18000,
      ),
    ]);
    await _pumpPlanner(
      tester,
      activityType: 'snowboarding',
      resorts: resorts,
      deviceLocation: FakeDeviceLocationService(
        place: const ResolvedPlace(
          providerPlaceId: 'device:60.5,8.2',
          label: 'Current location',
          lat: 60.5,
          lon: 8.2,
        ),
      ),
    );
    final snowButton = find.text('Find resorts nearby');
    await tester.ensureVisible(snowButton);
    await tester.tap(snowButton);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 20));
    expect(resorts.lastNearby?.lat, 60.5);
    expect(resorts.lastNearby?.lon, 8.2);
    expect(find.text('SkiStar Hemsedal'), findsOneWidget);
    expect(find.text('Ål Skisenter'), findsOneWidget);
    expect(find.text('Place'), findsNothing);
  });
}

Finder _fieldFinder(String label) {
  return find.byWidgetPredicate(
    (widget) => widget is TextField && widget.decoration?.labelText == label,
  );
}

Future<void> _pumpPlanner(
  WidgetTester tester, {
  String activityType = 'motorcycle',
  LocationSearchService? search,
  DeviceLocationService? deviceLocation,
  ResortDirectory? resorts,
  ApiClient? api,
}) async {
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        Provider<LocationServices>.value(
          value: LocationServices(
            search: search ?? _PlaceCatalog(),
            geometry: FakeRouteGeometryService(),
          ),
        ),
        Provider<DeviceLocationService>.value(
          value: deviceLocation ?? FakeDeviceLocationService(),
        ),
        Provider<ResortDirectory>.value(
          value: resorts ?? _NearbyResorts(const []),
        ),
        if (api != null) Provider<ApiClient>.value(value: api),
      ],
      child: MaterialApp(
        locale: const Locale('en'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: RidePlannerScreen(
          key: ValueKey(activityType),
          activityType: activityType,
        ),
      ),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 20));
}

Future<void> _choosePlace(
  WidgetTester tester,
  String label,
  String query,
  String suggestion,
) async {
  final field = find.byWidgetPredicate(
    (widget) => widget is TextField && widget.decoration?.labelText == label,
  );
  await tester.ensureVisible(field);
  await tester.enterText(field, query);
  await tester.pump(const Duration(milliseconds: 400));
  await tester.tap(find.text(suggestion));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 20));
}

String _fieldText(WidgetTester tester, String label) {
  final field = tester.widget<TextField>(
    find.byWidgetPredicate(
      (widget) => widget is TextField && widget.decoration?.labelText == label,
    ),
  );
  return field.controller?.text ?? '';
}

Widget _searchHarness(LocationSearchService search) {
  return MaterialApp(
    locale: const Locale('en'),
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: Scaffold(
      body: PlaceSearchField(search: search, label: 'Start'),
    ),
  );
}

class _RecordingSearch implements LocationSearchService {
  _RecordingSearch({this.hits = const []});

  final List<String> queries = [];
  final List<PlaceSuggestion> hits;

  @override
  Future<List<PlaceSuggestion>> autocomplete(
    String query, {
    String? sessionToken,
  }) async {
    queries.add(query);
    if (query.toLowerCase().contains('krist')) return hits;
    return const [];
  }

  @override
  Future<ResolvedPlace> resolve(PlaceSuggestion suggestion) async {
    return ResolvedPlace(
      providerPlaceId: suggestion.providerPlaceId,
      label: 'Kristiansand',
      lat: 58.2,
      lon: 8.1,
    );
  }
}

class _HoldingSearch implements LocationSearchService {
  final List<Completer<List<PlaceSuggestion>>> _pending = [];

  int get pending => _pending.length;

  void complete(int index, List<PlaceSuggestion> hits) {
    _pending[index].complete(hits);
  }

  void fail(int index, LocationProviderException error) {
    _pending[index].completeError(error);
  }

  @override
  Future<List<PlaceSuggestion>> autocomplete(
    String query, {
    String? sessionToken,
  }) {
    final waiter = Completer<List<PlaceSuggestion>>();
    _pending.add(waiter);
    return waiter.future;
  }

  @override
  Future<ResolvedPlace> resolve(PlaceSuggestion suggestion) async {
    throw LocationProviderException('not used');
  }
}

class _PlaceCatalog implements LocationSearchService {
  @override
  Future<List<PlaceSuggestion>> autocomplete(
    String query, {
    String? sessionToken,
  }) async {
    final q = query.toLowerCase();
    if (q.contains('arendal')) {
      return const [
        PlaceSuggestion(
          providerPlaceId: 'church',
          primaryText: 'Arendal Trefoldighetskirke',
        ),
      ];
    }
    if (q.contains('krist')) {
      return const [
        PlaceSuggestion(
          providerPlaceId: 'airport',
          primaryText: 'Kristiansand lufthavn, Kjevik',
        ),
      ];
    }
    return const [];
  }

  @override
  Future<ResolvedPlace> resolve(PlaceSuggestion suggestion) async {
    switch (suggestion.providerPlaceId) {
      case 'airport':
        return const ResolvedPlace(
          providerPlaceId: 'airport',
          label: 'Kristiansand',
          lat: 58.204,
          lon: 8.085,
          address: 'Kjevik',
        );
      case 'church':
        return const ResolvedPlace(
          providerPlaceId: 'church',
          label: 'Arendal',
          lat: 58.461,
          lon: 8.766,
          address: 'Arendal',
        );
      default:
        throw LocationProviderException('unknown');
    }
  }
}

class _FlowApi extends ApiClient {
  _FlowApi() : super(baseUrl: 'http://example.test');

  Map<String, dynamic>? saved;
  Map<String, dynamic>? planned;
  String? recommendPath;
  int listCalls = 0;

  @override
  Future<List<dynamic>> getList(String path, {bool auth = true}) async {
    listCalls += 1;
    return const [];
  }

  @override
  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body, {
    bool auth = false,
  }) async {
    if (path == '/routes') {
      saved = body;
      return {'id': 'route-1'};
    }
    if (path.contains('/plan')) {
      planned = body;
      return {
        'plan': {'id': 'plan-1'},
      };
    }
    throw UnsupportedError(path);
  }

  @override
  Future<Map<String, dynamic>> patch(
    String path,
    Map<String, dynamic> body,
  ) async {
    saved = body;
    return {'id': 'route-1'};
  }

  @override
  Future<Map<String, dynamic>> get(String path, {bool auth = true}) async {
    recommendPath = path;
    return {
      'route': {
        'name': 'Airport swap',
        'startLabel': 'Arendal Trefoldighetskirke',
        'endLabel': 'Kristiansand lufthavn, Kjevik',
      },
      'weather': {
        'minTempC': 4,
        'maxTempC': 7,
        'maxRainProbPct': 20,
        'maxWindMs': 5,
      },
      'recommendation': {
        'engine': 'motorcycle_v1',
        'wear': <Map<String, dynamic>>[],
        'pack': <Map<String, dynamic>>[],
      },
    };
  }
}

class _NearbyResorts implements ResortDirectory {
  _NearbyResorts(this.hits);

  final List<SkiResort> hits;
  ({double lat, double lon})? lastNearby;

  @override
  Future<List<SkiResort>> searchByName(String query) async => const [];

  @override
  Future<List<SkiResort>> nearby({
    required double lat,
    required double lon,
  }) async {
    lastNearby = (lat: lat, lon: lon);
    return hits;
  }
}

class _ProfileApi extends ApiClient {
  _ProfileApi() : super(baseUrl: 'http://example.test');

  @override
  Future<Map<String, dynamic>> get(String path, {bool auth = true}) async {
    if (path == '/users/me') {
      return {
        'displayName': 'Ada',
        'authIdentities': [
          {'provider': 'local', 'providerEmail': 'ada@example.com'},
        ],
        'connectedAccounts': <Map<String, dynamic>>[],
        'profile': <String, dynamic>{},
      };
    }
    if (path == '/auth/providers') {
      return {
        'facebook': {'enabled': false},
        'microsoft': {'enabled': false},
        'demoOAuthAllowed': false,
      };
    }
    if (path == '/connections/status') {
      return {
        'strava': {'enabled': false},
      };
    }
    throw UnsupportedError(path);
  }
}
