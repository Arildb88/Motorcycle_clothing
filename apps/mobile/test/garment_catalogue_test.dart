import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:motorcycle_clothing/domain/garment.dart';
import 'package:motorcycle_clothing/domain/garment_catalogue_form.dart';
import 'package:motorcycle_clothing/features/wardrobe/garment_form_screen.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:provider/provider.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  test('omits untouched defaults and shares only an explicit rating', () {
    const warmth = TierField(value: 4, touched: false, source: 'community', sampleCount: 6);
    const wind = TierField(value: 5, touched: false, source: 'fallback');
    const water = TierField(value: 2, touched: true, source: 'explicit');
    const breath = TierField(value: 3, touched: false);
    final created = garmentSaveBody(
      isEdit: false,
      name: 'My own name',
      category: 'shell_jacket',
      writeYourself: false,
      brand: 'Klim',
      model: 'Badlands Pro',
      material: 'textile',
      hasVentilation: false,
      isHeated: false,
      notes: 'private note',
      activityTags: const ['motorcycle'],
      linerKinds: const [],
      warmth: warmth,
      wind: wind,
      water: water,
      breath: breath,
    );
    expect(created.containsKey('warmthTier'), isFalse);
    expect(created.containsKey('windResistTier'), isFalse);
    expect(created['waterResistTier'], 2);
    expect(created['name'], 'My own name');
    expect(created['notes'], 'private note');

    final share = contributionBody(
      isDemo: false,
      share: true,
      writeYourself: false,
      brand: 'Klim',
      model: 'Badlands Pro',
      category: 'shell_jacket',
      activityTags: const ['motorcycle'],
      isHeated: false,
      material: 'textile',
      linerKinds: const [],
      warmth: warmth,
      wind: wind,
      water: water,
      submissionId: 'submission-1',
    );
    expect(share?['explicitMetrics'], ['water']);
    expect(share?.containsKey('notes'), isFalse);
    expect(share?.containsKey('name'), isFalse);

    final blocked = contributionBody(
      isDemo: false,
      share: true,
      writeYourself: true,
      brand: null,
      model: null,
      category: 'shell_jacket',
      activityTags: const ['motorcycle'],
      isHeated: false,
      linerKinds: const [],
      warmth: water,
      wind: wind,
      water: water,
      submissionId: 'submission-1',
    );
    expect(blocked, isNull);
    expect(editRefreshesCatalogue, isFalse);
  });

  test('an edit keeps the saved tiers and does not rebuild them from a preview', () {
    const existing = TierField(value: 2, touched: false, source: 'existing');
    final body = garmentSaveBody(
      isEdit: true,
      name: 'Renamed',
      category: 'shell_jacket',
      writeYourself: false,
      brand: 'Klim',
      model: 'Badlands Pro',
      hasVentilation: false,
      isHeated: false,
      activityTags: const ['motorcycle'],
      linerKinds: const [],
      warmth: existing,
      wind: existing,
      water: existing,
      breath: existing,
    );
    expect(body['warmthTier'], 2);
    expect(body['name'], 'Renamed');
    expect(editRefreshesCatalogue, isFalse);
  });

  testWidgets('offers a curated product and a private free-text path', (tester) async {
    tester.view.physicalSize = const Size(900, 4200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = _FakeCatalogueApi();
    await tester.pumpWidget(_harness(api));
    await tester.pumpAndSettle();

    expect(find.text('Other / write yourself'), findsOneWidget);
    expect(find.text('Klim'), findsWidgets);
    expect(
      find.textContaining('not verified manufacturer measurements'),
      findsOneWidget,
    );

    await tester.tap(find.text('Klim').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Badlands Pro').first);
    await tester.pumpAndSettle();
    expect(find.textContaining('Community estimate · 6 contributions'), findsWidgets);
    expect(api.previewCalls, greaterThan(0));

    await tester.tap(find.text('Change product'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Other / write yourself'));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('not added to the shared catalogue'),
      findsOneWidget,
    );

    await tester.enterText(find.byType(TextField).first, 'My lucky jacket');
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Add to wardrobe'));
    await tester.tap(find.text('Add to wardrobe'));
    await tester.pumpAndSettle();

    final create = api.posts.lastWhere((call) => call.path == '/wardrobe');
    expect(create.body['name'], 'My lucky jacket');
    expect(create.body['brand'], isNull);
    expect(create.body['model'], isNull);
    expect(create.body.containsKey('warmthTier'), isFalse);
    expect(
      api.posts.where((call) => call.path.endsWith('/contributions')),
      isEmpty,
    );
  });

  testWidgets('a deliberate rating is shared and an untouched default is not', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(900, 4200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = _FakeCatalogueApi();
    await tester.pumpWidget(_harness(api));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Klim').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Badlands Pro').first);
    await tester.pumpAndSettle();

    final slider = find.byType(Slider).first;
    await tester.ensureVisible(slider);
    tester.widget<Slider>(slider).onChanged!(4);
    await tester.pumpAndSettle();
    expect(find.text('Your value'), findsWidgets);

    expect(find.textContaining('not of different people'), findsOneWidget);
    await tester.ensureVisible(find.text('Share this rating'));
    await tester.tap(find.text('Share this rating'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Add to wardrobe'));
    await tester.tap(find.text('Add to wardrobe'));
    await tester.pumpAndSettle();

    final create = api.posts.lastWhere((call) => call.path == '/wardrobe');
    expect(create.body.containsKey('warmthTier'), isTrue);
    expect(create.body.containsKey('windResistTier'), isFalse);
    final share = api.posts.lastWhere(
      (call) => call.path.endsWith('/contributions'),
    );
    expect(share.body['explicitMetrics'], ['warmth']);
    expect(share.body.containsKey('name'), isFalse);
  });

  testWidgets('Norwegian explains the contribution and English stays available', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(900, 4200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = _FakeCatalogueApi();
    await tester.pumpWidget(_harness(api, const Locale('nb')));
    await tester.pumpAndSettle();
    expect(find.text('Annet / skriv selv'), findsOneWidget);
    expect(find.textContaining('ikke et antall personer'), findsWidgets);
    expect(find.text('Other / write yourself'), findsNothing);
  });

  testWidgets('editing an existing garment does not refresh it from the catalogue', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(900, 4200);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = _FakeCatalogueApi();
    final existing = Garment(
      id: 'g1',
      name: 'Snapshot',
      category: 'shell_jacket',
      layer: 'outer',
      primaryBodyZone: 'torso',
      warmthTier: 2,
      windResistTier: 5,
      waterResistTier: 4,
      breathabilityTier: 3,
      brand: 'Klim',
      model: 'Badlands Pro',
      activityTags: const ['motorcycle'],
    );
    await tester.pumpWidget(_harness(api, const Locale('en'), existing));
    await tester.pumpAndSettle();

    expect(api.previewCalls, 0);
    expect(find.text('2/5'), findsWidgets);
    expect(find.textContaining('Community estimate'), findsNothing);

    await tester.enterText(find.byType(TextField).first, 'Renamed snapshot');
    await tester.pumpAndSettle();
    expect(api.previewCalls, 0);
    await tester.ensureVisible(find.text('Save changes'));
    await tester.tap(find.text('Save changes'));
    await tester.pumpAndSettle();

    final patch = api.patches.single;
    expect(patch.body['name'], 'Renamed snapshot');
    expect(patch.body['warmthTier'], 2);
    expect(api.previewCalls, 0);
  });
}

Widget _harness(
  ApiClient api, [
  Locale locale = const Locale('en'),
  Garment? existing,
]) {
  return Provider<ApiClient>.value(
    value: api,
    child: MaterialApp(
      locale: locale,
      supportedLocales: const [Locale('en'), Locale('nb')],
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: GarmentFormScreen(existing: existing),
    ),
  );
}

class _Call {
  _Call(this.path, this.body);
  final String path;
  final Map<String, dynamic> body;
}

class _FakeCatalogueApi extends ApiClient {
  _FakeCatalogueApi() : super(baseUrl: 'http://example.test');

  final List<_Call> posts = [];
  final List<_Call> patches = [];
  int previewCalls = 0;

  @override
  Future<Map<String, dynamic>> get(String path, {bool auth = true}) async {
    return {
      'brands': ['Klim', 'Dainese'],
      'models': [
        {
          'brand': 'Klim',
          'model': 'Badlands Pro',
          'category': 'shell_jacket',
          'activityScope': 'motorcycle',
          'heated': false,
          'linerKey': 'none',
          'materialKey': 'textile',
          'curatedName': 'Klim Badlands Pro',
        },
      ],
      'verifiedManufacturerData': false,
    };
  }

  @override
  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body, {
    bool auth = false,
  }) async {
    posts.add(_Call(path, Map<String, dynamic>.from(body)));
    if (path.endsWith('/preview')) {
      previewCalls += 1;
      final matched = body['brand'] == 'Klim' && body['model'] == 'Badlands Pro';
      return {
        'matched': matched,
        'matchKind': matched ? 'identity' : 'none',
        'metrics': {
          'warmth': matched
              ? {
                  'source': 'community',
                  'sampleCount': 6,
                  'estimate': 3.5,
                  'rounded': 4,
                }
              : {
                  'source': 'fallback',
                  'sampleCount': 0,
                  'estimate': null,
                  'rounded': null,
                },
          'wind': {
            'source': 'fallback',
            'sampleCount': 0,
            'estimate': null,
            'rounded': null,
          },
          'water': {
            'source': 'fallback',
            'sampleCount': 0,
            'estimate': null,
            'rounded': null,
          },
        },
        'fallback': {
          'warmthTier': 2,
          'windResistTier': 5,
          'waterResistTier': 4,
          'breathabilityTier': 3,
        },
      };
    }
    if (path == '/wardrobe') {
      return {'id': 'created-1'};
    }
    return {'accepted': true, 'duplicate': false};
  }

  @override
  Future<Map<String, dynamic>> patch(
    String path,
    Map<String, dynamic> body,
  ) async {
    patches.add(_Call(path, Map<String, dynamic>.from(body)));
    return {'id': 'g1'};
  }
}
