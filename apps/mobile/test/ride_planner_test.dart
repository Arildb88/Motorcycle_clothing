import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
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
      expect(reversed.last.label, 'M');

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

    final nb = await load(const Locale('nb'));
    expect(nb.plannerTitle, isNotEmpty);
    expect(nb.plannerAnalyzeRide, contains('Analyser'));
    expect(nb.plannerDeparture, isNotEmpty);
  });
}
