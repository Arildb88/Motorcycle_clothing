import {
  DEFAULT_UNIT_PREFERENCES,
  isDistanceUnit,
  isSpeedUnit,
  isTemperatureUnit,
  isWindSpeedUnit,
  normalizeUnitPreferences,
} from './units';

describe('unit preferences domain', () => {
  it('accepts language-neutral enum values only', () => {
    expect(isTemperatureUnit('celsius')).toBe(true);
    expect(isTemperatureUnit('fahrenheit')).toBe(true);
    expect(isTemperatureUnit('Celsius')).toBe(false);
    expect(isDistanceUnit('kilometer')).toBe(true);
    expect(isDistanceUnit('mile')).toBe(true);
    expect(isSpeedUnit('kmh')).toBe(true);
    expect(isSpeedUnit('mph')).toBe(true);
    expect(isWindSpeedUnit('ms')).toBe(true);
    expect(isWindSpeedUnit('kmh')).toBe(true);
    expect(isWindSpeedUnit('mph')).toBe(true);
    expect(isWindSpeedUnit('m/s')).toBe(false);
  });

  it('defaults preserve historical RideWear metric display', () => {
    expect(normalizeUnitPreferences({})).toEqual(DEFAULT_UNIT_PREFERENCES);
  });

  it('maps legacy units field to temperatureUnit', () => {
    expect(
      normalizeUnitPreferences({ units: 'fahrenheit' }).temperatureUnit,
    ).toBe('fahrenheit');
  });

  it('explicit fields override defaults independently', () => {
    const prefs = normalizeUnitPreferences({
      units: 'celsius',
      distanceUnit: 'mile',
      speedUnit: 'mph',
      windSpeedUnit: 'mph',
    });
    expect(prefs).toEqual({
      temperatureUnit: 'celsius',
      distanceUnit: 'mile',
      speedUnit: 'mph',
      windSpeedUnit: 'mph',
    });
  });
});
