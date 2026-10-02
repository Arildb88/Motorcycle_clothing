import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:motorcycle_clothing/features/wardrobe/wardrobe_screen.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:motorcycle_clothing/theme/app_theme.dart';
import 'package:provider/provider.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets('shows a demo badge and deletes only demo garments after confirmation', (
    tester,
  ) async {
    final api = _FakeApi([
      _garment(id: 'demo', name: 'Custom touring shell', isDemo: true),
      _garment(id: 'mine', name: 'My jacket', isDemo: false),
    ]);
    await tester.pumpWidget(_harness(api));
    await tester.pumpAndSettle();

    expect(find.text('DEMO'), findsOneWidget);
    expect(find.text('Custom touring shell'), findsOneWidget);
    expect(find.text('My jacket'), findsOneWidget);
    expect(find.text('Delete demo wardrobe'), findsOneWidget);

    await tester.tap(find.widgetWithText(OutlinedButton, 'Delete demo wardrobe'));
    await tester.pumpAndSettle();
    expect(
      find.text(
        'Only garments added from the demo wardrobe will be removed. Your own garments stay.',
      ),
      findsOneWidget,
    );
    expect(api.demoDeletes, 0);

    await tester.tap(find.widgetWithText(TextButton, 'Cancel'));
    await tester.pumpAndSettle();
    expect(api.demoDeletes, 0);
    expect(find.text('DEMO'), findsOneWidget);

    await tester.tap(find.widgetWithText(OutlinedButton, 'Delete demo wardrobe'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Delete demo wardrobe'));
    await tester.pumpAndSettle();

    expect(api.demoDeletes, 1);
    expect(find.text('Custom touring shell'), findsNothing);
    expect(find.text('DEMO'), findsNothing);
    expect(find.text('Delete demo wardrobe'), findsNothing);
    expect(find.text('My jacket'), findsOneWidget);
  });

  testWidgets('hides the demo delete action when no demo garments remain', (
    tester,
  ) async {
    final api = _FakeApi([
      _garment(id: 'mine', name: 'My jacket', isDemo: false),
    ]);
    await tester.pumpWidget(_harness(api));
    await tester.pumpAndSettle();

    expect(find.text('DEMO'), findsNothing);
    expect(find.text('Delete demo wardrobe'), findsNothing);
    expect(find.text('My jacket'), findsOneWidget);
  });

  testWidgets('uses the Norwegian demo delete action', (tester) async {
    final api = _FakeApi([
      _garment(id: 'demo', name: 'Demo – Touringjakke', isDemo: true),
    ]);
    await tester.pumpWidget(_harness(api, const Locale('nb')));
    await tester.pumpAndSettle();

    expect(find.text('DEMO'), findsOneWidget);
    expect(find.text('Slett demo-garderobe'), findsOneWidget);
    expect(find.text('Delete demo wardrobe'), findsNothing);
  });
}

Widget _harness(ApiClient api, [Locale locale = const Locale('en')]) {
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
      home: const Scaffold(body: WardrobeScreen()),
    ),
  );
}

Map<String, dynamic> _garment({
  required String id,
  required String name,
  required bool isDemo,
}) {
  return {
    'id': id,
    'name': name,
    'category': 'shell_jacket',
    'layer': 'outer',
    'primaryBodyZone': 'torso',
    'warmthTier': 2,
    'windResistTier': 5,
    'waterResistTier': 4,
    'breathabilityTier': 3,
    'activityTags': ['motorcycle'],
    'components': <Map<String, dynamic>>[],
    'isDemo': isDemo,
  };
}

class _FakeApi extends ApiClient {
  _FakeApi(this.garments) : super(baseUrl: 'http://example.test');

  final List<Map<String, dynamic>> garments;
  int demoDeletes = 0;

  @override
  Future<List<dynamic>> getList(String path, {bool auth = true}) async {
    return garments.map((item) => Map<String, dynamic>.from(item)).toList();
  }

  @override
  Future<Map<String, dynamic>> delete(String path) async {
    if (path != '/wardrobe/actions/demo') {
      throw UnsupportedError(path);
    }
    demoDeletes += 1;
    final before = garments.length;
    garments.removeWhere((item) => item['isDemo'] == true);
    return {'deleted': before - garments.length};
  }
}
