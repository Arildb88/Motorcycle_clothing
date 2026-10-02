import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:motorcycle_clothing/domain/activity.dart';
import 'package:motorcycle_clothing/domain/wardrobe_sharing.dart';
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

  test('maps resort membership to both snow-sport tags and keeps motorcycle out', () {
    expect(
      activityTagsForCategories(['alpine_snowboard', 'cycling']),
      ['cycling', 'alpine_skiing', 'snowboarding'],
    );
    expect(activityTagsForCategories(['xc_skiing']), ['xc_skiing']);
    expect(tagsAreMotorcycleOnly(['motorcycle']), isTrue);
    expect(tagsAreMotorcycleOnly(['cycling']), isFalse);
    expect(wardrobeCategoryForActivity('hiking'), isNull);
    expect(wardrobeCategoryForActivity('snowboarding'), 'alpine_snowboard');
    expect(categoriesForActivityTags(['alpine_skiing']), {'alpine_snowboard'});
  });

  testWidgets('shows Norwegian sharing copy and saves a chosen combination', (
    tester,
  ) async {
    final api = _SharingApi([
      _garment(id: 'mine', name: 'Min jakke', tags: ['cycling'], isDemo: false),
    ]);
    await tester.pumpWidget(
      _harness(api, const Locale('nb'), AppActivity.cycling),
    );
    await tester.pumpAndSettle();

    expect(find.text('Del personlige klær'), findsOneWidget);
    expect(find.textContaining('Mc-klær kan aldri deles'), findsOneWidget);
    expect(find.textContaining('Demoklær følger sin aktivitet'), findsOneWidget);
    expect(find.text('Sykling'), findsWidgets);
    expect(find.text('Alpint & snowboard'), findsOneWidget);
    expect(find.text('Langrenn'), findsOneWidget);
    expect(api.listPaths.single, '/wardrobe?activity=cycling');

    await tester.tap(find.widgetWithText(CheckboxListTile, 'Langrenn'));
    await tester.pumpAndSettle();

    expect(api.sharedBodies, [
      ['xc_skiing'],
    ]);
    expect(api.sharedBodies.single, isNot(contains('motorcycle')));
  });

  testWidgets('motorcycle form stays locked to the motorcycle wardrobe', (
    tester,
  ) async {
    final api = _SharingApi(const []);
    await tester.pumpWidget(_form(api, 'motorcycle'));
    await tester.pumpAndSettle();
    expect(
      find.text('This piece stays in the motorcycle wardrobe and is not shared.'),
      findsOneWidget,
    );
    expect(find.text('Alpine & snowboard'), findsNothing);
  });

  testWidgets('cycling form can add resort membership in Norwegian', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = _SharingApi(const []);
    await tester.pumpWidget(_form(api, 'cycling', const Locale('nb')));
    await tester.pumpAndSettle();
    expect(find.text('Tilgjengelig for'), findsOneWidget);
    expect(find.text('Alpint & snowboard'), findsOneWidget);
    expect(find.textContaining('mc-garderoben'), findsNothing);

    await tester.enterText(find.byType(TextField).first, 'Ulltrøye');
    await tester.tap(find.widgetWithText(CheckboxListTile, 'Alpint & snowboard'));
    await tester.pumpAndSettle();
    final save = find.text('Legg i garderoben');
    await tester.ensureVisible(save);
    await tester.tap(save);
    await tester.pumpAndSettle();

    expect(api.createdTags, [
      ['cycling', 'alpine_skiing', 'snowboarding'],
    ]);
    expect(api.createdTags.single, isNot(contains('motorcycle')));
    expect(api.createdTags.single, isNot(contains('hiking')));
  });

  testWidgets('hiking has no wardrobe and is not a sharing choice', (tester) async {
    final api = _SharingApi([
      _garment(id: 'mine', name: 'My jacket', tags: ['motorcycle'], isDemo: false),
    ]);
    await tester.pumpWidget(
      _harness(api, const Locale('nb'), AppActivity.hiking),
    );
    await tester.pumpAndSettle();

    expect(find.text('Tur har ikke en garderobe ennå.'), findsOneWidget);
    expect(find.text('My jacket'), findsNothing);
    expect(find.text('Sykling'), findsNothing);
    expect(api.listPaths.single, '/wardrobe?activity=hiking');
  });
}

Widget _harness(
  ApiClient api,
  Locale locale,
  AppActivity activity,
) {
  final context = ActivityContext()..setCurrentActivity(activity);
  return MultiProvider(
    providers: [
      Provider<ApiClient>.value(value: api),
      ChangeNotifierProvider<ActivityContext>.value(value: context),
    ],
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
      home: const Scaffold(body: WardrobeScreen()),
    ),
  );
}

Widget _form(ApiClient api, String activity, [Locale locale = const Locale('en')]) {
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
      home: GarmentFormScreen(key: ValueKey('$activity-${locale.languageCode}'), activity: activity),
    ),
  );
}

Map<String, dynamic> _garment({
  required String id,
  required String name,
  required List<String> tags,
  required bool isDemo,
}) {
  return {
    'id': id,
    'name': name,
    'category': 'shell_jacket',
    'layer': 'outer',
    'primaryBodyZone': 'torso',
    'warmthTier': 2,
    'windResistTier': 4,
    'waterResistTier': 3,
    'breathabilityTier': 3,
    'activityTags': tags,
    'components': <Map<String, dynamic>>[],
    'isDemo': isDemo,
  };
}

class _SharingApi extends ApiClient {
  _SharingApi(this.garments) : super(baseUrl: 'http://example.test');

  final List<Map<String, dynamic>> garments;
  final listPaths = <String>[];
  final sharedBodies = <List<String>>[];
  final createdTags = <List<String>>[];

  @override
  Future<List<dynamic>> getList(String path, {bool auth = true}) async {
    listPaths.add(path);
    return garments.map((item) => Map<String, dynamic>.from(item)).toList();
  }

  @override
  Future<Map<String, dynamic>> get(String path, {bool auth = true}) async {
    return {
      'sharedCategories': sharedBodies.isEmpty ? <String>[] : sharedBodies.last,
      'shareableCategories': ['cycling', 'alpine_snowboard', 'xc_skiing'],
      'isolatedCategories': ['motorcycle'],
    };
  }

  @override
  Future<Map<String, dynamic>> patch(
    String path,
    Map<String, dynamic> body,
  ) async {
    final categories = (body['sharedCategories'] as List).map((e) => '$e').toList();
    sharedBodies.add(categories);
    return {'sharedCategories': categories};
  }

  @override
  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body, {
    bool auth = false,
  }) async {
    createdTags.add((body['activityTags'] as List).map((e) => '$e').toList());
    return {'id': 'new'};
  }
}
