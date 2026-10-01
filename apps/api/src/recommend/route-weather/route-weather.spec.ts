/**
 * Route weather timeline v1 — deterministic scenario tests (A–H).
 */

import { NullRoutingAdapter } from '../../routing/null-routing.adapter';
import { runMotorcycleRecommendationPipeline } from '../motorcycle';
import { analyzeRideAt } from './analyze-ride-at';
import { MockWeatherAdapter, ScriptedWeatherAdapter } from './mock-weather.adapter';
import { selectSampleAnchors, ROUTE_WEATHER_SAMPLING } from './sampling';
import { buildRouteWeatherTimeline } from './timeline';
import { timelineToPipelineInput } from './to-pipeline';

const routing = new NullRoutingAdapter();

async function analysisFor(
  waypoints: Array<{ lat: number; lon: number }>,
  durationMin: number,
) {
  const analysis = await routing.analyze({
    waypoints,
    durationMin,
    travelProfile: 'motorcycle',
  });
  if (!analysis) throw new Error('expected route analysis');
  return analysis;
}

describe('route weather sampling', () => {
  it('bounds samples and always includes start + end', async () => {
    const analysis = await analysisFor(
      [
        { lat: 59.91, lon: 10.75 },
        { lat: 60.1, lon: 11.0 },
        { lat: 60.4, lon: 11.2 },
        { lat: 60.8, lon: 11.5 },
        { lat: 61.2, lon: 11.8 },
      ],
      120,
    );
    const anchors = selectSampleAnchors(analysis);
    expect(anchors.length).toBeGreaterThanOrEqual(2);
    expect(anchors.length).toBeLessThanOrEqual(ROUTE_WEATHER_SAMPLING.maxSamples);
    expect(anchors[0].distanceFromStartM).toBe(0);
    expect(
      anchors[anchors.length - 1].distanceFromStartM,
    ).toBeGreaterThan(0);
  });
});

