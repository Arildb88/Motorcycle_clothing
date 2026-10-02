import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/screens/feedback_sheet.dart';
import 'package:motorcycle_clothing/services/api_client.dart';
import 'package:provider/provider.dart';

class _RecordingApi extends ApiClient {
  _RecordingApi() : super(baseUrl: 'http://example.test');

  String? path;
  Map<String, dynamic>? body;

  @override
  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body, {
    bool auth = false,
  }) async {
    this.path = path;
    this.body = body;
    return {};
  }
}

void main() {
  testWidgets(
    'Norwegian feedback is cold, comfortable, or hot for that activity',
    (tester) async {
      final api = _RecordingApi();
      await tester.pumpWidget(
        Provider<ApiClient>.value(
          value: api,
          child: MaterialApp(
            locale: const Locale('nb'),
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: Builder(
              builder: (context) {
                return Scaffold(
                  body: FilledButton(
                    onPressed: () => showFeedbackSheet(context, {
                      'route': {'id': 'route-bike', 'activityType': 'cycling'},
                      'departureAt': '2026-10-02T12:00:00.000Z',
                      'weather': {'minTempC': 8},
                      'recommendation': {'engine': 'cycling_v1'},
                    }),
                    child: const Text('open'),
                  ),
                );
              },
            ),
          ),
        ),
      );

      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();

      expect(find.text('For kald'), findsOneWidget);
      expect(find.text('Passe'), findsOneWidget);
      expect(find.text('For varm'), findsOneWidget);
      expect(find.text('Litt kaldt'), findsNothing);
      expect(find.text('Litt varmt'), findsNothing);
      expect(find.text('For kaldt'), findsNothing);
      expect(find.text('For varmt'), findsNothing);

      await tester.tap(find.byKey(const Key('thermal-feedback-too_cold')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('thermal-feedback-submit')));
      await tester.pumpAndSettle();

      expect(api.path, '/feedback');
      expect(api.body, {
        'activityType': 'cycling',
        'departureAt': '2026-10-02T12:00:00.000Z',
        'weatherSnapshot': {'minTempC': 8},
        'recommendation': {'engine': 'cycling_v1'},
        'rating': 'too_cold',
        'routeId': 'route-bike',
      });
      expect(find.text('Takk — komfortprofilen er oppdatert'), findsOneWidget);
    },
  );

  testWidgets('a missing activity does not submit as motorcycle', (
    tester,
  ) async {
    final api = _RecordingApi();
    await tester.pumpWidget(
      Provider<ApiClient>.value(
        value: api,
        child: MaterialApp(
          locale: const Locale('nb'),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Builder(
            builder: (context) {
              return Scaffold(
                body: FilledButton(
                  onPressed: () => showFeedbackSheet(context, {
                    'route': {'id': 'route-1'},
                    'recommendation': {'engine': 'cycling_v1'},
                  }),
                  child: const Text('open'),
                ),
              );
            },
          ),
        ),
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('thermal-feedback-too_warm')));
    await tester.pumpAndSettle();

    final submit = tester.widget<FilledButton>(
      find.byKey(const Key('thermal-feedback-submit')),
    );
    expect(submit.onPressed, isNull);
    expect(api.body, isNull);
  });
}
