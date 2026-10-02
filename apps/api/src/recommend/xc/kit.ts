import { effectiveGarmentTiers } from '../../domain/garment-config';
import type { XcIntensity, XcStyle } from './constants';
import type {
  XcConfigInstruction,
  XcDemandSummary,
  XcGarmentInput,
  XcKitItem,
  XcReason,
  XcZoneDemand,
  XcZoneId,
} from './types';

const EXCLUDED_CATEGORIES = new Set(['one_piece_suit', 'heated_vest', 'boots']);

const GENERIC = {
  base: 'Thin XC base layer',
  mid: 'Light XC mid layer',
  shell: 'Thin XC shell or vest',
  legs: 'Light XC tights',
  legsCold: 'XC tights with a light shell pant',
  hands: 'Light XC gloves',
  handsWarm: 'Warmer XC gloves',
  overmitts: 'Light overmitts for stops and descents',
  feet: 'XC ski socks',
  head: 'Thin hat or headband',
} as const;

type SlotNeed = {
  slot: string;
  zone: XcZoneId;
  categories: string[];
  genericLabel: string;
  warmth: number;
  wind: number;
  water: number;
};

export function isXcGarment(garment: XcGarmentInput): boolean {
  return garment.activityTags.includes('xc_skiing');
}

export function matchXcKit(input: {
  demand: XcDemandSummary;
  wardrobe: XcGarmentInput[];
  intensity: XcIntensity;
  style: XcStyle | null;
  sustainedExposureC: number;
  climbing: boolean;
}): { wear: XcKitItem[]; pack: XcKitItem[]; reasons: XcReason[] } {
  const reasons: XcReason[] = [];
  const wear: XcKitItem[] = [];
  const pack: XcKitItem[] = [];
  const used = new Set<string>();
  const sustained = zone(input.demand.sustained, 'torso');
  const openVents =
    input.intensity === 'hard' || (input.climbing && sustained.warmth <= 3);

  const push = (mode: 'wear' | 'pack', need: SlotNeed) => {
    const item = choose(
      need,
      mode,
      input.wardrobe,
      used,
      input.sustainedExposureC,
      mode === 'wear' && openVents,
    );
    if (item.source === 'generic') {
      reasons.push({
        code: 'WARDROBE_GAP',
        params: { slot: need.slot, genericLabel: need.genericLabel },
      });
    } else if (
      item.configuration.some((config) => config.code === 'VENTS_OPEN')
    ) {
      reasons.push({ code: 'VENTS_FOR_CLIMB' });
    }
    (mode === 'wear' ? wear : pack).push(item);
  };

  push('wear', {
    slot: 'base',
    zone: 'torso',
    categories: ['base_layer'],
    genericLabel: GENERIC.base,
    warmth: Math.max(1, sustained.warmth - 1),
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
      wind: Math.max(1, sustained.wind - 1),
      water: 1,
    });
  } else if (input.demand.shortExtremeInfluencesPackOnly) {
    push('pack', {
      slot: 'mid',
      zone: 'torso',
      categories: ['mid_layer'],
      genericLabel: GENERIC.mid,
      warmth: input.demand.shortExtremeWarmth,
      wind: 1,
      water: 1,
    });
  }

  const shellWorn =
    sustained.water >= 3 || sustained.wind >= 4 || sustained.warmth >= 4;
  push(shellWorn ? 'wear' : 'pack', {
    slot: 'shell',
    zone: 'torso',
    categories: ['shell_jacket'],
    genericLabel: GENERIC.shell,
    warmth: shellWorn ? Math.max(2, sustained.warmth - 1) : 1,
    wind: Math.max(2, sustained.wind),
    water: shellWorn ? sustained.water : Math.max(2, input.demand.peakWater),
  });
  if (shellWorn && sustained.water >= 3) {
    reasons.push({ code: 'RAIN_PROTECTION_REQUIRED' });
  }
  if (!shellWorn) reasons.push({ code: 'PACK_SHELL' });

  const legsCold = sustained.warmth >= 3 || sustained.water >= 3;
  push('wear', {
    slot: 'legs',
    zone: 'legs',
    categories: ['pants'],
    genericLabel: legsCold ? GENERIC.legsCold : GENERIC.legs,
    warmth: Math.max(1, sustained.warmth - (legsCold ? 0 : 1)),
    wind: sustained.wind,
    water: sustained.water,
  });

  const hands = zone(input.demand.sustained, 'hands');
  if (hands.warmth >= 4 || hands.wind >= 4) {
    push('wear', {
      slot: 'hands',
      zone: 'hands',
      categories: ['gloves'],
      genericLabel: GENERIC.handsWarm,
      warmth: hands.warmth,
      wind: hands.wind,
      water: hands.water,
    });
  } else if (hands.warmth >= 2 || hands.wind >= 2) {
    push('wear', {
      slot: 'hands',
      zone: 'hands',
      categories: ['gloves'],
      genericLabel: GENERIC.hands,
      warmth: hands.warmth,
      wind: hands.wind,
      water: 1,
    });
  }
  if (
    input.demand.shortExtremeInfluencesPackOnly &&
    input.demand.shortExtremeWarmth >= 4
  ) {
    push('pack', {
      slot: 'overmitts',
      zone: 'hands',
      categories: ['gloves'],
      genericLabel: GENERIC.overmitts,
      warmth: input.demand.shortExtremeWarmth,
      wind: Math.max(2, input.demand.peakWind),
      water: 1,
    });
  }

  const feet = zone(input.demand.sustained, 'feet');
  if (feet.warmth >= 2 || feet.water >= 2) {
    push('wear', {
      slot: 'feet',
      zone: 'feet',
      categories: ['socks'],
      genericLabel: GENERIC.feet,
      warmth: feet.warmth,
      wind: 1,
      water: 1,
    });
  }

  const head = zone(input.demand.sustained, 'head');
  if (head.warmth >= 3 || head.wind >= 3) {
    push('wear', {
      slot: 'head',
      zone: 'head',
      categories: ['headwear'],
      genericLabel: GENERIC.head,
      warmth: Math.max(1, head.warmth - 1),
      wind: head.wind,
      water: 1,
    });
  }

  if (input.style === 'classic') {
    reasons.push({ code: 'CLASSIC_BOOTS_ARE_EQUIPMENT' });
  } else if (input.style === 'skate') {
    reasons.push({ code: 'SKATE_BOOTS_ARE_EQUIPMENT' });
  } else {
    reasons.push({ code: 'STYLE_NOT_SPECIFIED' });
  }

  return { wear, pack, reasons: dedupe(reasons) };
}

