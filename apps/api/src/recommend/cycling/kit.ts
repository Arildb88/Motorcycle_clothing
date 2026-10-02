import { effectiveGarmentTiers } from '../../domain/garment-config';
import type {
  CyclingConfigInstruction,
  CyclingDemandSummary,
  CyclingGarmentInput,
  CyclingIntensity,
  CyclingKitItem,
  CyclingReason,
  CyclingZoneDemand,
  CyclingZoneId,
} from './types';

const EXCLUDED_CATEGORIES = new Set(['one_piece_suit', 'heated_vest']);

const GENERIC = {
  base: 'Breathable cycling base layer',
  mid: 'Cycling jersey or light vest',
  shell: 'Packable cycling shell',
  legsCold: 'Cycling tights',
  legsMild: 'Cycling shorts or light tights',
  handsLight: 'Light cycling gloves',
  handsWarm: 'Winter cycling gloves',
  feet: 'Shoe covers or warmer cycling shoes',
  head: 'Cap, thin hat, or helmet liner',
  rain: 'Packable rain shell',
} as const;

type SlotNeed = {
  slot: string;
  zone: CyclingZoneId | 'rain';
  categories: string[];
  genericLabel: string;
  warmth: number;
  wind: number;
  water: number;
};

export function matchCyclingKit(input: {
  demand: CyclingDemandSummary;
  wardrobe: CyclingGarmentInput[];
  intensity: CyclingIntensity;
  maxRainProbPct: number;
  sustainedExposureC: number;
}): {
  wear: CyclingKitItem[];
  pack: CyclingKitItem[];
  reasons: CyclingReason[];
} {
  const reasons: CyclingReason[] = [];
  const wear: CyclingKitItem[] = [];
  const pack: CyclingKitItem[] = [];
  const used = new Set<string>();
  const sustained = zone(input.demand.sustained, 'torso');
  const peak = zone(input.demand.peak, 'torso');
  const overheat =
    input.intensity === 'hard' &&
    input.maxRainProbPct < 30 &&
    sustained.water <= 2 &&
    sustained.warmth <= 2;

  const push = (mode: 'wear' | 'pack', need: SlotNeed) => {
    const item = choose(
      need,
      mode,
      input.wardrobe,
      used,
      input.sustainedExposureC,
      overheat,
    );
    if (item.source === 'generic') {
      reasons.push({
        code: 'WARDROBE_GAP',
        params: { slot: need.slot, genericLabel: need.genericLabel },
      });
    } else {
      for (const config of item.configuration) {
        if (config.code === 'VENTS_OPEN' || config.code === 'VENTS_CLOSED') {
          reasons.push({ code: 'VENT_OR_PACK_SHELL' });
        }
      }
    }
    (mode === 'wear' ? wear : pack).push(item);
  };

  push('wear', {
    slot: 'base',
    zone: 'torso',
    categories: ['base_layer'],
    genericLabel: GENERIC.base,
    warmth: Math.max(1, sustained.warmth),
    wind: 1,
    water: 1,
  });

  if (sustained.warmth >= 3) {
    push('wear', {
      slot: 'mid',
      zone: 'torso',
      categories: ['mid_layer'],
      genericLabel: GENERIC.mid,
      warmth: sustained.warmth,
      wind: sustained.wind,
      water: 1,
    });
  } else if (input.demand.shortExtremeInfluencesPackOnly) {
    push('pack', {
      slot: 'mid',
      zone: 'torso',
      categories: ['mid_layer'],
      genericLabel: GENERIC.mid,
      warmth: input.demand.shortExtremeWarmth,
      wind: sustained.wind,
      water: 1,
    });
  }

  const shellWear =
    !overheat &&
    (sustained.water >= 3 || sustained.warmth >= 3 || sustained.wind >= 4);
  if (overheat) {
    const vented = choose(
      {
        slot: 'shell',
        zone: 'torso',
        categories: ['shell_jacket'],
        genericLabel: GENERIC.shell,
        warmth: 1,
        wind: sustained.wind,
        water: 1,
      },
      'pack',
      input.wardrobe,
      new Set(used),
      input.sustainedExposureC,
      true,
    );
    const canVent =
      vented.source === 'wardrobe' &&
      vented.configuration.some((config) => config.code === 'VENTS_OPEN');
    if (canVent) {
      used.add(vented.garmentId as string);
      wear.push({ ...vented, mode: 'wear' });
    } else {
      const packed = choose(
        {
          slot: 'shell',
          zone: 'torso',
          categories: ['shell_jacket'],
          genericLabel: GENERIC.shell,
          warmth: 1,
          wind: Math.max(2, sustained.wind),
          water: 1,
        },
        'pack',
        input.wardrobe,
        used,
        input.sustainedExposureC,
        false,
      );
      pack.push(packed);
      if (packed.source === 'generic') {
        reasons.push({
          code: 'WARDROBE_GAP',
          params: { slot: 'shell', genericLabel: GENERIC.shell },
        });
      }
    }
    reasons.push({ code: 'VENT_OR_PACK_SHELL' });
  } else if (shellWear) {
    push('wear', {
      slot: 'shell',
      zone: 'torso',
      categories: ['shell_jacket'],
      genericLabel: GENERIC.shell,
      warmth: sustained.warmth,
      wind: sustained.wind,
      water: sustained.water,
    });
    if (sustained.water >= 3)
      reasons.push({ code: 'RAIN_PROTECTION_REQUIRED' });
  }

  const legsCold = sustained.warmth >= 3 || sustained.water >= 3;
  push('wear', {
    slot: 'legs',
    zone: 'legs',
    categories: ['pants'],
    genericLabel: legsCold ? GENERIC.legsCold : GENERIC.legsMild,
    warmth: Math.max(sustained.warmth, legsCold ? 3 : 1),
    wind: sustained.wind,
    water: sustained.water,
  });

  const hands = zone(input.demand.sustained, 'hands');
  if (hands.warmth >= 2 || hands.wind >= 3) {
    push('wear', {
      slot: 'hands',
      zone: 'hands',
      categories: ['gloves'],
      genericLabel: hands.warmth >= 4 ? GENERIC.handsWarm : GENERIC.handsLight,
      warmth: hands.warmth,
      wind: hands.wind,
      water: hands.water,
    });
  }

  const feet = zone(input.demand.sustained, 'feet');
  if (feet.warmth >= 2 || feet.water >= 2 || feet.wind >= 3) {
    push('wear', {
      slot: 'feet',
      zone: 'feet',
      categories: ['boots', 'socks'],
      genericLabel: GENERIC.feet,
      warmth: feet.warmth,
      wind: feet.wind,
      water: feet.water,
    });
  }

  const head = zone(input.demand.sustained, 'head');
  if (head.warmth >= 3 || head.wind >= 4) {
    push('wear', {
      slot: 'head',
      zone: 'head',
      categories: ['headwear'],
      genericLabel: GENERIC.head,
      warmth: head.warmth,
      wind: head.wind,
      water: 1,
    });
  }

  const packRain = peak.water >= 3 && sustained.water < 3;
  if (packRain) {
    push('pack', {
      slot: 'rain',
      zone: 'rain',
      categories: ['rain_layer', 'shell_jacket'],
      genericLabel: GENERIC.rain,
      warmth: 1,
      wind: 2,
      water: peak.water,
    });
    reasons.push({ code: 'PACK_RAIN_LAYER' });
  } else if (
    sustained.water >= 4 &&
    !wear.some((item) => item.slot === 'shell' || item.slot === 'rain')
  ) {
    push('wear', {
      slot: 'rain',
      zone: 'rain',
      categories: ['rain_layer'],
      genericLabel: GENERIC.rain,
      warmth: 1,
      wind: 2,
      water: sustained.water,
    });
    reasons.push({ code: 'RAIN_PROTECTION_REQUIRED' });
  }

  return { wear, pack, reasons: dedupe(reasons) };
}

