import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/features/plan/activity_recommendation_request.dart';
import 'package:motorcycle_clothing/features/plan/device_location_service.dart';
import 'package:motorcycle_clothing/features/plan/ride_planner_models.dart';
import 'package:motorcycle_clothing/features/routes/waypoint_draft.dart';
import 'package:motorcycle_clothing/l10n/app_localizations.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';

void main() {
  ResolvedPlace place(String id, String label, double lat, double lon) =>
      ResolvedPlace(
        providerPlaceId: id,
        label: label,
        lat: lat,
        lon: lon,
        address: '$label addr',
      );

  group('planner waypoints', () {
    test('place selection maps to RouteWaypoint', () {
      final draft = WaypointDraft.fromResolved(
        place('a', 'Start Town', 58.1, 8.0),
      );
      expect(draft.isResolved, isTrue);
      final wp = draft.toRouteWaypoint(sortOrder: 0, waypointType: 'start');
      expect(wp.lat, 58.1);
      expect(wp.lon, 8.0);
      expect(wp.label, 'Start Town');
    });

    test('add / remove / reorder / reverse / round trip', () {
      final a = WaypointDraft.fromResolved(place('a', 'A', 1, 1));
      final b = WaypointDraft.fromResolved(place('b', 'B', 2, 2));
      var list = [a, b];
      list = WaypointListOps.addStop(list);
      expect(list.length, 3);
      expect(list.last.label, 'B');

      list[1] = WaypointDraft.fromResolved(place('m', 'M', 1.5, 1.5));
      final moved = WaypointListOps.move(list, 1, -1)!;
      expect(moved.first.label, 'M');

      final reversed = WaypointListOps.reverse(moved);
      expect(reversed.first.label, 'B');
      expect(reversed.first.localId, moved.last.localId);
      expect(reversed.first.lat, moved.last.lat);
      expect(reversed.first.lon, moved.last.lon);
      expect(reversed.last.label, 'M');
      expect(reversed.last.localId, moved.first.localId);
      expect(reversed.last.providerPlaceId, moved.first.providerPlaceId);

      final round = WaypointListOps.applyRoundTrip([a, b], enabled: true);
      expect(WaypointListOps.looksLikeRoundTrip(round), isTrue);
      expect(round.last.lat, a.lat);
    });

    test('save disabled until name + resolved waypoints', () {
      expect(
        WaypointListOps.canSave(
          name: '',
          waypoints: [
            WaypointDraft.fromResolved(place('a', 'A', 1, 1)),
            WaypointDraft.fromResolved(place('b', 'B', 2, 2)),
          ],
        ),
        isFalse,
      );
      expect(
        WaypointListOps.canAnalyze([
          WaypointDraft.fromResolved(place('a', 'A', 1, 1)),
          WaypointDraft.fromResolved(place('b', 'B', 2, 2)),
        ]),
        isTrue,
      );
    });
  });

  group('planner schedule + preferences', () {
    test('leave now departure body uses departureAt', () {
      final state = RidePlannerState(
        leaveNow: true,
        planningMode: PlanningMode.departure,
        avoidMotorways: true,
        waypoints: [
          WaypointDraft.fromResolved(place('a', 'A', 1, 1)),
          WaypointDraft.fromResolved(place('b', 'B', 2, 2)),
        ],
      );
      final body = state.planRequestBody();
      expect(body['planningMode'], 'departure');
      expect(body['departureAt'], isNotNull);
      expect(body['preferences']['avoidMotorways'], isTrue);
      expect(body.containsKey('arrivalAt'), isFalse);
    });

    test('alpine and snowboard can plan from one place', () {
      final site = WaypointDraft.fromResolved(place('g', 'Gautefall', 59.07, 8.79));
      final alpine = RidePlannerState(
        activityType: 'alpine_skiing',
        routeName: 'Gautefall',
        waypoints: [site],
      );
      expect(alpine.waypoints, hasLength(1));
      expect(alpine.canAnalyze, isTrue);
      expect(alpine.canSave, isTrue);
      expect(alpine.usesRoadPreview, isFalse);
      expect(alpine.routeUpsertBody()['waypoints'], hasLength(1));
      expect(alpine.routeUpsertBody()['activityType'], 'alpine_skiing');

      final padded = RidePlannerState(
        waypoints: [WaypointDraft.fromResolved(place('a', 'A', 1, 1))],
      );
      expect(padded.activityType, 'motorcycle');
      expect(padded.waypoints, hasLength(2));
      expect(padded.canAnalyze, isFalse);
    });

    test('motorcycle route stays motorcycle and omits activity inputs', () {
      final when = DateTime.utc(2026, 10, 2, 8);
      final state = RidePlannerState(
        leaveNow: false,
        anchorAt: when,
        waypoints: [
          WaypointDraft.fromResolved(place('a', 'A', 1, 1)),
          WaypointDraft.fromResolved(place('b', 'B', 2, 2)),
        ],
      );
      expect(state.activityType, 'motorcycle');
      expect(state.durationMin, 30);
      expect(state.usesRoadPreview, isTrue);
      expect(state.routeUpsertBody()['activityType'], 'motorcycle');
      expect(
        state.recommendQuery('route-1', when.toIso8601String()),
        {
          'routeId': 'route-1',
          'departureAt': when.toIso8601String(),
        },
      );
    });

    test('each activity sends only the inputs its engine accepts', () {
      final when = '2026-10-02T08:00:00.000Z';
      final cycling = RidePlannerState(
        activityType: 'cycling',
        inputs: const ActivityPlanningInputs(intensity: RideIntensity.hard),
      );
      expect(cycling.activityType, 'cycling');
      expect(cycling.recommendQuery('c', when), {
        'routeId': 'c',
        'departureAt': when,
        'intensity': 'hard',
      });

      final alpine = RidePlannerState(
        activityType: 'alpine_skiing',
        inputs: const ActivityPlanningInputs(exposure: AlpineExposureMode.hike),
      );
      expect(alpine.durationMin, 240);
      expect(alpine.usesRoadPreview, isFalse);
      expect(alpine.recommendQuery('a', when), {
        'routeId': 'a',
        'departureAt': when,
        'exposure': 'hike',
      });
      expect(alpine.recommendQuery('a', when).containsKey('intensity'), isFalse);

      final snowboard = RidePlannerState(activityType: 'snowboarding');
      expect(snowboard.recommendQuery('s', when)['exposure'], 'lift');

      final xc = RidePlannerState(
        activityType: 'xc_skiing',
        inputs: const ActivityPlanningInputs(
          intensity: RideIntensity.easy,
          style: XcSkiStyle.skate,
        ),
      );
      expect(xc.durationMin, 120);
      expect(xc.recommendQuery('x', when), {
        'routeId': 'x',
        'departureAt': when,
        'intensity': 'easy',
        'style': 'skate',
      });

      final classicOmitted = RidePlannerState(activityType: 'xc_skiing');
      expect(classicOmitted.recommendQuery('x', when).containsKey('style'), isFalse);
    });

    test('arrival mode uses arrivalAt', () {
      final when = DateTime.utc(2026, 9, 15, 12);
      final state = RidePlannerState(
        leaveNow: false,
        planningMode: PlanningMode.arrival,
        anchorAt: when,
        waypoints: [
          WaypointDraft.fromResolved(place('a', 'A', 1, 1)),
          WaypointDraft.fromResolved(place('b', 'B', 2, 2)),
        ],
      );
      final body = state.planRequestBody();
      expect(body['planningMode'], 'arrival');
      expect(body['arrivalAt'], when.toIso8601String());
    });
  });

  group('current location', () {
    test('fake device location returns resolved start place', () async {
      final fake = FakeDeviceLocationService(
        place: place('device', 'Current location', 59.9, 10.7),
      );
      final result = await fake.getCurrentPlace();
      expect(result.isOk, isTrue);
      expect(result.place!.lat, 59.9);
      final draft = WaypointDraft.fromResolved(result.place!);
      expect(draft.isResolved, isTrue);
    });

    test('permission denied is explicit', () async {
      final fake = FakeDeviceLocationService(
        failure: DeviceLocationFailure.permissionDenied,
      );
      final result = await fake.getCurrentPlace();
      expect(result.isOk, isFalse);
      expect(result.failure, DeviceLocationFailure.permissionDenied);
    });
  });

  testWidgets('planner labels exist in English and Norwegian', (tester) async {
    Future<AppLocalizations> load(Locale locale) async {
      late AppLocalizations l10n;
      await tester.pumpWidget(
        MaterialApp(
          locale: locale,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Builder(
            builder: (context) {
              l10n = AppLocalizations.of(context);
              return const SizedBox.shrink();
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      return l10n;
    }

    final en = await load(const Locale('en'));
    expect(en.plannerTitle, isNotEmpty);
    expect(en.plannerAnalyzeRide, contains('Analyze'));
    expect(en.plannerDeparture, isNotEmpty);
    expect(en.plannerArrival, isNotEmpty);
    expect(en.plannerAvoidMotorways, isNotEmpty);
    expect(en.plannerIntensityEasy, 'Easy');
    expect(en.plannerExposureLift, 'Lifts');
    expect(en.plannerStyleClassic, 'Classic');

    final nb = await load(const Locale('nb'));
    expect(nb.plannerTitle, isNotEmpty);
    expect(nb.plannerAnalyzeRide, contains('Analyser'));
    expect(nb.plannerDeparture, isNotEmpty);
    expect(nb.plannerIntensityEasy, 'Lett');
    expect(nb.plannerStyleSkate, 'Skøyting');
  });

  testWidgets('planning controls follow the activity contract', (tester) async {
    Future<void> pump(String activityType) async {
      await tester.pumpWidget(
        MaterialApp(
          locale: const Locale('en'),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: ActivityPlanningControls(
              activityType: activityType,
              inputs: const ActivityPlanningInputs(),
              onChanged: (_) {},
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    await pump('motorcycle');
    expect(find.text('Easy'), findsNothing);
    expect(find.text('Lifts'), findsNothing);

    await pump('cycling');
    expect(find.text('Easy'), findsOneWidget);
    expect(find.text('Hard'), findsOneWidget);
    expect(find.text('Lifts'), findsNothing);
    expect(find.text('Classic'), findsNothing);

    await pump('snowboarding');
    expect(find.text('Lifts'), findsOneWidget);
    expect(find.text('Staying at the base'), findsOneWidget);
    expect(find.text('Easy'), findsNothing);

    await pump('xc_skiing');
    expect(find.text('Easy'), findsOneWidget);
    expect(find.text('Not specified'), findsOneWidget);
    expect(find.text('Skate'), findsOneWidget);
    expect(find.text('Lifts'), findsNothing);
  });
}
