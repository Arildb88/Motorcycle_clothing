import { isActivityType } from '../domain/enums';
import { parseExposureMode } from './alpine/exposure';
import { parseIntensity } from './cycling/pipeline';
import { parseXcIntensity, parseXcStyle } from './xc/pipeline';

/**
 * Values the mobile planner is allowed to send on GET /recommend.
 * Query names are routeId, departureAt, and, by activity, intensity, exposure, style.
 */
describe('mobile activity planning contract', () => {
  it('keeps the activity types the planner can store on a route', () => {
    for (const id of [
      'motorcycle',
      'cycling',
      'alpine_skiing',
      'snowboarding',
      'xc_skiing',
    ]) {
      expect(isActivityType(id)).toBe(true);
    }
  });

  it('accepts easy, steady, and hard for cycling and cross-country', () => {
    for (const value of ['easy', 'steady', 'hard']) {
      expect(parseIntensity(value)).toEqual({
        intensity: value,
        assumed: false,
      });
      expect(parseXcIntensity(value)).toEqual({
        intensity: value,
        assumed: false,
      });
    }
  });

  it('accepts lift, hike, and base without treating them as assumed', () => {
    for (const value of ['lift', 'hike', 'base'] as const) {
      expect(parseExposureMode(value)).toEqual({
        mode: value,
        assumed: false,
      });
    }
  });

  it('accepts classic and skate and leaves style unset when it is omitted', () => {
    expect(parseXcStyle('classic')).toBe('classic');
    expect(parseXcStyle('skate')).toBe('skate');
    expect(parseXcStyle(undefined)).toBeNull();
    expect(parseXcStyle('')).toBeNull();
  });
});
