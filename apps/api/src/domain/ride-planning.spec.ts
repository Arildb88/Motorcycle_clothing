import {
  DEFAULT_ROUTE_PREFERENCES,
  deriveWaypointRole,
  isPlanningMode,
  parseRoutePlanSnapshot,
  parseRoutePreferences,
  resolvePlanSchedule,
  serializeRoutePreferences,
  upgradeRoutePlanSnapshot,
} from './ride-planning';

describe('ride planning domain', () => {
  describe('planningMode', () => {
    it('accepts language-neutral departure/arrival only', () => {
      expect(isPlanningMode('departure')).toBe(true);
      expect(isPlanningMode('arrival')).toBe(true);
      expect(isPlanningMode('Departure')).toBe(false);
      expect(isPlanningMode('avreise')).toBe(false);
    });
  });

  describe('resolvePlanSchedule', () => {
    it('departure mode derives arrival from duration', () => {
      const schedule = resolvePlanSchedule({
        planningMode: 'departure',
        departureAt: new Date('2026-09-14T07:00:00.000Z'),
        durationMin: 50,
      });
      expect(schedule.departureAt.toISOString()).toBe(
        '2026-09-14T07:00:00.000Z',
      );
      expect(schedule.arrivalAt.toISOString()).toBe(
        '2026-09-14T07:50:00.000Z',
      );
      expect(schedule.planningMode).toBe('departure');
    });

    it('arrival mode derives departure from duration', () => {
      const schedule = resolvePlanSchedule({
        planningMode: 'arrival',
        arrivalAt: new Date('2026-09-14T08:00:00.000Z'),
        durationMin: 50,
      });
      expect(schedule.arrivalAt.toISOString()).toBe(
        '2026-09-14T08:00:00.000Z',
      );
      expect(schedule.departureAt.toISOString()).toBe(
        '2026-09-14T07:10:00.000Z',
      );
      expect(schedule.planningMode).toBe('arrival');
    });
  });

  describe('route preferences', () => {
    it('serializes avoidMotorways without UI strings', () => {
      const json = serializeRoutePreferences({ avoidMotorways: true });
      expect(json).toBe(
        '{"avoidMotorways":true,"avoidTolls":false,"avoidFerries":false}',
      );
      expect(parseRoutePreferences(json)).toEqual({
        avoidMotorways: true,
        avoidTolls: false,
        avoidFerries: false,
      });
    });

    it('ignores unknown keys and defaults missing flags', () => {
      expect(parseRoutePreferences('{"avoidHighways":true}')).toEqual(
        DEFAULT_ROUTE_PREFERENCES,
      );
      expect(parseRoutePreferences(null)).toEqual(DEFAULT_ROUTE_PREFERENCES);
    });
  });

  describe('ordered waypoints / round trips', () => {
    it('derives start/stop/end roles from order', () => {
      expect(deriveWaypointRole(0, 4)).toBe('start');
      expect(deriveWaypointRole(1, 4)).toBe('stop');
      expect(deriveWaypointRole(2, 4)).toBe('stop');
      expect(deriveWaypointRole(3, 4)).toBe('end');
    });
  });

  describe('snapshot compatibility', () => {
    it('upgrades v1 snapshots without losing waypoints', () => {
      const v1 = {
        version: 1 as const,
        source: 'saved_route' as const,
        savedRouteId: 'r1',
        name: 'Commute',
        activityType: 'motorcycle',
        routeKind: 'point_to_point',
        typicalDurationMin: 30,
        waypoints: [
          { sortOrder: 0, lat: 58.15, lon: 8.0, label: 'Home' },
          { sortOrder: 1, lat: 58.16, lon: 8.01, label: 'Work' },
        ],
        startLat: 58.15,
        startLon: 8.0,
        endLat: 58.16,
        endLon: 8.01,
        snappedAt: '2026-09-14T07:00:00.000Z',
      };
      const upgraded = upgradeRoutePlanSnapshot(v1);
      expect(upgraded.version).toBe(2);
      expect(upgraded.waypoints).toHaveLength(2);
      expect(upgraded.preferences).toEqual(DEFAULT_ROUTE_PREFERENCES);
      expect(upgraded.planningMode).toBe('departure');

      const parsed = parseRoutePlanSnapshot(JSON.stringify(v1));
      expect(parsed?.waypoints).toHaveLength(2);
    });
  });
});
