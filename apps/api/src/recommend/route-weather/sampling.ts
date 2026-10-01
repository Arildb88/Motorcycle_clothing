/**
 * Bounded route weather sampling (v1).
 *
 * Strategy `bounded_v1`:
 * 1. Always include start and destination.
 * 2. Include intermediate stop/waypoint positions when present on geometry.
 * 3. Add distance-interval samples (~every targetIntervalM) and/or
 *    travel-time boundaries (~every targetIntervalMin).
 * 4. Prefer travel-segment boundaries where speed changes meaningfully
 *    (relative delta ≥ speedChangeRatio) when budget remains.
 * 5. Deduplicate by distance proximity; hard-cap at maxSamples.
 *
 * Does NOT request weather for every geometry point.
 * Strategy can be refined later without changing RouteWeatherSample contract.
 */

import type { GeoPoint, RouteAnalysis } from '../../routing/routing.types';

export const ROUTE_WEATHER_SAMPLING = {
  maxSamples: 8,
  /** Target spacing by distance along route. */
  targetIntervalM: 15_000,
  /** Target spacing by travel time along route. */
  targetIntervalMin: 15,
  /** Merge candidates closer than this (metres). */
  minSeparationM: 2_000,
  /** Relative speed change that marks a meaningful segment boundary. */
  speedChangeRatio: 0.35,
} as const;

export type SampleAnchor = {
  distanceFromStartM: number;
  coordinate: GeoPoint;
  /** Prefer keeping this anchor when thinning. */
  priority: number;
  kind: 'start' | 'end' | 'stop' | 'interval' | 'speed_change';
};

export type CumulativePoint = {
  distanceFromStartM: number;
  offsetMin: number;
  coordinate: GeoPoint;
  headingDeg: number | null;
  expectedSpeedKmh: number;
  segmentIndex: number;
};

/** Build cumulative distance/time polyline from RouteAnalysis travel segments. */
export function buildCumulativePath(
  analysis: RouteAnalysis,
): CumulativePoint[] {
  const segs = analysis.travelSegments.filter((s) => s.durationMin > 0);
  if (segs.length === 0) {
    const pts = analysis.geometry.points ?? [];
    if (pts.length === 0) return [];
    const totalM = Math.max(0, analysis.distanceM);
    const totalMin = Math.max(1, analysis.durationMin);
    return pts.map((p, i) => {
      const frac = pts.length <= 1 ? 0 : i / (pts.length - 1);
      return {
        distanceFromStartM: totalM * frac,
        offsetMin: totalMin * frac,
        coordinate: p,
        headingDeg: null,
        expectedSpeedKmh: totalMin > 0 ? totalM / 1000 / (totalMin / 60) : 0,
        segmentIndex: Math.max(0, i - 1),
      };
    });
  }

  const out: CumulativePoint[] = [];
  let dist = 0;
  let time = 0;
  out.push({
    distanceFromStartM: 0,
    offsetMin: 0,
    coordinate: segs[0].start,
    headingDeg: segs[0].headingDeg ?? null,
    expectedSpeedKmh: segs[0].expectedSpeedKmh,
    segmentIndex: 0,
  });

  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const segDist =
      s.distanceM != null && Number.isFinite(s.distanceM)
        ? Math.max(0, s.distanceM)
        : haversineM(s.start, s.end);
    dist += segDist;
    time += Math.max(0, s.durationMin);
    out.push({
      distanceFromStartM: dist,
      offsetMin: time,
      coordinate: s.end,
      headingDeg: s.headingDeg ?? null,
      expectedSpeedKmh: s.expectedSpeedKmh,
      segmentIndex: i,
    });
  }

  const last = out[out.length - 1];
  if (
    last &&
    analysis.durationMin > 0 &&
    Math.abs(last.offsetMin - analysis.durationMin) > 0.05
  ) {
    const scale = analysis.durationMin / Math.max(1e-6, last.offsetMin);
    for (const p of out) {
      p.offsetMin = Math.round(p.offsetMin * scale * 10) / 10;
    }
    last.offsetMin = analysis.durationMin;
  }

  return out;
}

