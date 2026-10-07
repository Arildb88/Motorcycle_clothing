import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/features/routes/place_search_field.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/services/location/api_location_search_service.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';
import 'package:motorcycle_clothing/services/location/location_search_service.dart';

void main() {
  const arendal = PlaceSuggestion(
    providerPlaceId: 'whosonfirst:locality:arendal',
    primaryText: 'Arendal',
    secondaryText: 'Agder, Norway',
    label: 'Arendal, Agder, Norway',
    lat: 58.461,
    lon: 8.766,
    address: 'Arendal, Agder, Norway',
  );

  test(
    'autocomplete coordinates are parsed and a short query is not sent',
    () async {
      String? path;
      final search = ApiLocationSearchService(
        getList: (requested) async {
          path = requested;
          return [
            {
              'providerPlaceId': arendal.providerPlaceId,
              'primaryText': arendal.primaryText,
              'secondaryText': arendal.secondaryText,
              'label': arendal.label,
              'lat': 58.461,
              'lon': 8.766,
              'address': arendal.address,
            },
          ];
        },
        post: (_, _) async => throw StateError('resolve should not run'),
      );

      expect(await search.autocomplete('a'), isEmpty);
      final hits = await search.autocomplete('Arendal');
      expect(path, contains('q=Arendal'));
      expect(hits.single.hasCoordinates, isTrue);
      expect(hits.single.lat, closeTo(58.461, 0.0001));
      expect(hits.single.lon, closeTo(8.766, 0.0001));
      expect(hits.single.displayLabel, 'Arendal, Agder, Norway');

      final failing = ApiLocationSearchService(
        getList: (_) async => throw ApiException(
          'Place search is not configured on the server.',
          statusCode: 503,
          code: 'GEOCODING_NOT_CONFIGURED',
        ),
        post: (_, _) async => throw StateError('unused'),
      );
      expect(
        failing.autocomplete('Arendal'),
        throwsA(
          isA<LocationProviderException>().having(
            (error) => error.code,
            'code',
            'GEOCODING_NOT_CONFIGURED',
          ),
        ),
      );
    },
  );

  testWidgets('selecting Arendal uses suggestion coordinates', (tester) async {
    final search = _ScriptedSearch(hits: const [arendal]);
    final selected = await _selectArendal(tester, search);
    expect(search.resolveCalls, 0);
    expect(selected.providerPlaceId, arendal.providerPlaceId);
    expect(selected.label, 'Arendal, Agder, Norway');
    expect(selected.lat, closeTo(58.461, 0.0001));
    expect(selected.lon, closeTo(8.766, 0.0001));
    expect(find.text('Place search is temporarily unavailable.'), findsNothing);
  });

  testWidgets('an open keyboard does not drop the suggestion tap', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(400, 900);
    tester.view.devicePixelRatio = 1;
    tester.view.viewInsets = const FakeViewPadding(bottom: 320);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetViewInsets);

    final search = _ScriptedSearch(hits: const [arendal]);
    ResolvedPlace? selected;
    await tester.pumpWidget(
      _harness(search, onSelected: (place) => selected = place),
    );
    await tester.showKeyboard(find.byType(TextField));
    await tester.enterText(find.byType(TextField), 'arendal');
    await tester.pump(const Duration(milliseconds: 400));

    final tile = find.widgetWithText(ListTile, 'Arendal');
    final gesture = await tester.startGesture(tester.getCenter(tile));
    await tester.pump();
    expect(
      tester.widget<TextField>(find.byType(TextField)).focusNode!.hasFocus,
      isTrue,
    );
    await gesture.up();
    await tester.pump();

    expect(selected, isNotNull);
    expect(selected!.lat, closeTo(58.461, 0.0001));
    expect(selected!.lon, closeTo(8.766, 0.0001));
    expect(search.resolveCalls, 0);
  });

  testWidgets(
    'resolve rejection, empty result, and unexpected errors stay local',
    (tester) async {
      final search = _ScriptedSearch(
        hits: const [
          PlaceSuggestion(providerPlaceId: 'bare-id', primaryText: 'Arendal'),
        ],
      );
      search.resolveError = LocationProviderException(
        'down',
        code: 'GEOCODING_UNAVAILABLE',
      );
      await tester.pumpWidget(_harness(search, onSelected: (_) {}));
      await _typeAndTap(tester);
      expect(
        find.text('Place search is temporarily unavailable.'),
        findsOneWidget,
      );
      expect(find.text('down'), findsNothing);
      expect(find.text('Retry'), findsOneWidget);

      search.resolveError = null;
      search.resolveResult = const ResolvedPlace(
        providerPlaceId: 'bare-id',
        label: 'Arendal, Agder, Norway',
        lat: 58.461,
        lon: 8.766,
      );
      await tester.tap(find.text('Retry'));
      await tester.pump();
      expect(find.text('Arendal, Agder, Norway'), findsWidgets);
      expect(
        find.text('Place search is temporarily unavailable.'),
        findsNothing,
      );

      search.resolveResult = null;
      search.resolveError = LocationProviderException(
        'Place was not found.',
        code: 'PLACE_NOT_FOUND',
      );
      await tester.enterText(find.byType(TextField), 'arendal');
      await tester.pump(const Duration(milliseconds: 400));
      await tester.tap(find.widgetWithText(ListTile, 'Arendal'));
      await tester.pump();
      expect(
        find.text('That place could not be selected. Try again.'),
        findsOneWidget,
      );
      expect(
        find.text('Place search is temporarily unavailable.'),
        findsNothing,
      );

      search.resolveError = StateError('secret stack trace');
      await tester.tap(find.text('Retry'));
      await tester.pump();
      expect(find.text('Place search failed'), findsOneWidget);
      expect(find.textContaining('secret'), findsNothing);
      expect(find.textContaining('StateError'), findsNothing);
    },
  );

  testWidgets('clear or edit during resolve drops the stale place', (
    tester,
  ) async {
    final search = _ScriptedSearch(
      hits: const [
        PlaceSuggestion(providerPlaceId: 'bare-id', primaryText: 'Arendal'),
      ],
      holdResolve: true,
    );
    ResolvedPlace? selected;
    await tester.pumpWidget(
      _harness(search, onSelected: (place) => selected = place),
    );
    await _typeAndTap(tester);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await tester.tap(find.byTooltip('Clear'));
    await tester.pump();
    search.release(
      const ResolvedPlace(
        providerPlaceId: 'bare-id',
        label: 'Arendal, Agder, Norway',
        lat: 58.461,
        lon: 8.766,
      ),
    );
    await tester.pump();
    expect(selected, isNull);
    expect(find.byType(TextField).evaluate().single.widget, isA<TextField>());
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      isEmpty,
    );
    expect(find.byType(CircularProgressIndicator), findsNothing);

    await _typeAndTap(tester);
    await tester.enterText(find.byType(TextField), 'bo');
    await tester.pump();
    search.release(
      const ResolvedPlace(
        providerPlaceId: 'bare-id',
        label: 'Arendal, Agder, Norway',
        lat: 58.461,
        lon: 8.766,
      ),
    );
    await tester.pump();
    expect(selected, isNull);
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      'bo',
    );
    expect(find.byType(CircularProgressIndicator), findsNothing);
  });

  testWidgets('a swapped field ignores a resolve that finishes late', (
    tester,
  ) async {
    final search = _ScriptedSearch(
      hits: const [
        PlaceSuggestion(providerPlaceId: 'bare-id', primaryText: 'Arendal'),
      ],
      holdResolve: true,
    );
    ResolvedPlace? selected;
    String? display;
    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('en'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) {
              return Column(
                children: [
                  PlaceSearchField(
                    search: search,
                    label: 'Start',
                    initialDisplay: display,
                    onSelected: (place) => setState(() => selected = place),
                  ),
                  TextButton(
                    onPressed: () => setState(() => display = 'Kristiansand'),
                    child: const Text('Swap'),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
    await _typeAndTap(tester);
    await tester.tap(find.text('Swap'));
    await tester.pump();
    search.release(
      const ResolvedPlace(
        providerPlaceId: 'bare-id',
        label: 'Arendal, Agder, Norway',
        lat: 58.461,
        lon: 8.766,
      ),
    );
    await tester.pump();
    expect(selected, isNull);
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      'Kristiansand',
    );
  });

  testWidgets('configuration failure is not shown as a temporary outage', (
    tester,
  ) async {
    final search = _ScriptedSearch(
      autocompleteError: LocationProviderException(
        'Place search is not configured on the server.',
        code: 'GEOCODING_NOT_CONFIGURED',
      ),
    );
    await tester.pumpWidget(_harness(search, onSelected: (_) {}));
    await tester.enterText(find.byType(TextField), 'arendal');
    await tester.pump(const Duration(milliseconds: 400));
    expect(
      find.text('Place search is not configured on the server.'),
      findsOneWidget,
    );
    expect(find.text('Place search is temporarily unavailable.'), findsNothing);
    expect(find.text('Retry'), findsOneWidget);
    expect(find.textContaining('ORS_API_KEY'), findsNothing);
  });
}

Future<ResolvedPlace> _selectArendal(
  WidgetTester tester,
  _ScriptedSearch search,
) async {
  ResolvedPlace? selected;
  await tester.pumpWidget(
    _harness(search, onSelected: (place) => selected = place),
  );
  await _typeAndTap(tester);
  expect(selected, isNotNull);
  return selected!;
}

Future<void> _typeAndTap(WidgetTester tester) async {
  await tester.enterText(find.byType(TextField), 'arendal');
  await tester.pump(const Duration(milliseconds: 400));
  await tester.tap(find.widgetWithText(ListTile, 'Arendal'));
  await tester.pump();
}

Widget _harness(
  LocationSearchService search, {
  required PlaceSelected onSelected,
  String? initialDisplay,
}) {
  return MaterialApp(
    locale: const Locale('en'),
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: Scaffold(
      body: PlaceSearchField(
        search: search,
        label: 'Start',
        initialDisplay: initialDisplay,
        onSelected: onSelected,
      ),
    ),
  );
}

class _ScriptedSearch implements LocationSearchService {
  _ScriptedSearch({
    this.hits = const [],
    this.holdResolve = false,
    this.autocompleteError,
  });

  final List<PlaceSuggestion> hits;
  final bool holdResolve;
  final LocationProviderException? autocompleteError;
  int resolveCalls = 0;
  ResolvedPlace? resolveResult;
  Object? resolveError;
  Completer<ResolvedPlace>? _pending;

  void release(ResolvedPlace place) {
    final pending = _pending;
    _pending = null;
    pending?.complete(place);
  }

  @override
  Future<List<PlaceSuggestion>> autocomplete(
    String query, {
    String? sessionToken,
  }) async {
    final error = autocompleteError;
    if (error != null) throw error;
    if (query.toLowerCase().contains('arendal')) return hits;
    return const [];
  }

  @override
  Future<ResolvedPlace> resolve(PlaceSuggestion suggestion) {
    resolveCalls += 1;
    final error = resolveError;
    if (error != null) return Future.error(error);
    if (holdResolve) {
      final pending = Completer<ResolvedPlace>();
      _pending = pending;
      return pending.future;
    }
    final result = resolveResult;
    if (result == null) {
      return Future.error(StateError('missing fixture'));
    }
    return Future.value(result);
  }
}