function choose(
  need: SlotNeed,
  mode: 'wear' | 'pack',
  wardrobe: CyclingGarmentInput[],
  used: Set<string>,
  sustainedExposureC: number,
  preferVent: boolean,
): CyclingKitItem {
  const candidates = wardrobe.filter(
    (garment) =>
      garment.activityTags.includes('cycling') &&
      need.categories.includes(garment.category) &&
      !EXCLUDED_CATEGORIES.has(garment.category) &&
      !used.has(garment.id),
  );
  let best: {
    garment: CyclingGarmentInput;
    score: number;
    configuration: CyclingConfigInstruction[];
    tiers: ReturnType<typeof effectiveGarmentTiers>;
  } | null = null;
  for (const garment of candidates) {
    const scored = scoreGarment(garment, need, sustainedExposureC, preferVent);
    if (!best || scored.score > best.score) {
      best = { garment, ...scored };
    }
  }
  if (!best) {
    return {
      mode,
      source: 'generic',
      slot: need.slot,
      zone: need.zone,
      genericLabel: need.genericLabel,
      category: need.categories[0],
      configuration: [],
    };
  }
  used.add(best.garment.id);
  return {
    mode,
    source: 'wardrobe',
    slot: need.slot,
    zone: need.zone,
    garmentId: best.garment.id,
    garmentName: best.garment.name,
    category: best.garment.category,
    configuration: best.configuration,
    effectiveTiers: best.tiers,
  };
}