function choose(
  need: SlotNeed,
  mode: 'wear' | 'pack',
  wardrobe: XcGarmentInput[],
  used: Set<string>,
  sustainedExposureC: number,
  preferVent: boolean,
): XcKitItem {
  const candidates = wardrobe.filter(
    (garment) =>
      isXcGarment(garment) &&
      need.categories.includes(garment.category) &&
      !EXCLUDED_CATEGORIES.has(garment.category) &&
      !used.has(garment.id),
  );
  let best: {
    garment: XcGarmentInput;
    score: number;
    configuration: XcConfigInstruction[];
    tiers: ReturnType<typeof effectiveGarmentTiers>;
  } | null = null;
  for (const garment of candidates) {
    const scored = scoreGarment(garment, need, sustainedExposureC, preferVent);
    if (!best || scored.score > best.score) best = { garment, ...scored };
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
  garment: XcGarmentInput,
  need: SlotNeed,
  sustainedExposureC: number,
  preferVent: boolean,
): {
  score: number;
  configuration: XcConfigInstruction[];
  tiers: ReturnType<typeof effectiveGarmentTiers>;
} {
  const configuration: XcConfigInstruction[] = [];
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
  if (garment.hasVentilation && (preferVent || sustainedExposureC >= 8)) {
    configuration.push({ code: 'VENTS_OPEN', vents: 'open' });
  } else if (garment.hasVentilation && sustainedExposureC < 0) {
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
  if (preferVent && garment.hasVentilation) score += 4;
  if (need.slot === 'head' && warmthGap > 1) score -= 4;
  if (EXCLUDED_CATEGORIES.has(garment.category)) score -= 100;
  return { score, configuration, tiers };
}

function zone(zones: XcZoneDemand[], id: XcZoneId): XcZoneDemand {
  return (
    zones.find((item) => item.zone === id) ?? {
      zone: id,
      warmth: 1,
      wind: 1,
      water: 1,
    }
  );
}

function dedupe(reasons: XcReason[]): XcReason[] {
  const seen = new Set<string>();
  const out: XcReason[] = [];
  for (const reason of reasons) {
    const key = `${reason.code}:${JSON.stringify(reason.params ?? {})}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(reason);
  }
  return out;
}
