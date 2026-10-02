import { ALPINE_EXPOSURE } from './constants';
import {
  alpineExposureC,
  alpineWaterDemand,
  parseExposureMode,
} from './exposure';
import { isAlpineFamily, matchAlpineKit } from './kit';
import type {
  AlpinePipelineInput,
  AlpineReason,
  AlpineReasonCode,
  AlpineRecommendationResult,
  AlpineSample,
  AlpineWornFrom,
} from './types';

/**
 * Shared alpine exposure engine.
 * `alpine_skiing` and `snowboarding` stay distinct disciplines and use this
 * same function. Village weather is never copied onto the summit.
 */
export function runAlpineRecommendationPipeline(
  input: AlpinePipelineInput,
): AlpineRecommendationResult {
  const parsed = parseExposureMode(input.exposureMode);
  const samples = input.samples.filter((sample) =>
    sampleMatchesSite(sample, input.plan),
  );
  const baseSamples = samples.filter((sample) => sample.role === 'base');
  const upperSamples = samples.filter((sample) => sample.role === 'upper');
  const summitForecastUsed =
    input.plan.upperForecast === 'ready' && upperSamples.length > 0;
  const baseTempC = minAir(baseSamples);
  const midTempC = minAir(samples.filter((sample) => sample.role === 'mid'));
  const upperTempC = minAir(upperSamples);
  const upperWindMs = maxWind(upperSamples);
  const baseWindMs = maxWind(baseSamples);
  const baseExposure = meanExposure(baseSamples, parsed.mode);
  const upperExposure = meanExposure(upperSamples, parsed.mode);

  let wornFrom: AlpineWornFrom = 'unavailable';
  let wornExposureC: number | null = null;
  let wornWindMs = 0;

  if (parsed.mode === 'base') {
    wornFrom = 'base';
    wornExposureC = baseExposure;
    wornWindMs = baseWindMs ?? 0;
  } else if (upperExposure != null && baseExposure != null) {
    wornExposureC = Math.min(baseExposure, upperExposure);
    wornWindMs = upperWindMs ?? 0;
    wornFrom = upperExposure <= baseExposure ? 'upper' : 'colder_site';
  } else if (upperExposure != null) {
    wornFrom = 'upper';
    wornExposureC = upperExposure;
    wornWindMs = upperWindMs ?? 0;
  } else if (baseExposure != null) {
    wornFrom = 'base_only_not_summit';
    wornExposureC = baseExposure;
    wornWindMs = baseWindMs ?? 0;
  }

  const water = samples.reduce(
    (max, sample) => Math.max(max, alpineWaterDemand(sample.weather)),
    samples.length === 0 ? 0 : 1,
  );
  const spreadC =
    baseTempC != null && upperTempC != null
      ? round1(baseTempC - upperTempC)
      : null;
  const matched = matchAlpineKit({
    wornExposureC,
    wornWindMs,
    water,
    spreadC,
    wardrobe: input.wardrobe,
  });

  const alpineGarments = input.wardrobe.filter(
    (garment) =>
      isAlpineFamily(garment) &&
      garment.category !== 'one_piece_suit' &&
      garment.category !== 'heated_vest' &&
      garment.category !== 'boots',
  );
  const anyElevation = input.plan.sites.some((site) => site.elevationM != null);
  const elevation: AlpineRecommendationResult['elevation'] = !anyElevation
    ? 'unavailable'
    : summitForecastUsed
      ? 'used'
      : 'partial';

  const confidence = scoreConfidence({
    sampleCount: samples.length,
    summitForecastUsed,
    upperForecast: input.plan.upperForecast,
    alpineGarmentCount: alpineGarments.length,
    assumed: parsed.assumed,
    elevation,
  });

  const reasons = dedupe([
    ...contextReasons({
      wornFrom,
      plan: input.plan,
      parsed,
      elevation,
      summitForecastUsed,
      sampleCount: samples.length,
      upperWindMs,
      spreadC,
      alpineGarmentCount: alpineGarments.length,
      wardrobeCount: input.wardrobe.length,
    }),
    ...matched.reasons,
  ]);

  return {
    engine: 'alpine_v1',
    discipline: input.discipline,
    exposureMode: parsed.mode,
    exposureModeAssumed: parsed.assumed,
    elevation,
    exposure: {
      villageUsedAsSummit: false,
      wornFrom,
      wornExposureC,
      baseTempC,
      midTempC,
      upperTempC,
      maxWindMs: round1(
        Math.max(0, ...samples.map((sample) => sample.weather.windSpeedMs), 0),
      ),
      maxPrecipitationProbPct: Math.max(
        0,
        ...samples.map((sample) => sample.weather.precipitationProbPct),
      ),
      upperWindMs,
      sites: input.plan.sites,
      samples: samples.map((sample) => ({
        role: sample.role,
        phase: sample.phase,
        estimated: sample.estimated,
        lat: sample.weather.lat,
        lon: sample.weather.lon,
        airTempC: sample.weather.airTempC,
        windSpeedMs: sample.weather.windSpeedMs,
        groundElevationM: sample.weather.groundElevationM ?? null,
        exposureC: alpineExposureC(sample.weather, parsed.mode),
      })),
    },
    wear: matched.wear,
    pack: matched.pack,
    reasons,
    confidence,
    personalization: {
      voice: 'baseline',
      sampleCount: 0,
      canClaimPersonal: false,
      personalColdBiasC: 0,
    },
  };
}

/**
 * Drop a sample that does not sit on its own site. This is what stops a base
 * forecast from being labeled as the summit.
 */
