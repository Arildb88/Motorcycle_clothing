import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:motorcycle_clothing/features/plan/device_location_service.dart';
import 'package:motorcycle_clothing/features/plan/resort_discovery.dart';
import 'package:motorcycle_clothing/features/plan/ride_planner_screen.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/location/fake_location_services.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';
import 'package:motorcycle_clothing/services/location/location_search_service.dart';
import 'package:motorcycle_clothing/services/location/location_services.dart';
import 'package:motorcycle_clothing/services/resorts/api_resort_directory.dart';
import 'package:motorcycle_clothing/services/resorts/resort_directory.dart';
import 'package:motorcycle_clothing/services/resorts/ski_resort.dart';
import 'package:provider/provider.dart';

const _al = SkiResort(
  id: '141',
  name: 'Ål Skisenter',
  lat: 60.6301,
  lon: 8.5604,
);

const _hemsedal = SkiResort(
  id: '5',
  name: 'SkiStar Hemsedal',
  lat: 60.8601,
  lon: 8.5178,
  straightLineDistanceM: 26690,
);

const _nearbyAl = SkiResort(
  id: '141',
  name: 'Ål Skisenter',
  lat: 60.6301,
  lon: 8.5604,
  straightLineDistanceM: 18432,
);

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  test('resort search keeps Norwegian names in one UTF-8 encoding', () {
    final path = resortSearchPath('Ål');
    expect(Uri.parse('http://example.test$path').queryParameters['q'], 'Ål');
    expect(path, contains('%C3%85l'));
    expect(path, isNot(contains('%25C3')));
  });

  test('straight-line distance is not labeled as driving distance', () {
    final l10n = lookupAppLocalizations(const Locale('en'));
    expect(resortResultSubtitle(l10n, _hemsedal), '26.7 km in a straight line');
    expect(resortResultSubtitle(l10n, _hemsedal), isNot(contains('driving')));
    expect(
      resortResultSubtitle(
        l10n,
        const SkiResort(
          id: '1',
          name: 'Near',
          lat: 1,
          lon: 2,
          straightLineDistanceM: 400,
        ),
      ),
      '400 m in a straight line',
    );
    expect(resortResultSubtitle(l10n, _al), isNull);
    expect(_al.lat, 60.6301);
    expect(_al.lon, 8.5604);

    final nb = lookupAppLocalizations(const Locale('nb'));
    expect(resortResultSubtitle(nb, _hemsedal), '26.7 km i luftlinje');
  });

  testWidgets('name search keeps Ål and waits for an explicit choice', (
    tester,
  ) async {
    final directory = _ScriptedDirectory(searchHits: const [_al, _hemsedal]);
    SkiResort? selected;
    await _pump(
      tester,
      directory: directory,
      onSelected: (resort) => selected = resort,
    );

    await tester.enterText(find.byType(TextField).first, 'Ål');
    await tester.pump(const Duration(milliseconds: 400));

    expect(directory.queries, ['Ål']);
    expect(find.text('Ål Skisenter'), findsOneWidget);
    expect(find.text('SkiStar Hemsedal'), findsOneWidget);
    expect(selected, isNull);
    expect(find.textContaining('Selected resort'), findsNothing);

    await tester.tap(find.text('Ål Skisenter'));
    await tester.pump();
    expect(selected?.id, '141');
    expect(selected?.name, 'Ål Skisenter');
  });

  testWidgets('nearby results list every resort and require a choice', (
    tester,
  ) async {
    final directory = _ScriptedDirectory(
      nearbyHits: const [_hemsedal, _nearbyAl],
    );
    final chosen = <SkiResort>[];
    await _pump(
      tester,
      directory: directory,
      deviceLocation: FakeDeviceLocationService(
        place: const ResolvedPlace(
          providerPlaceId: 'device:61.1,8.5',
          label: 'Current location',
          lat: 61.1,
          lon: 8.5,
        ),
      ),
      onSelected: chosen.add,
    );

    expect(find.text('Resort information from Fnugg.no'), findsOneWidget);
    await tester.tap(find.text('Find resorts nearby'));
    await tester.pump();
    await tester.pump();

    expect(directory.lastNearby?.lat, 61.1);
    expect(directory.lastNearby?.lon, 8.5);
    expect(find.text('SkiStar Hemsedal'), findsOneWidget);
    expect(find.text('Ål Skisenter'), findsOneWidget);
    expect(find.text('26.7 km in a straight line'), findsOneWidget);
    expect(find.text('18.4 km in a straight line'), findsOneWidget);
    expect(chosen, isEmpty);

    await tester.tap(find.text('Ål Skisenter'));
    await tester.pump();
    expect(chosen.single.name, 'Ål Skisenter');
  });

  testWidgets('a selected place lists nearby resorts for an explicit choice', (
    tester,
  ) async {
    final directory = _ScriptedDirectory(
      nearbyHits: const [_hemsedal, _nearbyAl],
    );
    final chosen = <SkiResort>[];
    await _pump(
      tester,
      directory: directory,
      places: _OnePlace(),
      onSelected: chosen.add,
    );

    final near = find.byWidgetPredicate(
      (widget) =>
          widget is TextField && widget.decoration?.labelText == 'Near a place',
    );
    await tester.enterText(near, 'Hemsedal');
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.text('Hemsedal sentrum'));
    await tester.pump();
    await tester.pump();

    expect(directory.lastNearby?.lat, 60.86);
    expect(directory.lastNearby?.lon, 8.56);
    expect(find.text('SkiStar Hemsedal'), findsOneWidget);
    expect(find.text('Ål Skisenter'), findsOneWidget);
    expect(chosen, isEmpty);

    await tester.tap(find.text('SkiStar Hemsedal'));
    await tester.pump();
    expect(chosen.single.id, '5');
  });

  testWidgets('empty and failed searches do not invent resorts', (
    tester,
  ) async {
    final directory = _HoldingDirectory();
    await _pump(tester, directory: directory);

    await tester.enterText(find.byType(TextField).first, 'Oppdal');
    await tester.pump(const Duration(milliseconds: 400));
    directory.completeSearch(const []);
    await tester.pump();
    expect(find.text('No ski resorts found.'), findsOneWidget);
    expect(find.text('Ål Skisenter'), findsNothing);

    await tester.enterText(find.byType(TextField).first, 'Hemsedal');
    await tester.pump(const Duration(milliseconds: 400));
    directory.failSearch(
      ResortDirectoryException('down', code: 'RESORTS_UNAVAILABLE'),
    );
    await tester.pump();
    expect(
      find.text('Ski resort search is temporarily unavailable.'),
      findsOneWidget,
    );
    expect(find.text('No ski resorts found.'), findsNothing);
    expect(find.text('Resort information from Fnugg.no'), findsOneWidget);
  });

  testWidgets('a newer failure replaces a previous resort list', (
    tester,
  ) async {
    final directory = _HoldingDirectory();
    await _pump(tester, directory: directory);

    await tester.enterText(find.byType(TextField).first, 'Ål');
    await tester.pump(const Duration(milliseconds: 400));
    directory.completeSearch(const [_al]);
    await tester.pump();
    expect(find.text('Ål Skisenter'), findsOneWidget);

    await tester.enterText(find.byType(TextField).first, 'zzz');
    await tester.pump(const Duration(milliseconds: 400));
    directory.failSearch(ResortDirectoryException('down'));
    await tester.pump();
    expect(find.text('Ål Skisenter'), findsNothing);
    expect(
      find.text('Ski resort search is temporarily unavailable.'),
      findsOneWidget,
    );
  });

  testWidgets('alpine planner selects a resort and keeps the session flow', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final directory = _ScriptedDirectory(searchHits: const [_al]);
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          Provider<LocationServices>.value(
            value: LocationServices(
              search: _QuietPlaces(),
              geometry: FakeRouteGeometryService(),
            ),
          ),
          Provider<DeviceLocationService>.value(
            value: FakeDeviceLocationService(),
          ),
          Provider<ResortDirectory>.value(value: directory),
        ],
        child: MaterialApp(
          locale: const Locale('en'),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: const RidePlannerScreen(activityType: 'alpine_skiing'),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Destination'), findsNothing);
    expect(find.text('Avoid motorways'), findsNothing);
    expect(find.text('Lifts'), findsNothing);
    expect(find.text('Where you spend time'), findsNothing);
    expect(find.text('How long are you active?'), findsOneWidget);
    expect(find.text('Session length'), findsNothing);
    expect(find.text('Resort information from Fnugg.no'), findsOneWidget);

    final name = find.byWidgetPredicate(
      (widget) =>
          widget is TextField && widget.decoration?.labelText == 'Ski resort',
    );
    await tester.enterText(name, 'Ål');
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.text('Ål Skisenter'));
    await tester.pump();

    expect(find.text('Selected resort: Ål Skisenter'), findsNothing);
    expect(find.textContaining('60.63'), findsNothing);
    expect(find.text('Ål Skisenter'), findsWidgets);
    expect(
      tester
          .widget<Icon>(
            find.descendant(
              of: find.byKey(const ValueKey('resort-141')),
              matching: find.byType(Icon),
            ),
          )
          .icon,
      Icons.check_circle,
    );
    final analyze = find.widgetWithText(FilledButton, 'Analyze ride');
    await tester.ensureVisible(analyze);
    final button = tester.widget<FilledButton>(analyze);
    expect(button.onPressed, isNotNull);
  });
}

