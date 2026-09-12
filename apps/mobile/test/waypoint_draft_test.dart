import 'package:flutter_test/flutter_test.dart';
import 'package:motorcycle_clothing/domain/saved_route.dart';
import 'package:motorcycle_clothing/features/routes/waypoint_draft.dart';
import 'package:motorcycle_clothing/services/location/location_models.dart';

void main() {
  group('place selection → RouteWaypoint', () {
    test('ResolvedPlace maps to draft and API waypoint with labels', () {
      const place = ResolvedPlace(
        providerPlaceId: 'pid_1',
        label: 'Kristiansand',
        lat: 58.1467,
        lon: 7.9956,
        address: 'Kristiansand, Norway',
      );

      final draft = WaypointDraft.fromResolved(place);
      expect(draft.isResolved, isTrue);
      expect(draft.displayLabel, 'Kristiansand');
      expect(draft.lat, 58.1467);
      expect(draft.lon, 7.9956);

      final wp = draft.toRouteWaypoint(sortOrder: 0, waypointType: 'start');
      expect(wp, isA<RouteWaypoint>());
      expect(wp.label, 'Kristiansand');
      expect(wp.address, 'Kristiansand, Norway');
      expect(wp.lat, 58.1467);
      expect(wp.lon, 7.9956);
      expect(wp.sortOrder, 0);

      final json = draft.toApiJson();
      expect(json['lat'], 58.1467);
      expect(json['lon'], 7.9956);
      expect(json['label'], 'Kristiansand');
      expect(json['address'], 'Kristiansand, Norway');
      expect(json.containsKey('providerPlaceId'), isFalse);
    });

    test('normal path never requires typing lat/lon strings', () {
      final start = WaypointDraft.fromResolved(
        const ResolvedPlace(
          providerPlaceId: 'a',
          label: 'Start Place',
          lat: 58.1,
          lon: 8.0,
          address: 'Start Address',
        ),
      );
      final end = WaypointDraft.fromResolved(
        const ResolvedPlace(
          providerPlaceId: 'b',
          label: 'End Place',
          lat: 58.2,
          lon: 8.1,
          address: 'End Address',
        ),
      );

      expect(
        WaypointListOps.canSave(name: 'Commute', waypoints: [start, end]),
        isTrue,
      );
      final api = WaypointListOps.toApiWaypoints([start, end]);
      expect(api.length, 2);
      expect(api.every((m) => m['lat'] is double && m['lon'] is double), isTrue);
      expect(api.every((m) => (m['label'] as String).isNotEmpty), isTrue);
    });
  });

  group('waypoint ordering / add / remove / reorder', () {
    test('ensureStartAndEnd pads to two empty drafts', () {
      expect(WaypointListOps.ensureStartAndEnd([]).length, 2);
      expect(WaypointListOps.ensureStartAndEnd([WaypointDraft.empty()]).length, 2);
    });

    test('addStop inserts before destination', () {
      final a = WaypointDraft.fromResolved(
        const ResolvedPlace(
          providerPlaceId: 'a',
          label: 'A',
          lat: 1,
          lon: 1,
        ),
      );
      final b = WaypointDraft.fromResolved(
        const ResolvedPlace(
          providerPlaceId: 'b',
          label: 'B',
          lat: 2,
          lon: 2,
        ),
      );
      final next = WaypointListOps.addStop([a, b]);
      expect(next.length, 3);
      expect(next.first.label, 'A');
      expect(next.last.label, 'B');
      expect(next[1].isResolved, isFalse);
      expect(WaypointListOps.roleLabel(1, 3), 'Stop 1');
    });

    test('removeAt refuses dropping below two waypoints', () {
      final list = [
        WaypointDraft.empty(),
        WaypointDraft.empty(),
      ];
      expect(WaypointListOps.removeAt(list, 0), isNull);
    });

    test('removeAt removes intermediate stop', () {
      final list = [
        WaypointDraft(label: 'A', lat: 1, lon: 1),
        WaypointDraft(label: 'M', lat: 1.5, lon: 1.5),
        WaypointDraft(label: 'B', lat: 2, lon: 2),
      ];
      final next = WaypointListOps.removeAt(list, 1)!;
      expect(next.map((w) => w.label).toList(), ['A', 'B']);
    });

    test('move reorders and preserves labels', () {
      final list = [
        WaypointDraft(label: 'A', lat: 1, lon: 1),
        WaypointDraft(label: 'M', lat: 1.5, lon: 1.5),
        WaypointDraft(label: 'B', lat: 2, lon: 2),
      ];
      final up = WaypointListOps.move(list, 1, -1)!;
      expect(up.map((w) => w.label).toList(), ['M', 'A', 'B']);
      final down = WaypointListOps.move(list, 0, 1)!;
      expect(down.map((w) => w.label).toList(), ['M', 'A', 'B']);
      expect(WaypointListOps.move(list, 0, -1), isNull);
    });

    test('canSave requires name and all resolved waypoints', () {
      final unresolved = [WaypointDraft.empty(), WaypointDraft.empty()];
      expect(
        WaypointListOps.canSave(name: 'X', waypoints: unresolved),
        isFalse,
      );
      expect(
        WaypointListOps.canSave(name: '', waypoints: [
          WaypointDraft(lat: 1, lon: 1),
          WaypointDraft(lat: 2, lon: 2),
        ]),
        isFalse,
      );
    });

    test('clearPlace removes coordinates for change/clear UX', () {
      final w = WaypointDraft.fromResolved(
        const ResolvedPlace(
          providerPlaceId: 'x',
          label: 'X',
          lat: 1,
          lon: 2,
          address: 'Addr',
        ),
      );
      w.clearPlace();
      expect(w.isResolved, isFalse);
      expect(w.displayLabel, '');
    });
  });
}
