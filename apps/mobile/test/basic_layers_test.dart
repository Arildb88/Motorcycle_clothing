import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/features/plan/activity_recommendation_request.dart';
import 'package:motorcycle_clothing/features/plan/ride_planner_models.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/l10n/app_localizations_en.dart';
import 'package:motorcycle_clothing/l10n/app_localizations_nb.dart';
import 'package:motorcycle_clothing/l10n/reason_lookup.dart';
import 'package:motorcycle_clothing/state/locale_controller.dart';

void main() {
  test('none stays off the motorcycle query and conflicts are not stacked', () {
    const when = '2026-10-06T08:00:00.000Z';
    final plain = RidePlannerState();
    expect(plain.recommendQuery('route-1', when), {
      'routeId': 'route-1',
      'departureAt': when,
    });

    final stacked = RidePlannerState(
      inputs: const ActivityPlanningInputs(
        basicUpper: ['thick_sweater', 't_shirt', 'thin_sweater'],
        basicLower: ['jeans', 'joggers', 'wool_base_bottom'],
      ),
    );
    expect(stacked.recommendQuery('route-1', when), {
      'routeId': 'route-1',
      'departureAt': when,
      'basicUpper': 't_shirt,thick_sweater',
      'basicLower': 'wool_base_bottom,joggers',
    });

    final cycling = RidePlannerState(
      activityType: 'cycling',
      inputs: const ActivityPlanningInputs(basicUpper: ['t_shirt']),
    );
    expect(
      cycling.recommendQuery('c', when).containsKey('basicUpper'),
      isFalse,
    );
    expect(cycling.recommendQuery('c', when)['intensity'], 'steady');
    expect(
      toggleBasicPiece(
        const ['t_shirt', 'thick_sweater'],
        'thin_sweater',
        upper: true,
      ),
      ['t_shirt', 'thin_sweater'],
    );
    expect(toggleBasicPiece(const ['jeans'], 'joggers', upper: false), [
      'joggers',
    ]);
    expect(
      toggleBasicPiece(
        const ['wool_base_bottom', 'jeans'],
        'none',
        upper: false,
      ),
      isEmpty,
    );
  });

  test('Norwegian labels name Overdel, Underdel, and Ingen', () {
    final en = AppLocalizationsEn();
    final nb = AppLocalizationsNb();
    expect(nb.plannerBasicUpper, 'Overdel');
    expect(nb.plannerBasicLower, 'Underdel');
    expect(nb.plannerBasicNone, 'Ingen');
    expect(nb.plannerBasicThickSweater, 'Tykk genser');
    expect(nb.plannerBasicTShirt, 'T-skjorte');
    expect(nb.plannerBasicJoggers, 'Joggebukse');
    expect(nb.plannerBasicUpper, isNot(en.plannerBasicUpper));
    expect(
      localizeReasonCode(
        'BASIC_UNDERLAYER_WARMTH',
        AppLocalizationsReasonLookup(nb),
      ),
      nb.reasonBasicUnderlayerWarmth,
    );
    expect(
      nb.reasonBasicUnderlayerWarmth,
      isNot(en.reasonBasicUnderlayerWarmth),
    );
  });

  testWidgets(
    'motorcycle dropdowns default to none and allow a compatible stack',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(const _Host());
      await tester.pumpAndSettle();

      expect(find.text('Overdel'), findsOneWidget);
      expect(find.text('Underdel'), findsOneWidget);
      expect(find.text('Ingen'), findsNWidgets(2));
      expect(find.textContaining('error'), findsNothing);
      expect(
        tester.getSize(find.byKey(const Key('mc-basic-upper'))).height,
        greaterThanOrEqualTo(48),
      );

      await _choose(tester, const Key('mc-basic-upper'), 'T-skjorte');
      await _choose(tester, const Key('mc-basic-upper'), 'Tykk genser');
      expect(find.text('T-skjorte + Tykk genser'), findsOneWidget);

      await _choose(tester, const Key('mc-basic-upper'), 'Tynn genser');
      expect(find.text('T-skjorte + Tynn genser'), findsOneWidget);
      expect(find.text('Tykk genser'), findsNothing);

      await _choose(tester, const Key('mc-basic-upper'), 'Ingen');
      expect(find.text('Ingen'), findsNWidgets(2));
      expect(find.text('T-skjorte + Tynn genser'), findsNothing);
    },
  );

  testWidgets(
    'other activities do not show the motorcycle basic-layer dropdowns',
    (tester) async {
      await tester.pumpWidget(
        const _Host(activityType: 'cycling', locale: Locale('en')),
      );
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('mc-basic-upper')), findsNothing);
      expect(find.byKey(const Key('mc-basic-lower')), findsNothing);
      expect(find.text('Overdel'), findsNothing);
      expect(find.text('Effort'), findsOneWidget);
    },
  );
}

Future<void> _choose(WidgetTester tester, Key field, String label) async {
  await tester.tap(find.byKey(field));
  await tester.pumpAndSettle();
  final item = find.ancestor(
    of: find.text(label),
    matching: find.byType(CheckedPopupMenuItem<String>),
  );
  expect(item, findsWidgets);
  await tester.tap(item.last);
  await tester.pumpAndSettle();
}

class _Host extends StatefulWidget {
  const _Host({
    this.activityType = 'motorcycle',
    this.locale = const Locale('nb'),
  });

  final String activityType;
  final Locale locale;

  @override
  State<_Host> createState() => _HostState();
}

class _HostState extends State<_Host> {
  ActivityPlanningInputs inputs = const ActivityPlanningInputs();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      locale: widget.locale,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(
        body: ActivityPlanningControls(
          activityType: widget.activityType,
          inputs: inputs,
          onChanged: (next) => setState(() => inputs = next),
        ),
      ),
    );
  }
}