Future<void> _pump(
  WidgetTester tester, {
  required ResortDirectory directory,
  DeviceLocationService? deviceLocation,
  LocationSearchService? places,
  ValueChanged<SkiResort>? onSelected,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      locale: const Locale('en'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(
        body: ListView(
          children: [
            ResortDiscoverySection(
              directory: directory,
              deviceLocation: deviceLocation ?? FakeDeviceLocationService(),
              places: places ?? _QuietPlaces(),
              onSelected: onSelected ?? (_) {},
              selectedResortId: null,
            ),
          ],
        ),
      ),
    ),
  );
  await tester.pump();
}

class _ScriptedDirectory implements ResortDirectory {
  _ScriptedDirectory({this.searchHits = const [], this.nearbyHits = const []});

  final List<SkiResort> searchHits;
  final List<SkiResort> nearbyHits;
  final List<String> queries = [];
  ({double lat, double lon})? lastNearby;

  @override
  Future<List<SkiResort>> searchByName(String query) async {
    queries.add(query);
    return searchHits;
  }

  @override
  Future<List<SkiResort>> nearby({
    required double lat,
    required double lon,
  }) async {
    lastNearby = (lat: lat, lon: lon);
    return nearbyHits;
  }
}

class _HoldingDirectory implements ResortDirectory {
  final List<Completer<List<SkiResort>>> _pending = [];