function scoreGarment(
  garment: CyclingGarmentInput,
  need: SlotNeed,
  sustainedExposureC: number,
  preferVent: boolean,
): {
  score: number;
  configuration: CyclingConfigInstruction[];
  tiers: ReturnType<typeof effectiveGarmentTiers>;
} {
  const configuration: CyclingConfigInstruction[] = [];
  const installed = [];
  if (need.warmth >= 4) {
    const liner = garment.components.find(
      (component) => component.kind === 'thermal_liner',
    );
    if (liner) {
      installed.push(liner);
      configuration.push({
        code: 'INSTALL_THERMAL_LINER',
        componentKind: liner.kind,
      });
    }
  }
  if (need.water >= 3) {
    const liner = garment.components.find(
      (component) => component.kind === 'waterproof_liner',
    );
    if (liner) {
      installed.push(liner);
      configuration.push({
        code: 'INSTALL_WATERPROOF_LINER',
        componentKind: liner.kind,
      });
    }
  }
  if (garment.hasVentilation && preferVent) {
    configuration.push({ code: 'VENTS_OPEN', vents: 'open' });
  } else if (garment.hasVentilation && sustainedExposureC < 8) {
    configuration.push({ code: 'VENTS_CLOSED', vents: 'closed' });
  }
  const tiers = effectiveGarmentTiers(
    {
      warmthTier: garment.warmthTier,
      windResistTier: garment.windResistTier,
      waterResistTier: garment.waterResistTier,
      breathabilityTier: garment.breathabilityTier,
    },
    installed,
  );
  const warmthGap = tiers.warmthTier - need.warmth;
  const windGap = tiers.windResistTier - need.wind;
  const waterGap = tiers.waterResistTier - need.water;
  let score = 0;
  score += warmthGap >= 0 ? 10 - warmthGap : warmthGap * 5;
  score += windGap >= 0 ? 6 - windGap : windGap * 3;
  score += waterGap >= 0 ? 8 - waterGap : waterGap * 4;
  if (preferVent && garment.hasVentilation) score += 5;
  if (EXCLUDED_CATEGORIES.has(garment.category)) score -= 100;
  return { score, configuration, tiers };
}

function zone(
  zones: CyclingZoneDemand[],
  id: CyclingZoneId,
): CyclingZoneDemand {
  return (
    zones.find((item) => item.zone === id) ?? {
      zone: id,
      warmth: 1,
      wind: 1,
      water: 1,
    }
  );
}

function dedupe(reasons: CyclingReason[]): CyclingReason[] {
  const seen = new Set<string>();
  const out: CyclingReason[] = [];
  for (const reason of reasons) {
    const key = `${reason.code}:${JSON.stringify(reason.params ?? {})}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(reason);
  }
  return out;
}
