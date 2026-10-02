import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:motorcycle_clothing/features/plan/device_location_service.dart';
import 'package:motorcycle_clothing/features/plan/ride_planner_screen.dart';
import 'package:motorcycle_clothing/features/plan/trail_discovery.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/location/fake_location_services.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';
import 'package:motorcycle_clothing/services/location/location_search_service.dart';
import 'package:motorcycle_clothing/services/location/location_services.dart';
import 'package:motorcycle_clothing/services/resorts/resort_directory.dart';
import 'package:motorcycle_clothing/services/resorts/ski_resort.dart';
import 'package:motorcycle_clothing/services/trails/api_trail_directory.dart';
import 'package:motorcycle_clothing/services/trails/ski_trail.dart';
import 'package:motorcycle_clothing/services/trails/trail_directory.dart';
import 'package:provider/provider.dart';

const _al = SkiTrail(
  id: 'al-1',
  name: 'Ål-løypa',
  lat: 59.99,
  lon: 10.7,
  straightLineDistanceM: 1112,
  line: [
    SkiTrailPoint(lat: 59.99, lon: 10.7),
    SkiTrailPoint(lat: 59.991, lon: 10.701),
  ],
);

const _try = SkiTrail(
  id: 'try-1',
  name: 'TRY-løypa',
  lat: 59.982,
  lon: 10.654,
  straightLineDistanceM: 2580,
  line: [
    SkiTrailPoint(lat: 59.981809, lon: 10.653763),
    SkiTrailPoint(lat: 59.982, lon: 10.654),
  ],
);

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  test('nearby trail path keeps the coordinates', () {
    final path = trailNearbyPath(lat: 59.98, lon: 10.7);
    final query = Uri.parse('http://example.test$path').queryParameters;
    expect(query['lat'], '59.98');
    expect(query['lon'], '10.7');
    expect(path, startsWith('/trails/nearby?'));
  });

  test('straight-line distance is not labeled as driving distance', () {
    final l10n = lookupAppLocalizations(const Locale('en'));
    expect(trailResultSubtitle(l10n, _al), '1.1 km in a straight line');
    expect(trailResultSubtitle(l10n, _al), isNot(contains('driving')));
    expect(
      trailResultSubtitle(
        l10n,
        const SkiTrail(
          id: 'near',
          name: 'Nær',
          lat: 1,
          lon: 2,
          straightLineDistanceM: 400,
          line: [
            SkiTrailPoint(lat: 1, lon: 2),
            SkiTrailPoint(lat: 1.001, lon: 2),
          ],
        ),
      ),
      '400 m in a straight line',
    );
    final nb = lookupAppLocalizations(const Locale('nb'));
    expect(nb.plannerTrailNearby, 'Finn løype i nærheten');
    expect(nb.plannerTrailManual, 'Planlegg egen tur');
    expect(trailResultSubtitle(nb, _al), '1.1 km i luftlinje');
  });

  testWidgets('nearby trails stay listed until the user chooses one', (
    tester,
  ) async {
    final directory = _ScriptedDirectory(nearbyHits: const [_al, _try]);
    SkiTrail? selected;
    await _pump(
      tester,
      directory: directory,
      deviceLocation: FakeDeviceLocationService(
        place: const ResolvedPlace(
          providerPlaceId: 'device:59.98,10.7',
          label: 'Current location',
          lat: 59.98,
          lon: 10.7,
        ),
      ),
      onSelected: (trail) => selected = trail,
    );

    await tester.tap(find.text('Use current location'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 20));

    expect(directory.lastNearby?.lat, 59.98);
    expect(directory.lastNearby?.lon, 10.7);
    expect(find.text('Ål-løypa'), findsOneWidget);
    expect(find.text('TRY-løypa'), findsOneWidget);
    expect(find.text('1.1 km in a straight line'), findsOneWidget);
    expect(selected, isNull);
    expect(find.textContaining('grooming'), findsNothing);
    expect(find.textContaining('preparering'), findsNothing);

    await tester.tap(find.text('Ål-løypa'));
    await tester.pump();
    expect(selected?.id, 'al-1');
    expect(selected?.name, 'Ål-løypa');
  });

  testWidgets('a place search uses that place as the nearby origin', (
    tester,
  ) async {
    final directory = _ScriptedDirectory(nearbyHits: const [_al]);
    await _pump(tester, directory: directory, places: _OnePlace());

    await tester.enterText(find.byType(TextField).first, 'Ål');
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.text('Ål sentrum'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 20));

    expect(directory.lastNearby?.lat, 60.63);
    expect(directory.lastNearby?.lon, 8.56);
    expect(find.text('Ål-løypa'), findsOneWidget);
  });

  testWidgets('empty and unavailable responses do not invent trails', (
    tester,
  ) async {
    final empty = _ScriptedDirectory(nearbyHits: const []);
    await _pump(
      tester,
      directory: empty,
      deviceLocation: FakeDeviceLocationService(
        place: const ResolvedPlace(
          providerPlaceId: 'device:70,20',
          label: 'Current location',
          lat: 70,
          lon: 20,
        ),
      ),
    );
    await tester.tap(find.text('Use current location'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 20));
    expect(find.text('No ski trails found.'), findsOneWidget);
    expect(find.text('Ål-løypa'), findsNothing);

    final directory = _HoldingDirectory();
    await _pump(
      tester,
      directory: directory,
      deviceLocation: FakeDeviceLocationService(
        place: const ResolvedPlace(
          providerPlaceId: 'device:59.98,10.7',
          label: 'Current location',
          lat: 59.98,
          lon: 10.7,
        ),
      ),
    );
    await tester.tap(find.text('Use current location'));
    await tester.pump();
    directory.complete(const [_al]);
    await tester.pump();
    expect(find.text('Ål-løypa'), findsOneWidget);

    await tester.tap(find.text('Use current location'));
    await tester.pump();
    directory.fail(TrailDirectoryException('down'));
    await tester.pump();
    expect(find.text('Ål-løypa'), findsNothing);
    expect(
      find.text('Ski trail search is temporarily unavailable.'),
      findsOneWidget,
    );
  });

  testWidgets('denied location stays explicit', (tester) async {
    await _pump(
      tester,
      directory: _ScriptedDirectory(),
      deviceLocation: FakeDeviceLocationService(
        failure: DeviceLocationFailure.permissionDenied,
      ),
    );
    await tester.tap(find.text('Use current location'));
    await tester.pump();
    expect(
      find.text(
        'Location permission was denied. You can still search near a place, or plan your own trip.',
      ),
      findsOneWidget,
    );
    expect(find.text('No ski trails found.'), findsNothing);
  });

  testWidgets('cross-country planner keeps manual planning and trail choice', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 2000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final directory = _ScriptedDirectory(nearbyHits: const [_al, _try]);
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
            value: FakeDeviceLocationService(
              place: const ResolvedPlace(
                providerPlaceId: 'device:59.98,10.7',
                label: 'Current location',
                lat: 59.98,
                lon: 10.7,
              ),
            ),
          ),
          Provider<ResortDirectory>.value(value: _QuietResorts()),
          Provider<TrailDirectory>.value(value: directory),
        ],
        child: const MaterialApp(
          locale: Locale('en'),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: RidePlannerScreen(activityType: 'xc_skiing'),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Find a trail nearby'), findsOneWidget);
    expect(find.text('Plan your own trip'), findsOneWidget);
    expect(find.text('Start'), findsWidgets);
    expect(find.text('Destination'), findsWidgets);
    expect(find.text('Classic'), findsWidgets);
    expect(find.text('Avoid motorways'), findsNothing);

    await tester.tap(find.text('Find a trail nearby'));
    await tester.pump();
    expect(find.text('Start'), findsNothing);
    expect(find.text('Trail information from Kartverket'), findsOneWidget);

    await tester.tap(find.text('Use current location'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 20));
    expect(find.text('Ål-løypa'), findsOneWidget);
    expect(find.text('TRY-løypa'), findsOneWidget);
    expect(find.textContaining('grooming'), findsNothing);

    await tester.tap(find.text('Ål-løypa'));
    await tester.pump();
    expect(find.text('Selected trail: Ål-løypa'), findsOneWidget);
    final analyze = find.widgetWithText(FilledButton, 'Analyze ride');
    await tester.ensureVisible(analyze);
    expect(tester.widget<FilledButton>(analyze).onPressed, isNotNull);

    await tester.tap(find.text('Plan your own trip'));
    await tester.pump();
    expect(find.text('Start'), findsWidgets);
    expect(find.text('Destination'), findsWidgets);
    expect(find.text('Trail information from Kartverket'), findsNothing);
  });
}