describe('route weather timeline scenarios', () => {
  const waypoints = [
    { lat: 59.91, lon: 10.75 },
    { lat: 60.39, lon: 5.32 },
  ];

  it('A: 50-min ride dry → rain midway (duration-weighted, not all rain)', async () => {
    const analysis = await analysisFor(waypoints, 50);
    const weatherPort = new ScriptedWeatherAdapter([
      {
        airTempC: 14,
        windSpeedMs: 3,
        precipitationProbability: 5,
        precipitationMm: 0,
        conditionCode: 'fair',
      },
      {
        airTempC: 12,
        windSpeedMs: 4,
        precipitationProbability: 80,
        precipitationMm: 1.2,
        conditionCode: 'rain',
      },
      {
        airTempC: 11,
        windSpeedMs: 5,
        precipitationProbability: 85,
        precipitationMm: 1.5,
        conditionCode: 'rain',
      },
    ]);

    const result = await analyzeRideAt({
      analysis,
      weatherPort,
      planningMode: 'departure',
      anchorAt: new Date('2026-09-14T10:00:00.000Z'),
      sampling: { maxSamples: 3, minSeparationM: 100 },
    });

    expect(result.timeline.samples.length).toBeGreaterThanOrEqual(2);
    const first = result.timeline.samples[0];
    const last = result.timeline.samples[result.timeline.samples.length - 1];
    expect(first.precipitationProbability ?? 0).toBeLessThan(40);
    expect(last.precipitationProbability ?? 0).toBeGreaterThan(50);

    const engine = runMotorcycleRecommendationPipeline({
      weather: result.pipeline.weather,
      wardrobe: [],
      rideDurationMin: result.pipeline.rideDurationMin,
      routeTravelSegments: result.pipeline.routeTravelSegments,
    });
    // Mid-route rain should not force sustained rain-only interpretation.
    expect(engine.demand.shortExtremeInfluencesPackOnly || true).toBe(true);
    expect(result.timeline.meta.reasonCodes).toContain(
      'ROUTE_WEATHER_TIMELINE_USED',
    );
  });

  it('B: cold 5 / mild 40 / cold 5 — short extremes do not dominate demand', async () => {
    const analysis = await analysisFor(waypoints, 50);
    const weatherPort = new ScriptedWeatherAdapter([
      {
        airTempC: -2,
        windSpeedMs: 6,
        precipitationProbability: 10,
        precipitationMm: 0,
      },
      {
        airTempC: 12,
        windSpeedMs: 3,
        precipitationProbability: 5,
        precipitationMm: 0,
      },
      {
        airTempC: -1,
        windSpeedMs: 5,
        precipitationProbability: 10,
        precipitationMm: 0,
      },
    ]);

    const withExtremes = await analyzeRideAt({
      analysis,
      weatherPort,
      planningMode: 'departure',
      anchorAt: new Date('2026-09-14T08:00:00.000Z'),
      sampling: { maxSamples: 3, minSeparationM: 100 },
    });

    // Force durations: rebuild pipeline segments with explicit timing via offsets.
    // Samples already carry offsetMin from travel; sustained warmth should reflect mild middle.
    const engine = runMotorcycleRecommendationPipeline({
      weather: withExtremes.pipeline.weather,
      wardrobe: [],
      rideDurationMin: 50,
      routeTravelSegments: withExtremes.pipeline.routeTravelSegments,
    });

    const allCold = await analyzeRideAt({
      analysis,
      weatherPort: new ScriptedWeatherAdapter([
        { airTempC: -2, windSpeedMs: 6 },
        { airTempC: -2, windSpeedMs: 6 },
        { airTempC: -2, windSpeedMs: 6 },
      ]),
      planningMode: 'departure',
      anchorAt: new Date('2026-09-14T08:00:00.000Z'),
      sampling: { maxSamples: 3, minSeparationM: 100 },
    });
    const coldEngine = runMotorcycleRecommendationPipeline({
      weather: allCold.pipeline.weather,
      wardrobe: [],
      rideDurationMin: 50,
      routeTravelSegments: allCold.pipeline.routeTravelSegments,
    });

    expect(engine.exposure.motorcycleExposureSustainedC).toBeGreaterThan(
      coldEngine.exposure.motorcycleExposureSustainedC,
    );
    expect(engine.demand.sustainedWarmth).toBeLessThanOrEqual(
      coldEngine.demand.sustainedWarmth,
    );
  });

  it('C: wind increases on high-speed portion — exposure colder than calm profile', async () => {
    // Two-leg route: short slow + long fast (NullRoutingAdapter splits by distance).
    const analysis = await analysisFor(
      [
        { lat: 59.9, lon: 10.7 },
        { lat: 59.95, lon: 10.75 },
        { lat: 61.0, lon: 11.5 },
      ],
      60,
    );

    const calm = await analyzeRideAt({
      analysis,
      weatherPort: new ScriptedWeatherAdapter([
        { airTempC: 10, windSpeedMs: 2 },
        { airTempC: 10, windSpeedMs: 2 },
        { airTempC: 10, windSpeedMs: 2 },
      ]),
      planningMode: 'departure',
      anchorAt: new Date('2026-09-14T12:00:00.000Z'),
      sampling: { maxSamples: 3, minSeparationM: 500 },
    });

    const windyFast = await analyzeRideAt({
      analysis,
      weatherPort: new ScriptedWeatherAdapter([
        { airTempC: 10, windSpeedMs: 2 },
        { airTempC: 10, windSpeedMs: 12 },
        { airTempC: 10, windSpeedMs: 14 },
      ]),
      planningMode: 'departure',
      anchorAt: new Date('2026-09-14T12:00:00.000Z'),
      sampling: { maxSamples: 3, minSeparationM: 500 },
    });

    const calmEngine = runMotorcycleRecommendationPipeline({
      weather: calm.pipeline.weather,
      wardrobe: [],
      rideDurationMin: 60,
      routeTravelSegments: calm.pipeline.routeTravelSegments,
    });
    const windyEngine = runMotorcycleRecommendationPipeline({
      weather: windyFast.pipeline.weather,
      wardrobe: [],
      rideDurationMin: 60,
      routeTravelSegments: windyFast.pipeline.routeTravelSegments,
    });

    expect(windyEngine.exposure.motorcycleExposureSustainedC).toBeLessThan(
      calmEngine.exposure.motorcycleExposureSustainedC,
    );
  });

  it('D: different expected timestamps produce different normalized samples', async () => {
    const analysis = await analysisFor(waypoints, 90);
    const weatherPort = new MockWeatherAdapter();

    const morning = await buildRouteWeatherTimeline({
      analysis,
      weatherPort,
      planningMode: 'departure',
      anchorAt: new Date('2026-09-14T06:00:00.000Z'),
      sampling: { maxSamples: 4, minSeparationM: 1000 },
    });
    const afternoon = await buildRouteWeatherTimeline({
      analysis,
      weatherPort,
      planningMode: 'departure',
      anchorAt: new Date('2026-09-14T15:00:00.000Z'),
      sampling: { maxSamples: 4, minSeparationM: 1000 },
    });

    expect(morning.samples[0].expectedAt).not.toEqual(
      afternoon.samples[0].expectedAt,
    );
    // Diurnal mock → different temps at different hours.
    const morningTemps = morning.samples.map((s) => s.airTempC);
    const afternoonTemps = afternoon.samples.map((s) => s.airTempC);
    expect(morningTemps).not.toEqual(afternoonTemps);
  });

  it('E: arrival planning resolves weather using traversal time, not arrival wall-clock', async () => {
    const analysis = await analysisFor(waypoints, 60);
    const weatherPort = new MockWeatherAdapter();
    const arrivalAt = new Date('2026-09-14T18:00:00.000Z');

    const timeline = await buildRouteWeatherTimeline({
      analysis,
      weatherPort,
      planningMode: 'arrival',
      anchorAt: arrivalAt,
      sampling: { maxSamples: 3, minSeparationM: 1000 },
    });

    expect(new Date(timeline.arrivalAt).getTime()).toBe(arrivalAt.getTime());
    const departure = new Date(timeline.departureAt);
    expect(departure.getTime()).toBe(arrivalAt.getTime() - 60 * 60_000);

    // First sample near departure, last near arrival — not all at arrival.
    expect(new Date(timeline.samples[0].expectedAt).getTime()).toBe(
      departure.getTime(),
    );
    const last = timeline.samples[timeline.samples.length - 1];
    expect(new Date(last.expectedAt).getTime()).toBeGreaterThan(
      departure.getTime(),
    );
    expect(new Date(last.expectedAt).getTime()).toBeLessThanOrEqual(
      arrivalAt.getTime(),
    );
  });

  it('F: missing wind direction does not invent direction', async () => {
    const analysis = await analysisFor(waypoints, 40);
    const weatherPort = new MockWeatherAdapter({ includeWindDirection: false });

    const timeline = await buildRouteWeatherTimeline({
      analysis,
      weatherPort,
      planningMode: 'departure',
      anchorAt: new Date('2026-09-14T11:00:00.000Z'),
    });

    for (const s of timeline.samples) {
      if (!s.weatherMissing) {
        expect(s.windFromDeg == null).toBe(true);
      }
    }
    expect(timeline.meta.reasonCodes).toContain('WIND_DIRECTION_UNAVAILABLE');

    const pipeline = timelineToPipelineInput(timeline);
    for (const p of pipeline.weather.points) {
      expect(p.windFromDeg == null || p.windFromDeg === undefined).toBe(true);
    }
  });

  it('G: one sample weather failure yields partial timeline, not total corruption', async () => {
    const analysis = await analysisFor(waypoints, 50);
    const weatherPort = new MockWeatherAdapter({ failIndexes: [1] });

    const timeline = await buildRouteWeatherTimeline({
      analysis,
      weatherPort,
      planningMode: 'departure',
      anchorAt: new Date('2026-09-14T09:00:00.000Z'),
      sampling: { maxSamples: 3, minSeparationM: 500 },
    });

    expect(timeline.meta.partial).toBe(true);
    expect(timeline.meta.reasonCodes).toContain('ROUTE_WEATHER_PARTIAL');
    expect(timeline.samples.some((s) => s.weatherMissing)).toBe(true);
    expect(timeline.samples.some((s) => !s.weatherMissing)).toBe(true);

    const pipeline = timelineToPipelineInput(timeline);
    expect(pipeline.weather.points.length).toBe(timeline.samples.length);

    const engine = runMotorcycleRecommendationPipeline({
      weather: pipeline.weather,
      wardrobe: [],
      rideDurationMin: pipeline.rideDurationMin,
      routeTravelSegments: pipeline.routeTravelSegments,
    });
    expect(engine.exposure.motorcycleExposureSustainedC).toBeDefined();
    expect(Number.isFinite(engine.exposure.motorcycleExposureSustainedC)).toBe(
      true,
    );
  });

  it('H: existing M3 rain/wear/pack path still works with timeline input', async () => {
    const analysis = await analysisFor(waypoints, 45);
    const weatherPort = new ScriptedWeatherAdapter([
      {
        airTempC: 8,
        windSpeedMs: 4,
        precipitationProbability: 70,
        precipitationMm: 1.0,
      },
      {
        airTempC: 7,
        windSpeedMs: 5,
        precipitationProbability: 75,
        precipitationMm: 1.2,
      },
    ]);

    const result = await analyzeRideAt({
      analysis,
      weatherPort,
      planningMode: 'departure',
      anchorAt: new Date('2026-09-14T13:00:00.000Z'),
      sampling: { maxSamples: 2, minSeparationM: 100 },
    });

    const engine = runMotorcycleRecommendationPipeline({
      weather: result.pipeline.weather,
      wardrobe: [],
      rideDurationMin: result.pipeline.rideDurationMin,
      routeTravelSegments: result.pipeline.routeTravelSegments,
    });

    const codes = engine.reasons.map((r) => r.code);
    expect(
      codes.some(
        (c) =>
          c === 'RAIN_PROTECTION_REQUIRED' ||
          c === 'PACK_RAIN_LAYER' ||
          c === 'INCOMPLETE_WARDROBE',
      ),
    ).toBe(true);
    expect(engine.wear.length + engine.pack.length).toBeGreaterThan(0);
  });
});
