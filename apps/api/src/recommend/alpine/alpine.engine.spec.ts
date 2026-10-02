import { alpineExposureC } from './exposure';
import { runAlpineRecommendationPipeline } from './pipeline';
import { planAlpineWeatherSamples } from './samples';
import { resolveAlpineSites } from './sites';
import type { AlpineGarmentInput, AlpinePipelineInput } from './types';

const departAt = new Date('2026-10-02T09:00:00.000Z');

function garment(
  partial: Partial<AlpineGarmentInput> &
    Pick<AlpineGarmentInput, 'id' | 'name' | 'category'>,
): AlpineGarmentInput {
  return {
    layer: 'outer',
    primaryBodyZone: 'torso',
    warmthTier: 3,
    windResistTier: 3,
    waterResistTier: 3,
    breathabilityTier: 3,
    material: null,
    hasVentilation: false,
    isHeated: false,
    activityTags: ['alpine_skiing'],
    components: [],
    ...partial,
  };
}

function forecast(
  pins: Array<{
    lat: number;
    lon: number;
    label?: string;
    elevationM?: number | null;
  }>,
  weatherByAltitude: Record<number, { airTempC: number; windSpeedMs: number }>,
  durationMin = 60,
) {
  const plan = resolveAlpineSites(pins);
  const requests = planAlpineWeatherSamples({
    sites: plan.sites,
    departAt,
    durationMin,
  });
  const samples = requests.map((request) => {
    const weather = weatherByAltitude[request.altitudeM] ?? {
      airTempC: 0,
      windSpeedMs: 0,
    };
    return {
      role: request.role,
      phase: request.phase,
      estimated: request.estimated,
      weather: {
        lat: request.lat,
        lon: request.lon,
        airTempC: weather.airTempC,
        windSpeedMs: weather.windSpeedMs,
        precipitationProbPct: 10,
        precipitationMm: 0,
        groundElevationM: request.altitudeM,
      },
    };
  });
  return { plan, requests, samples };
}

describe('alpine site and weather plan', () => {
  const baseAndUpper = [
    { lat: 61, lon: 8, label: 'Base', elevationM: 1000 },
    { lat: 61.2, lon: 8.2, label: 'Summit', elevationM: 1800 },
  ];

  it('estimates mid elevation between base and upper and keeps each height', () => {
    const { plan, requests } = forecast(baseAndUpper, {
      1000: { airTempC: 4, windSpeedMs: 1 },
      1400: { airTempC: -1, windSpeedMs: 6 },
      1800: { airTempC: -8, windSpeedMs: 12 },
    });
    const mid = plan.sites.find((site) => site.role === 'mid');
    const upper = requests.filter((request) => request.role === 'upper');
    const base = requests.filter((request) => request.role === 'base');

    expect(mid).toMatchObject({
      estimated: true,
      source: 'midpoint_estimate',
      elevationM: 1400,
    });
    expect(mid?.lat).toBeGreaterThan(61);
    expect(mid?.lat).toBeLessThan(61.2);
    expect(base.map((request) => request.altitudeM)).toEqual([1000]);
    expect(upper.map((request) => request.altitudeM)).toEqual([1800]);
    expect(upper[0]?.lat).toBe(61.2);
    expect(requests.find((request) => request.role === 'mid')?.altitudeM).toBe(
      1400,
    );
    expect(upper.some((request) => request.altitudeM === 1000)).toBe(false);
  });

  it('orders unlabeled pins by elevation and does not invent a summit from equal heights', () => {
    const ordered = resolveAlpineSites([
      { lat: 61.2, lon: 8.2, elevationM: 1800 },
      { lat: 61, lon: 8, elevationM: 1000 },
    ]);
    expect(ordered.sites.find((site) => site.role === 'base')).toMatchObject({
      lat: 61,
      elevationM: 1000,
    });
    expect(ordered.sites.find((site) => site.role === 'upper')).toMatchObject({
      lat: 61.2,
      elevationM: 1800,
    });

    const flat = resolveAlpineSites([
      { lat: 61, lon: 8, elevationM: 500 },
      { lat: 61.1, lon: 8.1, elevationM: 500 },
    ]);
    expect(flat.sites.some((site) => site.role === 'upper')).toBe(false);
    expect(flat.sitesNeedLabels).toBe(true);
    expect(flat.upperForecast).toBe('missing');
  });

  it('uses a third measured height as mid instead of an estimate', () => {
    const plan = resolveAlpineSites([
      { lat: 1, lon: 1, elevationM: 1000 },
      { lat: 2, lon: 2, elevationM: 1500 },
      { lat: 3, lon: 3, elevationM: 1800 },
    ]);
    expect(plan.sites.find((site) => site.role === 'mid')).toMatchObject({
      lat: 2,
      elevationM: 1500,
      estimated: false,
      source: 'elevation_order',
    });
  });

  it('does not treat a village pin as the summit', () => {
    const plan = resolveAlpineSites([
      { lat: 61, lon: 8, label: 'Village', elevationM: 400 },
    ]);
    expect(plan.sites.map((site) => site.role)).toEqual(['base']);
    expect(plan.upperForecast).toBe('missing');
    const requests = planAlpineWeatherSamples({
      sites: plan.sites,
      departAt,
      durationMin: 60,
    });
    expect(requests.map((request) => request.role)).toEqual(['base']);
    expect(requests.map((request) => request.altitudeM)).toEqual([400]);
  });

  it('does not request summit weather when the upper elevation is missing', () => {
    const plan = resolveAlpineSites([
      { lat: 61, lon: 8, label: 'Base', elevationM: 400 },
      { lat: 61.2, lon: 8.2, label: 'Summit', elevationM: null },
    ]);
    expect(plan.upperForecast).toBe('elevation_unavailable');
    const requests = planAlpineWeatherSamples({
      sites: plan.sites,
      departAt,
      durationMin: 240,
    });
    expect(requests.every((request) => request.role === 'base')).toBe(true);
    expect(requests.every((request) => request.lat === 61)).toBe(true);
    expect(requests.map((request) => request.altitudeM)).toEqual([
      400, 400, 400,
    ]);
    expect(requests.map((request) => request.phase)).toEqual([
      'start',
      'middle',
      'end',
    ]);
  });
});