  void completeSearch(List<SkiResort> hits) {
    _pending.removeAt(0).complete(hits);
  }

  void failSearch(ResortDirectoryException error) {
    _pending.removeAt(0).completeError(error);
  }

  @override
  Future<List<SkiResort>> searchByName(String query) {
    final waiter = Completer<List<SkiResort>>();
    _pending.add(waiter);
    return waiter.future;
  }

  @override
  Future<List<SkiResort>> nearby({
    required double lat,
    required double lon,
  }) async {
    return const [];
  }
}

class _OnePlace implements LocationSearchService {
  @override
  Future<List<PlaceSuggestion>> autocomplete(
    String query, {
    String? sessionToken,
  }) async {
    return const [
      PlaceSuggestion(
        providerPlaceId: 'hemsedal',
        primaryText: 'Hemsedal sentrum',
      ),
    ];
  }

  @override
  Future<ResolvedPlace> resolve(PlaceSuggestion suggestion) async {
    return const ResolvedPlace(
      providerPlaceId: 'hemsedal',
      label: 'Hemsedal sentrum',
      lat: 60.86,
      lon: 8.56,
    );
  }
}

class _QuietPlaces implements LocationSearchService {
  @override
  Future<List<PlaceSuggestion>> autocomplete(
    String query, {
    String? sessionToken,
  }) async {
    return const [];
  }

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
