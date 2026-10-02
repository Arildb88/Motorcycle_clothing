import {
  reconcileProviderLegs,
  timeProgressAlongLegs,
} from '../../routing/route-weather-sampling';
import type { RouteLegTiming } from '../../routing/routing.types';
import { CYCLING_EXPOSURE } from './constants';
import type { CyclingIntensity, CyclingSampleMotion } from './types';

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function assumedCyclingSpeedKmh(intensity: CyclingIntensity | null): number {
  if (intensity == null) return CYCLING_EXPOSURE.assumedSpeedKmh.steady;
  return CYCLING_EXPOSURE.assumedSpeedKmh[intensity];
}

function speedKmh(distanceM: number, durationMin: number): number {
  const hours = durationMin / 60;
  if (hours <= 0 || distanceM <= 0) return 0;
  return round1(distanceM / 1000 / hours);
}

function distanceBounds(progresses: number[]): number[] {
  if (progresses.length <= 1) return [0, 1];
  const bounds = [0];
  for (let index = 0; index < progresses.length - 1; index++) {
    bounds.push((progresses[index] + progresses[index + 1]) / 2);
  }
  bounds.push(1);
  return bounds;
}

function durationShares(
  totalMin: number,
  timeWidths: number[],
): number[] {
  const count = timeWidths.length;
  if (count <= 1) return [Math.max(1, Math.round(totalMin))];
  const widthSum = timeWidths.reduce((sum, width) => sum + width, 0) || 1;
  const durations = timeWidths.map((width) =>
    Math.max(1, Math.round((width / widthSum) * totalMin)),
  );
  const sum = durations.reduce((total, value) => total + value, 0);
  durations[count - 1] = Math.max(
    1,
    durations[count - 1] + (Math.round(totalMin) - sum),
  );
  return durations;
}

/**
 * Ground speed along weather samples.
 * Cycling geometry uses provider distance and duration, including a faster
 * or slower band when provider legs reconcile. Style speed is only the
 * fallback when that geometry is absent. It never replaces a route speed.
 */
export function cyclingSampleMotion(input: {
  sampleCount: number;
  progresses: number[];
  durationMin: number;
  distanceM: number | null;
  usedCyclingGeometry: boolean;
  legs?: RouteLegTiming[] | null;
  intensity: CyclingIntensity | null;
}): CyclingSampleMotion[] {
  const count = Math.max(0, input.sampleCount);
  if (count === 0) return [];

  const durationMin = Number.isFinite(input.durationMin)
    ? Math.max(1, input.durationMin)
    : 1;
  const distanceM =
    input.distanceM != null && Number.isFinite(input.distanceM)
      ? Math.max(0, input.distanceM)
      : 0;
  const geometry =
    input.usedCyclingGeometry && distanceM > 0 && durationMin > 0;

  if (!geometry) {
    const speed = assumedCyclingSpeedKmh(input.intensity);
    const durations = durationShares(
      durationMin,
      Array.from({ length: count }, () => 1),
    );
    return durations.map((sampleDuration) => ({
      expectedSpeedKmh: speed,
      durationMin: sampleDuration,
      speedSource: 'assumed_style' as const,
    }));
  }

  const progresses = Array.from({ length: count }, (_, index) => {
    const value = input.progresses[index];
    if (!Number.isFinite(value)) return index / Math.max(1, count - 1);
    return Math.min(1, Math.max(0, value));
  });
  const bounds = distanceBounds(progresses);
  const reconciled = reconcileProviderLegs(input.legs, durationMin);
  const timeAt = reconciled
    ? (fraction: number) => timeProgressAlongLegs(fraction, reconciled)
    : (fraction: number) => fraction;
  const timeWidths = bounds
    .slice(0, count)
    .map((bound, index) => Math.max(0, timeAt(bounds[index + 1]) - timeAt(bound)));
  const durations = durationShares(durationMin, timeWidths);
  const overview = speedKmh(distanceM, durationMin);

  return durations.map((sampleDuration, index) => {
    const distanceFraction = Math.max(0, bounds[index + 1] - bounds[index]);
    const bandDistanceM = distanceM * distanceFraction;
    const bandSpeed = speedKmh(bandDistanceM, sampleDuration);
    return {
      expectedSpeedKmh: bandSpeed > 0 ? bandSpeed : overview,
      durationMin: sampleDuration,
      speedSource: 'cycling_geometry' as const,
    };
  });
}
