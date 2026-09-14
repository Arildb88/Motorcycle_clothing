/**
 * User-facing measurement unit preferences (language-neutral enums).
 *
 * Canonical engine / weather / route values stay SI-oriented:
 * - temperature: °C
 * - wind: m/s
 * - distance: metres (API) / km in motorcycle speed conventions
 * - riding speed: km/h
 *
 * Conversion is presentation-only — never feed Imperial into M3 physics.
 */

export const TEMPERATURE_UNITS = ['celsius', 'fahrenheit'] as const;
export type TemperatureUnit = (typeof TEMPERATURE_UNITS)[number];

export const DISTANCE_UNITS = ['kilometer', 'mile'] as const;
export type DistanceUnit = (typeof DISTANCE_UNITS)[number];

export const SPEED_UNITS = ['kmh', 'mph'] as const;
export type SpeedUnit = (typeof SPEED_UNITS)[number];

export const WIND_SPEED_UNITS = ['ms', 'kmh', 'mph'] as const;
export type WindSpeedUnit = (typeof WIND_SPEED_UNITS)[number];

/** Defaults preserve historical RideWear display (metric / SI wind). */
export const DEFAULT_UNIT_PREFERENCES = {
  /** Persisted today as UserProfile.units (temperature). */
  temperatureUnit: 'celsius' as TemperatureUnit,
  distanceUnit: 'kilometer' as DistanceUnit,
  speedUnit: 'kmh' as SpeedUnit,
  windSpeedUnit: 'ms' as WindSpeedUnit,
} as const;

export function isTemperatureUnit(v: unknown): v is TemperatureUnit {
  return (
    typeof v === 'string' &&
    (TEMPERATURE_UNITS as readonly string[]).includes(v)
  );
}

export function isDistanceUnit(v: unknown): v is DistanceUnit {
  return (
    typeof v === 'string' && (DISTANCE_UNITS as readonly string[]).includes(v)
  );
}

export function isSpeedUnit(v: unknown): v is SpeedUnit {
  return typeof v === 'string' && (SPEED_UNITS as readonly string[]).includes(v);
}

export function isWindSpeedUnit(v: unknown): v is WindSpeedUnit {
  return (
    typeof v === 'string' &&
    (WIND_SPEED_UNITS as readonly string[]).includes(v)
  );
}

export type UnitPreferences = {
  temperatureUnit: TemperatureUnit;
  distanceUnit: DistanceUnit;
  speedUnit: SpeedUnit;
  windSpeedUnit: WindSpeedUnit;
};

export function normalizeUnitPreferences(input: {
  /** Legacy profile field name for temperature. */
  units?: string | null;
  temperatureUnit?: string | null;
  distanceUnit?: string | null;
  speedUnit?: string | null;
  windSpeedUnit?: string | null;
}): UnitPreferences {
  const temperatureRaw = input.temperatureUnit ?? input.units;
  return {
    temperatureUnit: isTemperatureUnit(temperatureRaw)
      ? temperatureRaw
      : DEFAULT_UNIT_PREFERENCES.temperatureUnit,
    distanceUnit: isDistanceUnit(input.distanceUnit)
      ? input.distanceUnit
      : DEFAULT_UNIT_PREFERENCES.distanceUnit,
    speedUnit: isSpeedUnit(input.speedUnit)
      ? input.speedUnit
      : DEFAULT_UNIT_PREFERENCES.speedUnit,
    windSpeedUnit: isWindSpeedUnit(input.windSpeedUnit)
      ? input.windSpeedUnit
      : DEFAULT_UNIT_PREFERENCES.windSpeedUnit,
  };
}