/** Interpolate coordinate / time / heading at a target distance along the path. */
export function interpolateAtDistance(
  path: CumulativePoint[],
  distanceM: number,
): {
  coordinate: GeoPoint;
  offsetMin: number;
  headingDeg: number | null;
  expectedSpeedKmh: number;
  timingSource: 'travel_segment' | 'linear_distance';
} | null {
  if (path.length === 0) return null;
  if (path.length === 1) {
    return {
      coordinate: path[0].coordinate,
      offsetMin: path[0].offsetMin,
      headingDeg: path[0].headingDeg,
      expectedSpeedKmh: path[0].expectedSpeedKmh,
      timingSource: 'travel_segment',
    };
  }

  const target = clamp(distanceM, 0, path[path.length - 1].distanceFromStartM);
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (target > b.distanceFromStartM + 1e-6) continue;
    const span = b.distanceFromStartM - a.distanceFromStartM;
    const t = span <= 1e-6 ? 0 : (target - a.distanceFromStartM) / span;
    return {
      coordinate: {
        lat: a.coordinate.lat + (b.coordinate.lat - a.coordinate.lat) * t,
        lon: a.coordinate.lon + (b.coordinate.lon - a.coordinate.lon) * t,
      },
      offsetMin: a.offsetMin + (b.offsetMin - a.offsetMin) * t,
      headingDeg: a.headingDeg ?? b.headingDeg ?? null,
      expectedSpeedKmh: a.expectedSpeedKmh,
      timingSource: 'travel_segment',
    };
  }
  const end = path[path.length - 1];
  return {
    coordinate: end.coordinate,
    offsetMin: end.offsetMin,
    headingDeg: end.headingDeg,
    expectedSpeedKmh: end.expectedSpeedKmh,
    timingSource: 'travel_segment',
  };
}

/** Deterministic bounded set of sample anchors along the route. */
export function selectSampleAnchors(
  analysis: RouteAnalysis,
  options?: Partial<typeof ROUTE_WEATHER_SAMPLING>,
): SampleAnchor[] {
  const cfg = { ...ROUTE_WEATHER_SAMPLING, ...options };
  const path = buildCumulativePath(analysis);
  if (path.length === 0) return [];

  const totalM = Math.max(
    path[path.length - 1].distanceFromStartM,
    analysis.distanceM,
    0,
  );
  const totalMin = Math.max(1, analysis.durationMin);
  const candidates: SampleAnchor[] = [];

  const push = (a: SampleAnchor) => {
    candidates.push({
      ...a,
      distanceFromStartM: clamp(a.distanceFromStartM, 0, totalM),
    });
  };

  push({
    distanceFromStartM: 0,
    coordinate: path[0].coordinate,
    priority: 100,
    kind: 'start',
  });

  const geo = analysis.geometry.points ?? [];
  if (geo.length > 2) {
    let walked = 0;
    for (let i = 1; i < geo.length - 1; i++) {
      walked += haversineM(geo[i - 1], geo[i]);
      push({
        distanceFromStartM: walked,
        coordinate: geo[i],
        priority: 80,
        kind: 'stop',
      });
    }
  }

  const segs = analysis.travelSegments;
  let cum = 0;
  for (let i = 0; i < segs.length; i++) {
    const dist =
      segs[i].distanceM != null && Number.isFinite(segs[i].distanceM)
        ? Math.max(0, segs[i].distanceM as number)
        : haversineM(segs[i].start, segs[i].end);
    cum += dist;
    if (i < segs.length - 1) {
      const a = segs[i].expectedSpeedKmh;
      const b = segs[i + 1].expectedSpeedKmh;
      const base = Math.max(1, Math.min(a, b));
      if (Math.abs(a - b) / base >= cfg.speedChangeRatio) {
        push({
          distanceFromStartM: cum,
          coordinate: segs[i].end,
          priority: 60,
          kind: 'speed_change',
        });
      }
    }
  }

  if (totalM > cfg.minSeparationM) {
    const steps = Math.max(1, Math.floor(totalM / cfg.targetIntervalM));
    for (let i = 1; i < steps; i++) {
      const d = (totalM * i) / steps;
      const interp = interpolateAtDistance(path, d);
      if (!interp) continue;
      push({
        distanceFromStartM: d,
        coordinate: interp.coordinate,
        priority: 40,
        kind: 'interval',
      });
    }
  }

  if (totalMin > cfg.targetIntervalMin) {
    const steps = Math.max(1, Math.floor(totalMin / cfg.targetIntervalMin));
    for (let i = 1; i < steps; i++) {
      const wantT = (totalMin * i) / steps;
      const d = distanceAtOffset(path, wantT);
      const interp = interpolateAtDistance(path, d);
      if (!interp) continue;
      push({
        distanceFromStartM: d,
        coordinate: interp.coordinate,
        priority: 35,
        kind: 'interval',
      });
    }
  }

  push({
    distanceFromStartM: totalM,
    coordinate: path[path.length - 1].coordinate,
    priority: 100,
    kind: 'end',
  });

  return thinAnchors(candidates, cfg.maxSamples, cfg.minSeparationM, totalM);
}