describe('alpine exposure engine', () => {
  const pins = [
    { lat: 61, lon: 8, label: 'Base', elevationM: 1000 },
    { lat: 61.2, lon: 8.2, label: 'Summit', elevationM: 1800 },
  ];
  const weather = {
    1000: { airTempC: 4, windSpeedMs: 1 },
    1400: { airTempC: -1, windSpeedMs: 6 },
    1800: { airTempC: -3, windSpeedMs: 4 },
  };

  function run(
    discipline: AlpinePipelineInput['discipline'],
    exposureMode: string | null,
    wardrobe: AlpineGarmentInput[] = [],
  ) {
    const { plan, samples } = forecast(pins, weather);
    return runAlpineRecommendationPipeline({
      discipline,
      exposureMode,
      durationMin: 60,
      plan,
      samples,
      wardrobe,
    });
  }

  it('sets the worn kit from the colder upper mountain, not the village', () => {
    const result = run('alpine_skiing', 'lift');
    const upper = result.exposure.samples.find(
      (sample) => sample.role === 'upper',
    );
    const base = result.exposure.samples.find(
      (sample) => sample.role === 'base',
    );

    expect(result.exposure.villageUsedAsSummit).toBe(false);
    expect(result.exposure.baseTempC).toBe(4);
    expect(result.exposure.upperTempC).toBe(-3);
    expect(result.exposure.midTempC).toBe(-1);
    expect(result.exposure.wornFrom).toBe('upper');
    expect(result.exposure.wornExposureC).toBe(upper?.exposureC);
    expect(result.exposure.wornExposureC).not.toBe(base?.exposureC);
    expect(result.exposure.wornExposureC).toBeLessThan(base?.exposureC ?? 0);
    expect(result.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining([
        'UPPER_MOUNTAIN_SETS_KIT',
        'MID_ELEVATION_ESTIMATED',
        'TEMPERATURE_SPREAD',
        'ELEVATION_USED',
      ]),
    );
    expect(result.personalization).toMatchObject({
      canClaimPersonal: false,
      personalColdBiasC: 0,
      sampleCount: 0,
    });
    expect(JSON.stringify(result)).not.toContain('motorcycle');
  });

  it('keeps skiing and snowboarding on one engine with distinct disciplines', () => {
    const skiing = run('alpine_skiing', 'lift');
    const snowboard = run('snowboarding', 'lift');
    expect(skiing.engine).toBe('alpine_v1');
    expect(snowboard.engine).toBe('alpine_v1');
    expect(skiing.discipline).toBe('alpine_skiing');
    expect(snowboard.discipline).toBe('snowboarding');
    expect(snowboard.exposure.wornExposureC).toBe(
      skiing.exposure.wornExposureC,
    );
    expect(snowboard.wear.map((item) => item.slot)).toEqual(
      skiing.wear.map((item) => item.slot),
    );
  });

  it('wears for the base when asked and still reports the summit separately', () => {
    const result = run('snowboarding', 'base');
    expect(result.exposure.wornFrom).toBe('base');
    expect(result.exposure.upperTempC).toBe(-3);
    expect(result.exposure.wornExposureC).toBeGreaterThan(
      result.exposure.samples.find((sample) => sample.role === 'upper')
        ?.exposureC ?? 0,
    );
    expect(result.reasons.map((reason) => reason.code)).toContain(
      'STAYING_AT_BASE',
    );
    expect(result.exposure.villageUsedAsSummit).toBe(false);
  });

  it('adds hike wind without using travel speed', () => {
    const lift = run('alpine_skiing', 'lift');
    const hike = run('alpine_skiing', 'hike');
    const upperWeather = {
      lat: 61.2,
      lon: 8.2,
      airTempC: -3,
      windSpeedMs: 4,
      precipitationProbPct: 10,
      precipitationMm: 0,
      groundElevationM: 1800,
    };
    expect(hike.exposure.wornExposureC).toBeLessThan(
      lift.exposure.wornExposureC ?? 0,
    );
    expect(
      hike.exposure.samples.find((sample) => sample.role === 'upper')
        ?.exposureC,
    ).toBe(alpineExposureC(upperWeather, 'hike'));
    expect(
      lift.exposure.samples.find((sample) => sample.role === 'upper')
        ?.exposureC,
    ).toBe(alpineExposureC(upperWeather, 'lift'));
  });

  it('shares alpine garments across disciplines and leaves boots and spare warmth off the hill', () => {
    const wardrobe = [
      garment({
        id: 'moto',
        name: 'Motorcycle jacket',
        category: 'shell_jacket',
        activityTags: ['motorcycle'],
      }),
      garment({
        id: 'shell',
        name: 'Ski shell',
        category: 'shell_jacket',
        activityTags: ['alpine_skiing'],
        windResistTier: 4,
        waterResistTier: 4,
      }),
      garment({
        id: 'boots',
        name: 'Ski boots',
        category: 'boots',
        activityTags: ['alpine_skiing'],
        primaryBodyZone: 'feet',
      }),
      garment({
        id: 'socks',
        name: 'Ski socks',
        category: 'socks',
        activityTags: ['snowboarding'],
        primaryBodyZone: 'feet',
        layer: 'base',
      }),
      garment({
        id: 'mid',
        name: 'Light fleece',
        category: 'mid_layer',
        warmthTier: 3,
        layer: 'mid',
      }),
      garment({
        id: 'spare',
        name: 'Spare parka',
        category: 'mid_layer',
        warmthTier: 5,
        layer: 'mid',
      }),
    ];
    const result = run('snowboarding', 'lift', wardrobe);
    const names = [...result.wear, ...result.pack].map(
      (item) => item.garmentName,
    );
    expect(names).toContain('Ski shell');
    expect(names).toContain('Ski socks');
    expect(names).toContain('Light fleece');
    expect(names).not.toContain('Motorcycle jacket');
    expect(names).not.toContain('Ski boots');
    expect(names).not.toContain('Spare parka');
    expect(result.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining([
        'LEAVE_WARMER_LAYER_OFF_HILL',
        'BOOTS_ARE_EQUIPMENT',
        'GOGGLES_ARE_EQUIPMENT',
        'HELMET_IS_EQUIPMENT',
      ]),
    );
    expect(result.confidence.level).toBe('HIGH');
  });

  it('drops a summit sample that was stamped with the village elevation', () => {
    const { plan, samples } = forecast(pins, weather);
    const base = samples.find((sample) => sample.role === 'base');
    const upperSite = plan.sites.find((site) => site.role === 'upper');
    expect(base).toBeDefined();
    expect(upperSite).toBeDefined();
    const swapped = runAlpineRecommendationPipeline({
      discipline: 'alpine_skiing',
      exposureMode: 'lift',
      durationMin: 60,
      plan,
      wardrobe: [],
      samples: [
        base!,
        {
          role: 'upper',
          phase: 'start',
          estimated: false,
          weather: {
            ...base!.weather,
            lat: upperSite!.lat,
            lon: upperSite!.lon,
          },
        },
      ],
    });
    expect(
      swapped.exposure.samples.some((sample) => sample.role === 'upper'),
    ).toBe(false);
    expect(swapped.exposure.upperTempC).toBeNull();
    expect(swapped.exposure.villageUsedAsSummit).toBe(false);
    expect(swapped.exposure.wornFrom).toBe('base_only_not_summit');
    expect(swapped.reasons.map((reason) => reason.code)).toContain(
      'VILLAGE_WEATHER_NOT_USED_AS_SUMMIT',
    );
  });

  it('uses a generic alpine kit when the wardrobe has no alpine garments', () => {
    const result = run('alpine_skiing', 'lift', [
      garment({
        id: 'moto',
        name: 'Textile jacket',
        category: 'shell_jacket',
        activityTags: ['motorcycle'],
      }),
    ]);
    expect(result.wear.every((item) => item.source === 'generic')).toBe(true);
    expect(result.reasons.map((reason) => reason.code)).toContain(
      'GENERIC_ALPINE_KIT',
    );
    expect(result.confidence.level).toBe('MEDIUM');
  });
});
