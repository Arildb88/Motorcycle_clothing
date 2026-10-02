import { ALPINE_EXPOSURE } from './constants';
import type { AlpineSite, AlpineWeatherRequest } from './types';

/**
 * One forecast request per site that has its own elevation, at a time inside
 * the session. Upper never receives the base elevation.
 */
export function planAlpineWeatherSamples(input: {
  sites: AlpineSite[];
  departAt: Date;
  durationMin: number;
}): AlpineWeatherRequest[] {
  const duration = Number.isFinite(input.durationMin)
    ? Math.max(0, input.durationMin)
    : 0;
  const phases = sessionPhases(input.departAt, duration);
  const requests: AlpineWeatherRequest[] = [];

  for (const site of input.sites) {
    if (site.elevationM == null || !Number.isFinite(site.elevationM)) continue;
    for (const phase of phases) {
      requests.push({
        role: site.role,
        lat: site.lat,
        lon: site.lon,
        altitudeM: site.elevationM,
        at: phase.at,
        estimated: site.estimated,
        phase: phase.phase,
      });
    }
  }

  return requests;
}

function sessionPhases(
  departAt: Date,
  durationMin: number,
): Array<{ phase: AlpineWeatherRequest['phase']; at: Date }> {
  if (durationMin < ALPINE_EXPOSURE.longSessionMin) {
    return [{ phase: 'start', at: departAt }];
  }
  return [
    { phase: 'start', at: departAt },
    {
      phase: 'middle',
      at: new Date(departAt.getTime() + (durationMin / 2) * 60_000),
    },
    {
      phase: 'end',
      at: new Date(departAt.getTime() + durationMin * 60_000),
    },
  ];
}