function distanceAtOffset(path: CumulativePoint[], offsetMin: number): number {
  if (path.length === 0) return 0;
  const t = clamp(offsetMin, 0, path[path.length - 1].offsetMin);
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (t > b.offsetMin + 1e-9) continue;
    const span = b.offsetMin - a.offsetMin;
    const u = span <= 1e-9 ? 0 : (t - a.offsetMin) / span;
    return (
      a.distanceFromStartM + (b.distanceFromStartM - a.distanceFromStartM) * u
    );
  }
  return path[path.length - 1].distanceFromStartM;
}

function thinAnchors(
  candidates: SampleAnchor[],
  maxSamples: number,
  minSeparationM: number,
  totalM: number,
): SampleAnchor[] {
  const sorted = [...candidates].sort(
    (a, b) => a.distanceFromStartM - b.distanceFromStartM,
  );

  const byPriority = [...sorted].sort((a, b) => b.priority - a.priority);
  const kept: SampleAnchor[] = [];

  for (const c of byPriority) {
    if (kept.length >= maxSamples) break;
    const tooClose = kept.some(
      (k) =>
        Math.abs(k.distanceFromStartM - c.distanceFromStartM) < minSeparationM,
    );
    if (tooClose && c.kind !== 'start' && c.kind !== 'end') continue;
    if (tooClose) {
      const idx = kept.findIndex(
        (k) =>
          Math.abs(k.distanceFromStartM - c.distanceFromStartM) <
          minSeparationM,
      );
      if (idx >= 0 && kept[idx].priority < c.priority) {
        kept[idx] = c;
      }
      continue;
    }
    kept.push(c);
  }

  const hasStart = kept.some((k) => k.distanceFromStartM <= 1e-3);
  const hasEnd = kept.some(
    (k) => Math.abs(k.distanceFromStartM - totalM) <= 1e-3,
  );
  if (!hasStart && sorted[0]) kept.push(sorted[0]);
  if (!hasEnd && sorted[sorted.length - 1]) {
    kept.push(sorted[sorted.length - 1]);
  }

  let result = kept
    .sort((a, b) => a.distanceFromStartM - b.distanceFromStartM)
    .filter((a, i, arr) => {
      if (i === 0) return true;
      return (
        a.distanceFromStartM - arr[i - 1].distanceFromStartM >=
        minSeparationM * 0.5
      );
    });

  if (result.length > maxSamples) {
    const start = result[0];
    const end = result[result.length - 1];
    const mid = result.slice(1, -1).sort((a, b) => b.priority - a.priority);
    const pick = mid.slice(0, maxSamples - 2);
    result = [start, ...pick, end].sort(
      (a, b) => a.distanceFromStartM - b.distanceFromStartM,
    );
  }

  return result;
}

function haversineM(a: GeoPoint, b: GeoPoint): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
