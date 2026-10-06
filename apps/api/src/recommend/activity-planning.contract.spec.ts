import { isActivityType } from '../domain/enums';
import { parseExposureMode } from './alpine/exposure';
import { parseIntensity } from './cycling/pipeline';
import { parseBasicLayers } from './motorcycle/basic-layers';
import { parseXcIntensity, parseXcStyle } from './xc/pipeline';

/**
 * Values the mobile planner is allowed to send on GET /recommend.
 * Query names are routeId, departureAt, and, by activity, intensity, exposure,
 * style, or motorcycle basicUpper and basicLower.
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

  it('treats an unknown or cross-activity input as assumed, not as a real choice', () => {
    expect(parseIntensity('lift')).toEqual({
      intensity: 'steady',
      assumed: true,
    });
    expect(parseIntensity('classic')).toEqual({
      intensity: 'steady',
      assumed: true,
    });
    expect(parseIntensity('  HARD ')).toEqual({
      intensity: 'hard',
      assumed: false,
    });
    expect(parseXcIntensity('hike')).toEqual({
      intensity: 'steady',
      assumed: true,
    });
    expect(parseXcStyle('easy')).toBeNull();
    expect(parseXcStyle('skøyting')).toBeNull();
    expect(parseExposureMode('hard')).toEqual({
      mode: 'lift',
      assumed: true,
    });
    expect(parseExposureMode('steady')).toEqual({
      mode: 'lift',
      assumed: true,
    });
    expect(parseExposureMode('Groomers')).toEqual({
      mode: 'lift',
      assumed: false,
    });
  });

  it('accepts motorcycle basic under-layers and treats none as no clothing', () => {
    expect(parseBasicLayers(undefined, undefined)).toEqual({
      upper: [],
      lower: [],
    });
    expect(parseBasicLayers('none', 'none')).toEqual({
      upper: [],
      lower: [],
    });
    expect(
      parseBasicLayers('t_shirt,thick_sweater', 'wool_base_bottom,jeans'),
    ).toEqual({
      upper: ['t_shirt', 'thick_sweater'],
      lower: ['wool_base_bottom', 'jeans'],
    });
  });
});
