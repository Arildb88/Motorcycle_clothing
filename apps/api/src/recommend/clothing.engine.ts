export type WeatherPoint = {
  lat: number;
  lon: number;
  airTempC: number;
  precipitationProbPct: number;
  precipitationMm: number;
  windSpeedMs: number;
  symbol?: string;
};

export type RouteWeatherSummary = {
  provider: string;
  sampledAt: string;
  points: WeatherPoint[];
  minTempC: number;
  maxTempC: number;
  maxRainProbPct: number;
  maxPrecipMm: number;
  maxWindMs: number;
};

export type ComfortInput = {
  glovesBelowC: number;
  extraJacketLayerBelowC: number;
  extraPantsLayerBelowC: number;
  woolBaseBelowC: number;
  rainProbThreshold: number;
  windChillSensitivity: string;
  personalColdBiasC: number;
};

export type ClothingRecommendation = {
  effectiveTempC: number;
  gloves: boolean;
  extraJacketLayer: boolean;
  extraPantsLayer: boolean;
  woolBase: boolean;
  rainGear: boolean;
  reasons: string[];
  items: string[];
};

function windPenalty(windMs: number, sensitivity: string): number {
  const factor = sensitivity === 'high' ? 1.2 : sensitivity === 'low' ? 0.6 : 0.9;
  // Rough chill: ~0.5°C per m/s above 3
  return Math.max(0, (windMs - 3) * 0.5 * factor);
}

export function recommendClothing(
  weather: RouteWeatherSummary,
  comfort: ComfortInput,
): ClothingRecommendation {
  const wind = weather.maxWindMs;
  const penalty = windPenalty(wind, comfort.windChillSensitivity);
  const effectiveTempC =
    weather.minTempC - penalty - comfort.personalColdBiasC;

  const gloves = effectiveTempC <= comfort.glovesBelowC;
  const extraJacketLayer = effectiveTempC <= comfort.extraJacketLayerBelowC;
  const extraPantsLayer = effectiveTempC <= comfort.extraPantsLayerBelowC;
  const woolBase = effectiveTempC <= comfort.woolBaseBelowC;
  const rainGear =
    weather.maxRainProbPct >= comfort.rainProbThreshold ||
    weather.maxPrecipMm >= 0.5;

  const reasons: string[] = [];
  const items: string[] = ['Base motorcycle gear'];

  reasons.push(
    `Effective temp ${effectiveTempC.toFixed(1)}°C (min ${weather.minTempC.toFixed(1)}°C, wind ${wind.toFixed(1)} m/s)`,
  );

  if (gloves) {
    items.push('Winter gloves');
    reasons.push(`Gloves: ≤ ${comfort.glovesBelowC}°C`);
  }
  if (extraJacketLayer) {
    items.push('Extra jacket layer');
    reasons.push(`Jacket layer: ≤ ${comfort.extraJacketLayerBelowC}°C`);
  }
  if (extraPantsLayer) {
    items.push('Extra pants layer');
    reasons.push(`Pants layer: ≤ ${comfort.extraPantsLayerBelowC}°C`);
  }
  if (woolBase) {
    items.push('Wool / thermal base');
    reasons.push(`Wool base: ≤ ${comfort.woolBaseBelowC}°C`);
  }
  if (rainGear) {
    items.push('Rain gear');
    reasons.push(
      `Rain: ${weather.maxRainProbPct.toFixed(0)}% chance / ${weather.maxPrecipMm.toFixed(1)} mm`,
    );
  }

  if (!gloves && !extraJacketLayer && !extraPantsLayer && !woolBase && !rainGear) {
    items.push('Standard summer layers');
    reasons.push('Conditions within your comfort zone');
  }

  return {
    effectiveTempC: Number(effectiveTempC.toFixed(1)),
    gloves,
    extraJacketLayer,
    extraPantsLayer,
    woolBase,
    rainGear,
    reasons,
    items,
  };
}

export function biasDeltaFromRating(rating: string): number {
  switch (rating) {
    case 'too_cold':
      return 1;
    case 'slightly_cold':
      return 0.5;
    case 'ok':
      return 0;
    case 'slightly_warm':
      return -0.5;
    case 'too_warm':
      return -1;
    default:
      return 0;
  }
}