function sampleMatchesSite(
  sample: AlpineSample,
  plan: AlpinePipelineInput['plan'],
): boolean {
  const site = plan.sites.find((item) => item.role === sample.role);
  if (!site || site.elevationM == null) return false;
  if (sample.weather.groundElevationM == null) return false;
  if (sample.weather.groundElevationM !== site.elevationM) return false;
  return (
    nearly(sample.weather.lat, site.lat) && nearly(sample.weather.lon, site.lon)
  );
}

function contextReasons(input: {
  wornFrom: AlpineWornFrom;
  plan: AlpinePipelineInput['plan'];
  parsed: { assumed: boolean };
  elevation: AlpineRecommendationResult['elevation'];
  summitForecastUsed: boolean;
  sampleCount: number;
  upperWindMs: number | null;
  spreadC: number | null;
  alpineGarmentCount: number;
  wardrobeCount: number;
}): AlpineReason[] {
  const reasons: AlpineReason[] = [
    { code: 'BASELINE_NO_PERSONAL_EVIDENCE' },
    { code: 'BOOTS_ARE_EQUIPMENT' },
    { code: 'GOGGLES_ARE_EQUIPMENT' },
    { code: 'HELMET_IS_EQUIPMENT' },
  ];
  if (input.sampleCount === 0) reasons.push({ code: 'INCOMPLETE_WEATHER' });
  if (input.plan.upperForecast === 'missing') {
    reasons.push({ code: 'UPPER_SITE_MISSING' });
  }
  if (input.plan.upperForecast === 'elevation_unavailable') {
    reasons.push({ code: 'UPPER_ELEVATION_UNAVAILABLE' });
  }
  if (!input.summitForecastUsed) {
    reasons.push({ code: 'VILLAGE_WEATHER_NOT_USED_AS_SUMMIT' });
  }
  if (input.plan.sitesNeedLabels) reasons.push({ code: 'SITES_NEED_LABELS' });
  if (input.plan.sites.some((site) => site.estimated)) {
    reasons.push({ code: 'MID_ELEVATION_ESTIMATED' });
  }
  if (input.wornFrom === 'upper' || input.wornFrom === 'colder_site') {
    reasons.push({ code: 'UPPER_MOUNTAIN_SETS_KIT' });
  }
  if (input.wornFrom === 'base') reasons.push({ code: 'STAYING_AT_BASE' });
  if (input.upperWindMs != null && input.upperWindMs >= 10) {
    reasons.push({ code: 'HIGH_WIND_AT_UPPER' });
  }
  if (
    input.spreadC != null &&
    input.spreadC >= ALPINE_EXPOSURE.temperatureSpreadC
  ) {
    reasons.push({ code: 'TEMPERATURE_SPREAD' });
  }
  if (input.parsed.assumed) reasons.push({ code: 'ASSUMED_EXPOSURE_MODE' });
  if (input.elevation === 'used') reasons.push({ code: 'ELEVATION_USED' });
  if (input.elevation === 'partial')
    reasons.push({ code: 'ELEVATION_PARTIAL' });
  if (input.elevation === 'unavailable') {
    reasons.push({ code: 'ELEVATION_UNAVAILABLE' });
  }
  if (input.alpineGarmentCount === 0) {
    reasons.push({
      code: 'GENERIC_ALPINE_KIT',
      params: { wardrobeCount: input.wardrobeCount },
    });
  }
  return reasons;
}

function scoreConfidence(input: {
  sampleCount: number;
  summitForecastUsed: boolean;
  upperForecast: AlpinePipelineInput['plan']['upperForecast'];
  alpineGarmentCount: number;
  assumed: boolean;
  elevation: AlpineRecommendationResult['elevation'];
}): AlpineRecommendationResult['confidence'] {
  const reasons: AlpineReasonCode[] = [];
  let level: AlpineRecommendationResult['confidence']['level'] = 'HIGH';
  if (input.sampleCount === 0 || !input.summitForecastUsed) {
    level = 'LOW';
    reasons.push(
      input.sampleCount === 0
        ? 'INCOMPLETE_WEATHER'
        : input.upperForecast === 'elevation_unavailable'
          ? 'UPPER_ELEVATION_UNAVAILABLE'
          : 'VILLAGE_WEATHER_NOT_USED_AS_SUMMIT',
    );
  } else if (input.alpineGarmentCount === 0) {
    level = 'MEDIUM';
    reasons.push('GENERIC_ALPINE_KIT');
  }
  if (input.assumed && level === 'HIGH') {
    level = 'MEDIUM';
    reasons.push('ASSUMED_EXPOSURE_MODE');
  }
  if (input.elevation === 'unavailable') reasons.push('ELEVATION_UNAVAILABLE');
  return { level, reasons };
}

function meanExposure(
  samples: AlpineSample[],
  mode: ReturnType<typeof parseExposureMode>['mode'],
): number | null {
  if (samples.length === 0) return null;
  const total = samples.reduce(
    (sum, sample) => sum + alpineExposureC(sample.weather, mode),
    0,
  );
  return round1(total / samples.length);
}

function minAir(samples: AlpineSample[]): number | null {
  if (samples.length === 0) return null;
  return Math.min(...samples.map((sample) => sample.weather.airTempC));
}

function maxWind(samples: AlpineSample[]): number | null {
  if (samples.length === 0) return null;
  return Math.max(...samples.map((sample) => sample.weather.windSpeedMs));
}

function nearly(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.000001;
}

function dedupe(reasons: AlpineReason[]): AlpineReason[] {
  const seen = new Set<string>();
  const out: AlpineReason[] = [];
  for (const reason of reasons) {
    const key = `${reason.code}:${JSON.stringify(reason.params ?? {})}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(reason);
  }
  return out;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
