import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:motorcycle_clothing/domain/garment.dart';
import 'package:motorcycle_clothing/domain/garment_catalogue_form.dart';
import 'package:motorcycle_clothing/features/wardrobe/garment_form_screen.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:provider/provider.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  test('preset tiers are saved without becoming an explicit community rating', () {
    const warmth = TierField(value: 1, touched: false);
    const other = TierField(value: 1, touched: false);
    final body = garmentSaveBody(
      isEdit: false,
      name: 'Club tee',
      category: 'base_layer',
      writeYourself: false,
      brand: null,
      model: null,
      preset: 'cycling_short_sleeve_tee',
      writePreset: true,
      includeUntouchedPresetTiers: true,
      material: 'synthetic',
      hasVentilation: false,
      isHeated: false,
      activityTags: const ['cycling'],
      linerKinds: const [],
      warmth: warmth,
      wind: other,
      water: other,
      breath: other,
    );
    expect(body['preset'], 'cycling_short_sleeve_tee');
    expect(body['warmthTier'], 1);
    expect(body['brand'], isNull);

    final share = contributionBody(
      isDemo: false,
      share: true,
      writeYourself: false,
      brand: 'Castelli',
      model: 'Pro',
      category: 'base_layer',
      activityTags: const ['cycling'],
      isHeated: false,
      linerKinds: const [],
      warmth: warmth,
      wind: other,
      water: other,
      submissionId: 'submission-1',
    );
    expect(share, isNull);
  });

  testWidgets('Norwegian cycling form lists eight unambiguous choices', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 2800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = _FormApi();
    await tester.pumpWidget(_form(api, const Locale('nb')));
    await tester.pumpAndSettle();

    expect(find.text('Tekstiljakke for motorsykkel'), findsNothing);
    expect(find.text('Avanserte innstillinger / vinter'), findsOneWidget);
    expect(find.text('Varme'), findsNothing);
    expect(find.text('Fingerhansker'), findsNothing);

    await tester.tap(find.byType(DropdownButtonFormField<String?>));
    await tester.pumpAndSettle();

    for (final label in [
      'Lange sykkelbukser / tights',
      'Korte sykkelshorts',
      'Triatlondrakt',
      'Teknisk T-skjorte med korte ermer',
      'Teknisk trøye med lange ermer',
      'Tynn sykkeljakke',
      'Fingreløse sykkelhansker',
      'Tynne sykkelhansker med fingre',
    ]) {
      expect(find.text(label), findsOneWidget);
    }
  });

  testWidgets('saves a light tee and warm tights without a brand', (tester) async {
    tester.view.physicalSize = const Size(800, 2800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = _FormApi();
    await tester.pumpWidget(_form(api, const Locale('en')));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).first, 'Club tee');
    await _choose(tester, 'Short-sleeve technical T-shirt');
    await tester.tap(find.text('Add to wardrobe'));
    await tester.pumpAndSettle();

    expect(api.posts.single.path, '/wardrobe');
    expect(api.posts.single.body['preset'], 'cycling_short_sleeve_tee');
    expect(api.posts.single.body['category'], 'base_layer');
    expect(api.posts.single.body['warmthTier'], 1);
    expect(api.posts.single.body['brand'], isNull);
    expect(api.posts.single.body['model'], isNull);
    expect(api.posts.single.body['activityTags'], ['cycling']);
    expect(api.posts.single.body.containsKey('explicitMetrics'), isFalse);
  });

  testWidgets('saves warm tights from the thin medium warm choice', (tester) async {
    tester.view.physicalSize = const Size(800, 2800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = _FormApi();
    await tester.pumpWidget(_form(api, const Locale('en')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'Winter tights');
    await _choose(tester, 'Long cycling trousers / tights');
    expect(find.text('Thin'), findsOneWidget);
    expect(find.text('Warm'), findsOneWidget);
    await tester.tap(find.text('Warm'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Add to wardrobe'));
    await tester.pumpAndSettle();

    expect(api.posts.single.body['preset'], 'cycling_long_trousers');
    expect(api.posts.single.body['category'], 'pants');
    expect(api.posts.single.body['warmthTier'], 4);
    expect(api.posts.single.body['brand'], isNull);
  });

  testWidgets('advanced winter controls stay collapsed until opened', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 2800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(_form(_FormApi(), const Locale('en')));
    await tester.pumpAndSettle();
    expect(find.text('Wind resistance'), findsNothing);
    expect(find.text('Thermal liner included'), findsNothing);

    await tester.tap(find.text('Advanced settings / winter'));
    await tester.pumpAndSettle();
    expect(find.text('Wind resistance'), findsOneWidget);
    expect(find.text('Thermal liner included'), findsOneWidget);
    expect(find.text('Waterproofness'), findsOneWidget);
  });

  testWidgets('edits a saved long jersey and keeps the medium band', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 2800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = _FormApi();
    await tester.pumpWidget(
      _form(
        api,
        const Locale('en'),
        existing: Garment(
          id: 'g1',
          name: 'Club jersey',
          category: 'base_layer',
          layer: 'base',
          primaryBodyZone: 'torso',
          warmthTier: 3,
          windResistTier: 2,
          waterResistTier: 1,
          breathabilityTier: 4,
          material: 'synthetic',
          preset: 'cycling_long_jersey',
          activityTags: const ['cycling'],
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Long-sleeve technical jersey'), findsOneWidget);
    expect(find.text('Medium'), findsOneWidget);
    expect(find.text('Textile motorcycle jacket'), findsNothing);

    await tester.enterText(find.widgetWithText(TextField, 'Brand (optional)'), 'Rapha');
    await tester.tap(find.text('Save changes'));
    await tester.pumpAndSettle();

    expect(api.patches.single.path, '/wardrobe/g1');
    expect(api.patches.single.body['preset'], 'cycling_long_jersey');
    expect(api.patches.single.body['category'], 'base_layer');
    expect(api.patches.single.body['warmthTier'], 3);
    expect(api.patches.single.body['brand'], 'Rapha');
    expect(api.posts, isEmpty);
  });

  testWidgets('saves a triathlon suit on the full-body category', (tester) async {
    tester.view.physicalSize = const Size(800, 2800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = _FormApi();
    await tester.pumpWidget(_form(api, const Locale('en')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'Race suit');
    await _choose(tester, 'Triathlon suit');
    expect(find.text('Thin'), findsNothing);
    await tester.tap(find.text('Add to wardrobe'));
    await tester.pumpAndSettle();

    expect(api.posts.single.body['preset'], 'cycling_triathlon_suit');
    expect(api.posts.single.body['category'], 'one_piece_suit');
    expect(api.posts.single.body['warmthTier'], 1);
  });
}

Future<void> _choose(WidgetTester tester, String label) async {
  await tester.tap(find.byType(DropdownButtonFormField<String?>));
  await tester.pumpAndSettle();
  await tester.tap(find.text(label).last);
  await tester.pumpAndSettle();
}

Widget _form(ApiClient api, Locale locale, {Garment? existing}) {
  return Provider<ApiClient>.value(
    value: api,
    child: MaterialApp(
      theme: AppTheme.light(),
      locale: locale,
      supportedLocales: const [Locale('en'), Locale('nb')],
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: GarmentFormScreen(activity: 'cycling', existing: existing),
    ),
  );
}

class _Posted {
  _Posted(this.path, this.body);
  final String path;
  final Map<String, dynamic> body;
}

class _FormApi extends ApiClient {
  _FormApi() : super(baseUrl: 'http://example.test');

  final posts = <_Posted>[];
  final patches = <_Posted>[];

  @override
  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body, {
    bool auth = false,
  }) async {
    posts.add(_Posted(path, body));
    return {'id': 'new'};
  }

  @override
  Future<Map<String, dynamic>> patch(
    String path,
    Map<String, dynamic> body,
  ) async {
    patches.add(_Posted(path, body));
    return {'id': 'g1'};
  }
}
