import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/domain/saved_route.dart';
import 'package:motorcycle_clothing/features/plan/commute_plan.dart';
import 'package:motorcycle_clothing/features/plan/ride_planner_models.dart';
import 'package:motorcycle_clothing/features/routes/waypoint_draft.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  SavedRoute commute() => SavedRoute(
        id: 'c1',
        name: 'Weekday',
        activityType: 'motorcycle',
        routeKind: 'point_to_point',
        category: 'commute',
        isFavorite: false,
        isDefaultCommute: false,
        typicalDurationMin: 40,
        outboundDepartureLocal: '07:30',
        returnDepartureLocal: '16:15',
        waypoints: [
          RouteWaypoint(lat: 59.9, lon: 10.7, label: 'From'),
          RouteWaypoint(lat: 59.1, lon: 10.2, label: 'To'),
        ],
      );

  Widget app(Widget child, {Locale locale = const Locale('en')}) {
    return MaterialApp(
      locale: locale,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(body: child),
    );
  }

  test('saved commute keeps clock templates and a one-way route does not', () {
    final saved = SavedRoute.fromJson({
      'id': 'c1',
      'name': 'Weekday',
      'activityType': 'motorcycle',
      'category': 'commute',
      'outboundDepartureLocal': '07:30',
      'returnDepartureLocal': '16:15',
      'waypoints': [
        {'lat': 1, 'lon': 2, 'label': 'From'},
        {'lat': 3, 'lon': 4, 'label': 'To'},
      ],
    });
    expect(saved.isCommute, isTrue);
    expect(saved.outboundDepartureLocal, '07:30');
    expect(saved.returnDepartureLocal, '16:15');

    final body = savedRouteBody(
      name: 'Weekday',
      category: 'commute',
      isFavorite: false,
      activityType: 'motorcycle',
      waypoints: const [],
      typicalDurationMin: 40,
      outboundDepartureLocal: '07:30',
      returnDepartureLocal: '16:15',
    );
    expect(body['outboundDepartureLocal'], '07:30');
    expect(body['returnDepartureLocal'], '16:15');

    final oneWay = savedRouteBody(
      name: 'Sunday',
      category: 'weekend',
      isFavorite: false,
      activityType: 'motorcycle',
      waypoints: const [],
      typicalDurationMin: 40,
    );
    expect(oneWay.containsKey('outboundDepartureLocal'), isFalse);
    expect(oneWay.containsKey('returnDepartureLocal'), isFalse);
    expect(commuteFieldsApply('weekend', 'motorcycle'), isFalse);
    expect(commuteFieldsApply(null, 'motorcycle'), isFalse);
  });

  test('one-way planner still sends a single departure', () {
    final state = RidePlannerState(
      leaveNow: true,
      waypoints: [
        WaypointDraft.fromResolved(
          ResolvedPlace(
            providerPlaceId: 'a',
            label: 'A',
            lat: 1,
            lon: 1,
            address: 'A',
          ),
        ),
        WaypointDraft.fromResolved(
          ResolvedPlace(
            providerPlaceId: 'b',
            label: 'B',
            lat: 2,
            lon: 2,
            address: 'B',
          ),
        ),
      ],
    );
    final body = state.planRequestBody();
    expect(body['departureAt'], isNotNull);
    expect(body.containsKey('returnTime'), isFalse);
    expect(body.containsKey('returnNextDay'), isFalse);
  });

  testWidgets('commute planning offers two times and a next-day return', (
    tester,
  ) async {
    final date = TextEditingController(text: '2026-06-02');
    final outbound = TextEditingController(text: '07:30');
    final returning = TextEditingController(text: '16:15');
    var nextDay = false;
    addTearDown(date.dispose);
    addTearDown(outbound.dispose);
    addTearDown(returning.dispose);

    await tester.pumpWidget(
      app(
        StatefulBuilder(
          builder: (context, setState) {
            return ListView(
              children: [
                CommuteScheduleFields(
                  date: date,
                  outbound: outbound,
                  returning: returning,
                  nextDay: nextDay,
                  onNextDay: (value) => setState(() => nextDay = value),
                ),
              ],
            );
          },
        ),
      ),
    );
    expect(find.text('07:30'), findsOneWidget);
    expect(find.text('16:15'), findsOneWidget);
    await tester.enterText(find.byKey(const Key('commute-date')), '2026-03-28');
    await tester.enterText(
      find.byKey(const Key('commute-return-time')),
      '06:00',
    );
    await tester.tap(find.byKey(const Key('commute-next-day')));
    await tester.pump();
    expect(nextDay, isTrue);
    expect(
      commutePlanBody(
        date: date.text,
        outboundTime: outbound.text,
        returnTime: returning.text,
        returnNextDay: nextDay,
      ),
      {
        'date': '2026-03-28',
        'outboundTime': '07:30',
        'returnTime': '06:00',
        'returnNextDay': true,
      },
    );
  });

  testWidgets('one combined block labels both legs and dedupes preparation', (
    tester,
  ) async {
    Map<String, dynamic>? feedback;
    await tester.pumpWidget(
      app(
        ListView(
          children: [
            CommuteResultView(
              payload: {
                'route': {'id': 'c1', 'activityType': 'motorcycle'},
                'differences': ['DRY_MORNING_RAIN_RETURN'],
                'preparation': {
                  'wear': [
                    {
                      'garmentId': 'jacket',
                      'garmentName': 'Touring jacket',
                      'source': 'wardrobe',
                      'configuration': [
                        {'code': 'VENTS_OPEN'},
                      ],
                    },
                  ],
                  'pack': [
                    {
                      'garmentId': 'rain',
                      'garmentName': 'Rain suit',
                      'source': 'wardrobe',
                      'configuration': [],
                    },
                  ],
                  'returnAdjustments': [
                    {
                      'garmentId': 'jacket',
                      'garmentName': 'Touring jacket',
                      'source': 'wardrobe',
                      'configuration': [
                        {'code': 'INSTALL_THERMAL_LINER'},
                      ],
                    },
                  ],
                },
                'legs': [
                  {
                    'leg': 'outbound',
                    'planId': 'out',
                    'available': true,
                    'startLabel': 'From',
                    'endLabel': 'To',
                    'departureLocal': '07:30',
                    'arrivalLocal': '08:10',
                    'civilDate': '2026-06-02',
                    'departureAt': '2026-06-02T05:30:00.000Z',
                    'weather': {
                      'minTempC': 18,
                      'maxTempC': 18,
                      'maxPrecipMm': 0,
                      'maxRainProbPct': 5,
                      'maxWindMs': 2,
                    },
                    'recommendation': {
                      'confidence': {'level': 'MEDIUM'},
                    },
                  },
                  {
                    'leg': 'return',
                    'planId': 'back',
                    'available': true,
                    'startLabel': 'To',
                    'endLabel': 'From',
                    'departureLocal': '16:15',
                    'arrivalLocal': '17:10',
                    'civilDate': '2026-06-02',
                    'departureAt': '2026-06-02T14:15:00.000Z',
                    'weather': {
                      'minTempC': 14,
                      'maxTempC': 14,
                      'maxPrecipMm': 1.4,
                      'maxRainProbPct': 80,
                      'maxWindMs': 4,
                    },
                    'recommendation': {
                      'confidence': {'level': 'MEDIUM'},
                    },
                  },
                ],
              },
              onFeedback: (body) => feedback = body,
            ),
          ],
        ),
      ),
    );

    expect(find.byKey(const Key('commute-block')), findsOneWidget);
    expect(find.byKey(const Key('commute-leg-outbound')), findsOneWidget);
    expect(find.byKey(const Key('commute-leg-return')), findsOneWidget);
    expect(find.text('Outbound'), findsWidgets);
    expect(find.text('Return'), findsWidgets);
    expect(find.textContaining('Dry in the morning'), findsOneWidget);
    expect(find.text('Rain suit'), findsOneWidget);
    expect(find.textContaining('Touring jacket'), findsNWidgets(2));
    expect(find.byKey(const Key('commute-wear')), findsOneWidget);
    expect(find.byKey(const Key('commute-pack')), findsOneWidget);

    await tester.tap(find.byKey(const Key('commute-feedback-return')));
    await tester.pump();
    expect(feedback?['planId'], 'back');
    expect(feedback?['route']['activityType'], 'motorcycle');
  });

  testWidgets('missing return data stays on the return leg', (tester) async {
    await tester.pumpWidget(
      app(
        ListView(
          children: [
            CommuteResultView(
              payload: {
                'differences': [],
                'preparation': {'wear': [], 'pack': [], 'returnAdjustments': []},
                'legs': [
                  {
                    'leg': 'outbound',
                    'available': true,
                    'startLabel': 'From',
                    'endLabel': 'To',
                    'departureLocal': '07:30',
                    'arrivalLocal': '08:10',
                    'civilDate': '2026-06-02',
                    'weather': {
                      'minTempC': 18,
                      'maxTempC': 18,
                      'maxPrecipMm': 0,
                      'maxRainProbPct': 0,
                      'maxWindMs': 2,
                    },
                  },
                  {
                    'leg': 'return',
                    'available': false,
                    'unavailableReason': 'out_of_range',
                    'startLabel': 'To',
                    'endLabel': 'From',
                    'departureLocal': '16:15',
                    'civilDate': '2026-06-02',
                  },
                ],
              },
            ),
          ],
        ),
      ),
    );
    expect(find.byKey(const Key('commute-return-unavailable')), findsOneWidget);
    expect(find.textContaining('Morning conditions are not used'), findsOneWidget);
    expect(find.byKey(const Key('commute-temp-outbound')), findsOneWidget);
    expect(find.byKey(const Key('commute-temp-return')), findsNothing);
    expect(find.byKey(const Key('commute-feedback-return')), findsNothing);
  });

  testWidgets('Norwegian copy names Til jobb and Hjem', (tester) async {
    await tester.pumpWidget(
      app(
        ListView(
          children: [
            CommuteResultView(
              payload: {
                'differences': ['DRY_MORNING_RAIN_RETURN'],
                'preparation': {
                  'wear': [],
                  'pack': [
                    {
                      'garmentName': 'Regntøy',
                      'source': 'wardrobe',
                      'configuration': [],
                    },
                  ],
                  'returnAdjustments': [],
                },
                'legs': [
                  {
                    'leg': 'outbound',
                    'available': true,
                    'startLabel': 'Fra',
                    'endLabel': 'Til',
                    'departureLocal': '07:30',
                    'arrivalLocal': '08:10',
                    'civilDate': '2026-06-02',
                    'weather': {
                      'minTempC': 12,
                      'maxTempC': 12,
                      'maxPrecipMm': 0,
                      'maxRainProbPct': 0,
                      'maxWindMs': 1,
                    },
                  },
                  {
                    'leg': 'return',
                    'available': false,
                    'startLabel': 'Til',
                    'endLabel': 'Fra',
                    'departureLocal': '16:00',
                    'civilDate': '2026-06-02',
                  },
                ],
              },
            ),
          ],
        ),
        locale: const Locale('nb'),
      ),
    );
    expect(find.text('Til jobb'), findsOneWidget);
    expect(find.text('Hjem'), findsOneWidget);
    expect(find.textContaining('Opphold på morgenen'), findsOneWidget);
    expect(find.textContaining('ikke tilgjengelig'), findsOneWidget);
  });

  test('commute route is distinct from the default-route flag', () {
    final route = commute();
    expect(route.isCommute, isTrue);
    expect(route.isDefaultCommute, isFalse);
  });
}
