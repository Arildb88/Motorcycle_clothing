import type {
  AlpinePin,
  AlpineSite,
  AlpineSitePlan,
  AlpineSiteRole,
  AlpineUpperForecast,
} from './types';

const ROLES: AlpineSiteRole[] = ['base', 'mid', 'upper'];

const ROLE_WORDS: Record<AlpineSiteRole, RegExp> = {
  upper: /\b(upper|summit|peak|top)\b/i,
  mid: /\b(mid-mountain|midmountain|mid|middle)\b/i,
  base: /\b(base|village|bottom|lower)\b/i,
};

type Candidate = {
  index: number;
  lat: number;
  lon: number;
  elevationM: number | null;
  labeled: AlpineSiteRole | null;
};

export function roleFromLabel(label?: string | null): AlpineSiteRole | null {
  if (!label) return null;
  const text = label.trim();
  if (!text) return null;
  if (ROLE_WORDS.upper.test(text)) return 'upper';
  if (ROLE_WORDS.mid.test(text)) return 'mid';
  if (ROLE_WORDS.base.test(text)) return 'base';
  return null;
}

/**
 * Turn user pins into base, optional mid, and upper.
 * A lone village pin is never the summit. Equal heights without labels do not
 * invent one. Mid is estimated only between two known elevations.
 */
export function resolveAlpineSites(pins: AlpinePin[]): AlpineSitePlan {
  const candidates: Candidate[] = pins.map((pin, index) => ({
    index,
    lat: pin.lat,
    lon: pin.lon,
    elevationM: finiteMetres(pin.elevationM),
    labeled: roleFromLabel(pin.label),
  }));
  const used = new Set<number>();
  const assigned = new Map<
    AlpineSiteRole,
    { candidate: Candidate; source: AlpineSite['source'] }
  >();

  for (const role of ROLES) {
    const matches = candidates.filter(
      (candidate) => candidate.labeled === role && !used.has(candidate.index),
    );
    const chosen = chooseLabeled(role, matches);
    if (!chosen) continue;
    used.add(chosen.index);
    assigned.set(role, { candidate: chosen, source: 'labeled' });
  }

  const available = () =>
    candidates.filter(
      (candidate) => !used.has(candidate.index) && candidate.elevationM != null,
    );

  const heights = available();
  if (heights.length >= 2) {
    const sorted = [...heights].sort(
      (a, b) =>
        (a.elevationM as number) - (b.elevationM as number) ||
        a.index - b.index,
    );
    const lowest = sorted[0];
    const highest = sorted[sorted.length - 1];
    if ((lowest.elevationM as number) < (highest.elevationM as number)) {
      if (!assigned.has('base')) {
        used.add(lowest.index);
        assigned.set('base', { candidate: lowest, source: 'elevation_order' });
      }
      const baseElevation = assigned.get('base')?.candidate.elevationM;
      if (
        !assigned.has('upper') &&
        !used.has(highest.index) &&
        (baseElevation == null ||
          (highest.elevationM as number) > baseElevation)
      ) {
        used.add(highest.index);
        assigned.set('upper', {
          candidate: highest,
          source: 'elevation_order',
        });
      }
    }
  }

  if (
    !assigned.has('base') &&
    !assigned.has('upper') &&
    available().length === 1
  ) {
    const only = available()[0];
    used.add(only.index);
    assigned.set('base', { candidate: only, source: 'elevation_order' });
  }

  if (!assigned.has('mid')) {
    const base = assigned.get('base');
    const upper = assigned.get('upper');
    const rest = available();
    if (
      rest.length > 0 &&
      base?.candidate.elevationM != null &&
      upper?.candidate.elevationM != null
    ) {
      const target =
        (base.candidate.elevationM + upper.candidate.elevationM) / 2;
      const nearest = [...rest].sort(
        (a, b) =>
          Math.abs((a.elevationM as number) - target) -
            Math.abs((b.elevationM as number) - target) || a.index - b.index,
      )[0];
      used.add(nearest.index);
      assigned.set('mid', { candidate: nearest, source: 'elevation_order' });
    }
  }

  const sites: AlpineSite[] = [];
  for (const role of ROLES) {
    const slot = assigned.get(role);
    if (!slot) continue;
    sites.push({
      role,
      lat: slot.candidate.lat,
      lon: slot.candidate.lon,
      elevationM: slot.candidate.elevationM,
      estimated: false,
      source: slot.source,
    });
  }

  const base = sites.find((site) => site.role === 'base');
  const upper = sites.find((site) => site.role === 'upper');
  if (
    !sites.some((site) => site.role === 'mid') &&
    base?.elevationM != null &&
    upper?.elevationM != null
  ) {
    sites.splice(
      sites.findIndex((site) => site.role === 'upper'),
      0,
      {
        role: 'mid',
        lat: round6((base.lat + upper.lat) / 2),
        lon: round6((base.lon + upper.lon) / 2),
        elevationM: Math.round((base.elevationM + upper.elevationM) / 2),
        estimated: true,
        source: 'midpoint_estimate',
      },
    );
  }

  const upperSite = sites.find((site) => site.role === 'upper');
  const upperForecast: AlpineUpperForecast = !upperSite
    ? 'missing'
    : upperSite.elevationM == null
      ? 'elevation_unavailable'
      : 'ready';

  return {
    sites,
    upperForecast,
    sitesNeedLabels:
      pins.length >= 2 && !sites.some((site) => site.role === 'upper'),
  };
}

function chooseLabeled(
  role: AlpineSiteRole,
  matches: Candidate[],
): Candidate | null {
  if (matches.length === 0) return null;
  const withElevation = matches.filter(
    (candidate) => candidate.elevationM != null,
  );
  const pool = withElevation.length > 0 ? withElevation : matches;
  if (role === 'upper') {
    return pool.reduce((best, candidate) =>
      (candidate.elevationM ?? Number.NEGATIVE_INFINITY) >
      (best.elevationM ?? Number.NEGATIVE_INFINITY)
        ? candidate
        : best,
    );
  }
  if (role === 'base') {
    return pool.reduce((best, candidate) =>
      (candidate.elevationM ?? Number.POSITIVE_INFINITY) <
      (best.elevationM ?? Number.POSITIVE_INFINITY)
        ? candidate
        : best,
    );
  }
  return pool[0];
}

function finiteMetres(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
