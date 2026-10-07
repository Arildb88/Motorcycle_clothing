import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/domain/garment.dart';
import 'package:motorcycle_clothing/features/wardrobe/garment_form_screen.dart';
import 'package:motorcycle_clothing/features/wardrobe/wardrobe_screen.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/state/activity_context.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:provider/provider.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  const activities = <String>[
    'motorcycle',
    'hiking',
    'cycling',
    'alpine_skiing',
    'snowboarding',
    'xc_skiing',
  ];

  for (final activity in activities) {
    for (final locale in const [Locale('en'), Locale('nb')]) {
      testWidgets(
        '$activity ${locale.languageCode} add and edit omit share prompts',
        (tester) async {
          tester.view.physicalSize = const Size(900, 4200);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);

          final api = _Api();
          await tester.pumpWidget(_form(api, locale, activity));
          await tester.pumpAndSettle();
          _expectNoSharePrompt(tester);
          if (activity == 'cycling') {
            await tester.tap(find.byType(ListTile).first);
            await tester.pumpAndSettle();
            _expectNoSharePrompt(tester);
          }

          await tester.pumpWidget(
            _form(api, locale, activity, existing: _existing(activity)),
          );
          await tester.pumpAndSettle();
          _expectNoSharePrompt(tester);
          if (activity == 'cycling') {
            await tester.tap(find.byType(ListTile).first);
            await tester.pumpAndSettle();
            _expectNoSharePrompt(tester);
          }
        },
      );
    }

    testWidgets('$activity save does not contribute a rating', (tester) async {
      tester.view.physicalSize = const Size(900, 4200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final api = _Api();
      await tester.pumpWidget(_form(api, const Locale('en'), activity));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).first, 'Private shell');
      if (activity == 'cycling') {
        await tester.enterText(
          find.widgetWithText(TextField, 'Brand (optional)'),
          'Castelli',
        );
        await tester.enterText(
          find.widgetWithText(TextField, 'Model (optional)'),
          'Pro',
        );
        await tester.tap(find.text('Advanced settings / winter'));
        await tester.pumpAndSettle();
      } else {
        await tester.tap(find.text('Klim').first);
        await tester.pumpAndSettle();
        await tester.tap(find.text('Badlands Pro').first);
        await tester.pumpAndSettle();
      }
      await _moveFirstSlider(tester);
      await tester.ensureVisible(find.text('Add to wardrobe'));
      await tester.tap(find.text('Add to wardrobe'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));

      final creates = api.posts.where((call) => call.path == '/wardrobe');
      expect(creates, isNotEmpty);
      expect(creates.single.body['name'], 'Private shell');
      expect(creates.single.body.containsKey('warmthTier'), isTrue);
      _expectNoContribution(api);
    });

    testWidgets('$activity edit does not contribute a rating', (tester) async {
      tester.view.physicalSize = const Size(900, 4200);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final editApi = _Api();
      await tester.pumpWidget(
        _form(
          editApi,
          const Locale('en'),
          activity,
          existing: _existing(activity, isDemo: activity == 'motorcycle'),
        ),
      );
      await tester.pumpAndSettle();
      if (activity == 'cycling') {
        await tester.tap(find.text('Advanced settings / winter'));
        await tester.pumpAndSettle();
      }
      await _moveFirstSlider(tester);
      await tester.ensureVisible(find.text('Save changes'));
      await tester.tap(find.text('Save changes'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));

      expect(editApi.patches, isNotEmpty);
      expect(editApi.patches.single.path, '/wardrobe/g1');
      expect(editApi.patches.single.body['warmthTier'], 4);
      _expectNoContribution(editApi);
    });
  }

  for (final activity in AppActivity.values) {
    testWidgets('${activity.name} wardrobe list has no share prompt', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final api = _Api();
      final context = ActivityContext()..setCurrentActivity(activity);
      await tester.pumpWidget(
        MultiProvider(
          providers: [
            Provider<ApiClient>.value(value: api),
            ChangeNotifierProvider<ActivityContext>.value(value: context),
          ],
          child: MaterialApp(
            theme: AppTheme.light(),
            locale: const Locale('en'),
            supportedLocales: const [Locale('en'), Locale('nb')],
            localizationsDelegates: const [
              AppLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            home: const Scaffold(body: WardrobeScreen()),
          ),
        ),
      );
      await tester.pumpAndSettle();
      _expectNoSharePrompt(tester);
      expect(
        api.posts.where((call) => call.path.endsWith('/contributions')),
        isEmpty,
      );
    });
  }
}

void _expectNoSharePrompt(WidgetTester tester) {
  expect(find.text('Share this rating'), findsNothing);
  expect(find.text('Del denne vurderingen'), findsNothing);
  expect(find.textContaining('not of different people'), findsNothing);
  expect(find.textContaining('ikke et antall personer'), findsNothing);
}

void _expectNoContribution(_Api api) {
  expect(
    api.posts.where((call) => call.path.endsWith('/contributions')),
    isEmpty,
  );
  expect(
    api.patches.where((call) => call.path.endsWith('/contributions')),
    isEmpty,
  );
}

Future<void> _moveFirstSlider(WidgetTester tester) async {
  final slider = find.byType(Slider).first;
  await tester.ensureVisible(slider);
  tester.widget<Slider>(slider).onChanged!(4);
  await tester.pumpAndSettle();
}

Garment _existing(String activity, {bool isDemo = false}) {
  final tags = switch (activity) {
    'cycling' => const ['cycling'],
    'alpine_skiing' => const ['alpine_skiing'],
    'snowboarding' => const ['snowboarding'],
    'xc_skiing' => const ['xc_skiing'],
    _ => const ['motorcycle'],
  };
  return Garment(
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
    activityTags: tags,
    isDemo: isDemo,
  );
}

Widget _form(
  ApiClient api,
  Locale locale,
  String activity, {
  Garment? existing,
}) {
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
      home: GarmentFormScreen(activity: activity, existing: existing),
    ),
  );
}

class _Call {
  _Call(this.path, this.body);
  final String path;
  final Map<String, dynamic> body;
}

class _Api extends ApiClient {
  _Api() : super(baseUrl: 'http://example.test');

  final posts = <_Call>[];
  final patches = <_Call>[];

  @override
  Future<List<dynamic>> getList(String path, {bool auth = true}) async {
    return const [];
  }

  @override
  Future<Map<String, dynamic>> get(String path, {bool auth = true}) async {
    if (path.startsWith('/wardrobe/sharing')) {
      return {
        'sharedCategories': <String>[],
        'shareableCategories': ['cycling', 'alpine_snowboard', 'xc_skiing'],
        'isolatedCategories': ['motorcycle'],
      };
    }
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
      return {
        'matched': false,
        'matchKind': 'none',
        'metrics': {
          'warmth': {
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
          'warmthTier': 3,
          'windResistTier': 2,
          'waterResistTier': 1,
          'breathabilityTier': 3,
        },
      };
    }
    if (path == '/wardrobe') return {'id': 'created-1'};
    return {'accepted': true};
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
