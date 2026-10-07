import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:motorcycle_clothing/features/plan/device_location_service.dart';
import 'package:motorcycle_clothing/features/plan/fnugg_attribution_link.dart';
import 'package:motorcycle_clothing/features/plan/recommendation_presentation.dart';
import 'package:motorcycle_clothing/features/plan/recommendation_sections.dart';
import 'package:motorcycle_clothing/features/plan/resort_discovery.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';
import 'package:motorcycle_clothing/services/location/location_search_service.dart';
import 'package:motorcycle_clothing/services/resorts/api_resort_directory.dart';
import 'package:motorcycle_clothing/services/resorts/fnugg_source.dart';
import 'package:motorcycle_clothing/services/resorts/resort_directory.dart';
import 'package:motorcycle_clothing/services/resorts/ski_resort.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  test('attribution accepts only official Fnugg pages', () {
    expect(
      fnuggAttributionUri('https://fnugg.no/trysil/'),
      Uri.parse('https://fnugg.no/trysil/'),
    );
    expect(
      fnuggAttributionUri('https://fnugg.no/oslo-vinterpark/'),
      Uri.parse('https://fnugg.no/oslo-vinterpark/'),
    );
    expect(fnuggAttributionUri(null), fnuggHomeUri);
    expect(fnuggAttributionUri(''), fnuggHomeUri);
    expect(fnuggAttributionUri('https://fnugg.no'), fnuggHomeUri);
    expect(fnuggAttributionUri('https://evil.test/trysil/'), fnuggHomeUri);
    expect(fnuggAttributionUri('http://fnugg.no/trysil/'), fnuggHomeUri);
    expect(fnuggAttributionUri('https://fnugg.no/trysil/extra/'), fnuggHomeUri);
    expect(fnuggAttributionUri('https://www.fnugg.no/trysil/'), fnuggHomeUri);
  });

  test('resort payload keeps a Fnugg page and drops other urls', () async {
    final directory = ApiResortDirectory((path) async {
      return {
        'resorts': [
          {
            'id': '2',
            'name': 'SkiStar Trysil',
            'lat': 61.3,
            'lon': 12.2,
            'sourceUrl': 'https://fnugg.no/trysil/',
          },
          {
            'id': '9',
            'name': 'Elsewhere',
            'lat': 60,
            'lon': 8,
            'sourceUrl': 'https://evil.test/resort',
          },
        ],
      };
    });

    final hits = await directory.searchByName('Trysil');
    expect(hits, hasLength(2));
    expect(hits[0].sourceUrl, 'https://fnugg.no/trysil/');
    expect(hits[1].sourceUrl, isNull);
  });

  testWidgets('resort attribution is readable and links to the resort page', (
    tester,
  ) async {
    final opened = <Uri>[];
    final al = const SkiResort(
      id: '62',
      name: 'Ål Skisenter',
      lat: 60.63,
      lon: 8.56,
      sourceUrl: 'https://fnugg.no/al/',
    );
    final unsafe = const SkiResort(
      id: '9',
      name: 'Unsafe',
      lat: 60,
      lon: 8,
      sourceUrl: 'https://evil.test/resort',
    );
    String? selectedId;
    String? selectedName;

    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('en'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) {
              return ListView(
                children: [
                  ResortDiscoverySection(
                    directory: _FixedDirectory([al, unsafe]),
                    deviceLocation: FakeDeviceLocationService(),
                    places: _QuietPlaces(),
                    selectedResortId: selectedId,
                    onOpenAttribution: (uri) async => opened.add(uri),
                    onSelected: (resort) {
                      setState(() {
                        selectedId = resort.id;
                        selectedName = resort.name;
                      });
                    },
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
    await tester.pump();

    final before = tester.widget<Text>(
      find.text('Resort information from Fnugg.no'),
    );
    expect(before.style?.fontSize, 14);
    expect(find.textContaining('Meteorologisk'), findsNothing);
    expect(find.textContaining('NRK'), findsNothing);
    expect(find.textContaining('Vær- og føredata'), findsNothing);

    await tester.tap(find.byKey(const Key('fnugg-attribution')));
    await tester.pump();
    expect(opened, [fnuggHomeUri]);

    await tester.enterText(find.byType(TextField).first, 'Ål');
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.text('Resort information from Fnugg.no'), findsOneWidget);
    expect(find.byType(FnuggAttributionLink), findsOneWidget);
    expect(
      tester
          .widget<FnuggAttributionLink>(
            find.byKey(const Key('fnugg-attribution')),
          )
          .uri,
      fnuggHomeUri,
    );
    expect(find.byKey(const ValueKey('fnugg-resort-link-62')), findsNothing);
    expect(find.byKey(const ValueKey('fnugg-resort-link-9')), findsNothing);
    expect(find.text('Fnugg.no'), findsNothing);
    expect(find.textContaining('60.63'), findsNothing);
    expect(find.textContaining('8.56'), findsNothing);

    opened.clear();
    await tester.tap(find.byKey(const Key('fnugg-attribution')));
    await tester.pump();
    expect(opened, [fnuggHomeUri]);
    expect(selectedId, isNull);

    await tester.tap(find.text('Ål Skisenter'));
    await tester.pump();
    expect(selectedName, 'Ål Skisenter');
    expect(selectedId, '62');
    expect(find.text('Selected resort: Ål Skisenter'), findsNothing);
    expect(find.byKey(const Key('fnugg-selected-link')), findsNothing);
    expect(find.byType(FnuggAttributionLink), findsOneWidget);
    expect(
      tester
          .widget<Icon>(
            find.descendant(
              of: find.byKey(const ValueKey('resort-62')),
              matching: find.byType(Icon),
            ),
          )
          .icon,
      Icons.check_circle,
    );
    expect(find.textContaining('Yr'), findsNothing);
  });

  testWidgets('Norwegian attribution stays next to a selected resort', (
    tester,
  ) async {
    final opened = <Uri>[];
    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('nb'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: ListView(
            children: [
              ResortDiscoverySection(
                directory: _FixedDirectory(const [
                  SkiResort(
                    id: '2',
                    name: 'SkiStar Trysil',
                    lat: 61.3,
                    lon: 12.2,
                    sourceUrl: 'https://fnugg.no/trysil/',
                  ),
                ]),
                deviceLocation: FakeDeviceLocationService(),
                places: _QuietPlaces(),
                selectedResortId: '2',
                onOpenAttribution: (uri) async => opened.add(uri),
                onSelected: (_) {},
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pump();

    expect(
      find.text('Informasjon om skianlegg er hentet fra Fnugg.no'),
      findsOneWidget,
    );
    final text = tester.widget<Text>(
      find.text('Informasjon om skianlegg er hentet fra Fnugg.no'),
    );
    expect(text.style?.fontSize, greaterThanOrEqualTo(14));

    await tester.enterText(find.byType(TextField).first, 'Trysil');
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byType(FnuggAttributionLink), findsOneWidget);
    expect(
      tester
          .widget<FnuggAttributionLink>(
            find.byKey(const Key('fnugg-attribution')),
          )
          .uri,
      fnuggHomeUri,
    );
    expect(find.byKey(const ValueKey('fnugg-resort-link-2')), findsNothing);
    expect(find.byKey(const Key('fnugg-selected-link')), findsNothing);
    expect(find.text('Valgt skianlegg: SkiStar Trysil'), findsNothing);
    expect(find.textContaining('61.30'), findsNothing);
    expect(find.textContaining('12.20'), findsNothing);
    expect(
      tester
          .widget<Icon>(
            find.descendant(
              of: find.byKey(const ValueKey('resort-2')),
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
  });

  testWidgets('MET elevation credit is not labeled as Fnugg data', (
    tester,
  ) async {
    final view = presentRecommendation({
      'weather': {
        'points': [
          {'groundElevationM': 120},
          {'groundElevationM': 900},
        ],
        'elevation': {'attribution': '© Kartverket'},
      },
      'recommendation': {
        'effectiveTempC': -2,
        'reasons': [
          {'code': 'ELEVATION_PARTIAL'},
        ],
      },
    });
    expect(view.elevationAttribution, '© Kartverket');

    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('en'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: Builder(
            builder: (context) {
              return Column(
                children: recommendationContextWidgets(context, view),
              );
            },
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Elevation source: © Kartverket'), findsOneWidget);
    expect(find.textContaining('Fnugg'), findsNothing);
    expect(find.textContaining('Meteorologisk'), findsNothing);
    expect(find.textContaining('NRK'), findsNothing);
  });
}

class _FixedDirectory implements ResortDirectory {
  _FixedDirectory(this.hits);

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
