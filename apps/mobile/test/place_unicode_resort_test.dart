import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:motorcycle_clothing/features/plan/device_location_service.dart';
import 'package:motorcycle_clothing/features/plan/resort_discovery.dart';
import 'package:motorcycle_clothing/features/routes/place_query_field.dart';
import 'package:motorcycle_clothing/features/routes/place_search_field.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/location/api_location_search_service.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';
import 'package:motorcycle_clothing/services/location/location_search_service.dart';
import 'package:motorcycle_clothing/services/resorts/api_resort_directory.dart';
import 'package:motorcycle_clothing/services/resorts/resort_directory.dart';
import 'package:motorcycle_clothing/services/resorts/ski_resort.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  test('a cleared or composing parent update keeps the typed query', () {
    expect(
      shouldKeepTypedPlaceQuery(
        previousDisplay: 'Arendal',
        nextDisplay: '',
        typed: 'Å',
        composing: false,
      ),
      isTrue,
    );
    expect(
      shouldKeepTypedPlaceQuery(
        previousDisplay: '',
        nextDisplay: 'Kongsberg',
        typed: 'Å',
        composing: true,
      ),
      isTrue,
    );
    expect(
      shouldKeepTypedPlaceQuery(
        previousDisplay: 'Arendal',
        nextDisplay: 'Kongsberg',
        typed: 'Arendal',
        composing: false,
      ),
      isFalse,
    );
  });

  test('place and resort queries encode Norwegian names once', () {
    for (final name in ['Åmli', 'Øyer', 'Sæby', 'ÆØÅ']) {
      for (final path in [locationPlacesPath(name), resortSearchPath(name)]) {
        final uri = Uri.parse('http://example.test$path');
        expect(uri.queryParameters['q'], name);
        expect(path, isNot(contains('%25')));
      }
    }
    expect(locationPlacesPath('Åmli'), contains('%C3%85mli'));
    expect(resortSearchPath('Øyer'), contains('%C3%98yer'));
    expect(locationPlacesPath('Sæby'), contains('S%C3%A6by'));
    expect(resortSearchPath('ÆØÅ'), contains('%C3%86%C3%98%C3%85'));
  });

  testWidgets('place fields keep Norwegian letters and an open composition', (
    tester,
  ) async {
    final controller = TextEditingController();
    addTearDown(controller.dispose);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: PlaceQueryField(
            controller: controller,
            decoration: const InputDecoration(labelText: 'Start'),
          ),
        ),
      ),
    );

    final field = tester.widget<TextField>(find.byType(TextField));
    expect(field.enableSuggestions, isTrue);
    expect(field.autocorrect, isFalse);
    expect(field.inputFormatters, isEmpty);

    for (final name in ['Åmli', 'Øyer', 'Sæby', 'ÆØÅ']) {
      await tester.enterText(find.byType(TextField), name);
      await tester.pump();
      expect(controller.text, name);
    }

    await tester.showKeyboard(find.byType(TextField));
    tester.testTextInput.updateEditingValue(
      const TextEditingValue(
        text: 'A',
        selection: TextSelection.collapsed(offset: 1),
        composing: TextRange(start: 0, end: 1),
      ),
    );
    await tester.pump();
    tester.testTextInput.updateEditingValue(
      const TextEditingValue(
        text: 'Åmli',
        selection: TextSelection.collapsed(offset: 4),
      ),
    );
    await tester.pump();
    expect(controller.text, 'Åmli');

    await tester.enterText(find.byType(TextField), 'A\u030Amli');
    await tester.pump();
    expect(controller.text, isNot('Amli'));
    expect(
      controller.text.runes.any((rune) => rune == 0xC5 || rune == 0x30A),
      isTrue,
    );
  });

  testWidgets('typing Åmli survives a cleared selection', (tester) async {
    String? display = 'Arendal';
    final search = _QuietSearch();
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) {
              return PlaceSearchField(
                search: search,
                label: 'Start',
                initialDisplay: display,
                onCleared: () => setState(() => display = null),
              );
            },
          ),
        ),
      ),
    );

    await tester.enterText(find.byType(TextField), 'Åmli');
    await tester.pump();
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      'Åmli',
    );
    expect(display, isNull);
  });

  testWidgets('Åmli empty is not an outage, and a stale hit is dropped', (
    tester,
  ) async {
    final search = _HoldingSearch();
    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('nb'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: PlaceSearchField(search: search, label: 'Start'),
        ),
      ),
    );

    await tester.enterText(find.byType(TextField), 'Åmli');
    await tester.pump(const Duration(milliseconds: 400));
    await tester.enterText(find.byType(TextField), 'Øyer');
    await tester.pump(const Duration(milliseconds: 400));
    expect(search.queries, ['Åmli', 'Øyer']);

    search.complete(0, const [
      PlaceSuggestion(providerPlaceId: 'amli', primaryText: 'Åmli'),
    ]);
    await tester.pump();
    expect(find.text('Åmli'), findsNothing);
    expect(find.text('Ingen steder funnet'), findsNothing);

    search.complete(0, const []);
    await tester.pump();
    expect(find.text('Ingen steder funnet'), findsOneWidget);
    expect(find.text('Prøv igjen'), findsNothing);
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      'Øyer',
    );

    await tester.enterText(find.byType(TextField), 'Sæby');
    await tester.pump(const Duration(milliseconds: 400));
    search.fail(
      0,
      LocationProviderException(
        'Stedsøk er midlertidig utilgjengelig.',
        code: 'GEOCODING_UNAVAILABLE',
      ),
    );
    await tester.pump();
    expect(find.text('Stedsøk er midlertidig utilgjengelig.'), findsOneWidget);
    expect(find.text('Prøv igjen'), findsOneWidget);
    expect(find.text('Ingen steder funnet'), findsNothing);
  });

  testWidgets(
    'Kongsberg stays an empty resort result with retry only on outage',
    (tester) async {
      final directory = _HoldingDirectory();
      SkiResort? selected;
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
                      directory: directory,
                      deviceLocation: FakeDeviceLocationService(),
                      places: _QuietSearch(),
                      selectedResortId: selected?.id,
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

      final name = find.byWidgetPredicate(
        (widget) =>
            widget is TextField && widget.decoration?.labelText == 'Skianlegg',
      );
      await tester.enterText(name, 'Åmli');
      await tester.pump(const Duration(milliseconds: 400));
      await tester.enterText(name, 'Kongsberg');
      await tester.pump(const Duration(milliseconds: 400));
      expect(directory.queries, ['Åmli', 'Kongsberg']);

      directory.complete(const [
        SkiResort(id: '1', name: 'Åmli Alpin', lat: 58.7, lon: 8.4),
      ]);
      await tester.pump();
      expect(find.text('Åmli Alpin'), findsNothing);

      directory.complete(const []);
      await tester.pump();
      expect(find.text('Fant ingen skianlegg.'), findsOneWidget);
      expect(find.text('Prøv igjen'), findsNothing);
      expect(selected, isNull);
      expect(tester.widget<TextField>(name).controller!.text, 'Kongsberg');

      await tester.enterText(name, 'Sæby');
      await tester.pump(const Duration(milliseconds: 400));
      directory.fail(ResortDirectoryException('down'));
      await tester.pump();
      expect(
        find.text('Søk etter skianlegg er midlertidig utilgjengelig.'),
        findsOneWidget,
      );
      expect(find.text('Fant ingen skianlegg.'), findsNothing);
      expect(find.text('Prøv igjen'), findsOneWidget);

      await tester.tap(find.text('Prøv igjen'));
      await tester.pump();
      expect(directory.queries.last, 'Sæby');
      directory.complete(const [
        SkiResort(id: '141', name: 'Ål Skisenter', lat: 60.6301, lon: 8.5604),
      ]);
      await tester.pump();
      await tester.tap(find.text('Ål Skisenter'));
      await tester.pump();
      expect(selected?.id, '141');
      expect(selected?.lat, closeTo(60.6301, 0.0001));
      expect(selected?.lon, closeTo(8.5604, 0.0001));
      expect(find.text('Valgt skianlegg: Ål Skisenter'), findsNothing);
      expect(find.textContaining('60.63'), findsNothing);
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
    },
  );
}

class _QuietSearch implements LocationSearchService {
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

class _HoldingSearch implements LocationSearchService {
  final List<String> queries = [];
  final List<Completer<List<PlaceSuggestion>>> _pending = [];

  void complete(int index, List<PlaceSuggestion> hits) {
    _pending.removeAt(index).complete(hits);
  }

  void fail(int index, LocationProviderException error) {
    _pending.removeAt(index).completeError(error);
  }

  @override
  Future<List<PlaceSuggestion>> autocomplete(
    String query, {
    String? sessionToken,
  }) {
    queries.add(query);
    final waiter = Completer<List<PlaceSuggestion>>();
    _pending.add(waiter);
    return waiter.future;
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

class _HoldingDirectory implements ResortDirectory {
  final List<String> queries = [];
  final List<Completer<List<SkiResort>>> _pending = [];

  void complete(List<SkiResort> hits) {
    _pending.removeAt(0).complete(hits);
  }

  void fail(ResortDirectoryException error) {
    _pending.removeAt(0).completeError(error);
  }

  @override
  Future<List<SkiResort>> searchByName(String query) {
    queries.add(query);
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