Future<void> _pump(
  WidgetTester tester, {
  required TrailDirectory directory,
  DeviceLocationService? deviceLocation,
  LocationSearchService? places,
  ValueChanged<SkiTrail>? onSelected,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      locale: const Locale('en'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(
        body: ListView(
          children: [
            TrailDiscoverySection(
              directory: directory,
              deviceLocation: deviceLocation ?? FakeDeviceLocationService(),
              places: places ?? _QuietPlaces(),
              onSelected: onSelected ?? (_) {},
            ),
          ],
        ),
      ),
    ),
  );
  await tester.pump();
}

class _ScriptedDirectory implements TrailDirectory {
  _ScriptedDirectory({this.nearbyHits = const []});

  final List<SkiTrail> nearbyHits;
  ({double lat, double lon})? lastNearby;

  @override
  Future<List<SkiTrail>> nearby({
    required double lat,
    required double lon,
  }) async {
    lastNearby = (lat: lat, lon: lon);
    return nearbyHits;
  }
}

class _HoldingDirectory implements TrailDirectory {
  final List<Completer<List<SkiTrail>>> _pending = [];

  void complete(List<SkiTrail> hits) {
    _pending.removeAt(0).complete(hits);
  }

  void fail(TrailDirectoryException error) {
    _pending.removeAt(0).completeError(error);
  }

  @override
  Future<List<SkiTrail>> nearby({
    required double lat,
    required double lon,
  }) {
    final waiter = Completer<List<SkiTrail>>();
    _pending.add(waiter);
    return waiter.future;
  }
}

class _OnePlace implements LocationSearchService {
  @override
  Future<List<PlaceSuggestion>> autocomplete(
    String query, {
    String? sessionToken,
  }) async {
    return const [
      PlaceSuggestion(providerPlaceId: 'al', primaryText: 'Ål sentrum'),
    ];
  }

  @override
  Future<ResolvedPlace> resolve(PlaceSuggestion suggestion) async {
    return const ResolvedPlace(
      providerPlaceId: 'al',
      label: 'Ål sentrum',
      lat: 60.63,
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

class _QuietResorts implements ResortDirectory {
  @override
  Future<List<SkiResort>> searchByName(String query) async => const [];

  @override
  Future<List<SkiResort>> nearby({
    required double lat,
    required double lon,
  }) async => const [];
}
