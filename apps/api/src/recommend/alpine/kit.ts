import { effectiveGarmentTiers } from '../../domain/garment-config';
import { alpineWindDemand, alpineWarmthDemand } from './exposure';
import type {
  AlpineConfigInstruction,
  AlpineGarmentInput,
  AlpineKitItem,
  AlpineReason,
  AlpineZoneId,
} from './types';

const EXCLUDED_CATEGORIES = new Set(['one_piece_suit', 'heated_vest', 'boots']);

const GENERIC = {
  base: 'Alpine base layer',
  mid: 'Light or heavy alpine mid layer',
  shell: 'Alpine shell jacket',
  legs: 'Alpine shell pants',
  hands: 'Alpine gloves',
  handsWarm: 'Insulated alpine mittens',
  feet: 'Warmer alpine socks',
  head: 'Helmet liner or buff',
  neck: 'Neck gaiter',
} as const;

type SlotNeed = {
  slot: string;
  zone: AlpineZoneId;
  categories: string[];
  genericLabel: string;
  warmth: number;
  wind: number;
  water: number;
};

export function matchAlpineKit(input: {
  wornExposureC: number | null;
  wornWindMs: number;
  water: number;
  spreadC: number | null;
  wardrobe: AlpineGarmentInput[];
}): { wear: AlpineKitItem[]; pack: AlpineKitItem[]; reasons: AlpineReason[] } {
  const reasons: AlpineReason[] = [];
  const wear: AlpineKitItem[] = [];
  const pack: AlpineKitItem[] = [];
  const used = new Set<string>();
  const warmth =
    input.wornExposureC == null ? 3 : alpineWarmthDemand(input.wornExposureC);
  const wind = alpineWindDemand(input.wornWindMs);
  const handsWind = Math.min(5, wind + 1);

  const push = (mode: 'wear' | 'pack', need: SlotNeed) => {
    const item = choose(need, mode, input.wardrobe, used);
    if (item.source === 'generic') {
      reasons.push({
        code: 'WARDROBE_GAP',
        params: { slot: need.slot, genericLabel: need.genericLabel },
      });
    }
    (mode === 'wear' ? wear : pack).push(item);
  };

  push('wear', {
    slot: 'base',
    zone: 'torso',
    categories: ['base_layer'],
    genericLabel: GENERIC.base,
    warmth: Math.max(1, warmth - 1),
    wind: 1,
    water: 1,
  });

  if (warmth >= 3) {
    push('wear', {
      slot: 'mid',
      zone: 'torso',
      categories: ['mid_layer'],
      genericLabel: GENERIC.mid,
      warmth,
      wind,
      water: 1,
    });
  } else if (warmth === 2) {
    push('pack', {
      slot: 'mid',
      zone: 'torso',
      categories: ['mid_layer'],
      genericLabel: GENERIC.mid,
      warmth: 2,
      wind,
      water: 1,
    });
  }

  const shellOn = warmth >= 2 || wind >= 2 || input.water >= 2;
  push(shellOn ? 'wear' : 'pack', {
    slot: 'shell',
    zone: 'torso',
    categories: ['shell_jacket'],
    genericLabel: GENERIC.shell,
    warmth: Math.max(2, warmth),
    wind: Math.max(wind, 2),
    water: input.water,
  });

  if (warmth >= 2 || input.water >= 2 || wind >= 3) {
    push('wear', {
      slot: 'legs',
      zone: 'legs',
      categories: ['pants'],
      genericLabel: GENERIC.legs,
      warmth,
      wind,
      water: input.water,
    });
  }

  if (warmth >= 2 || wind >= 2) {
    push('wear', {
      slot: 'hands',
      zone: 'hands',
      categories: ['gloves'],
      genericLabel: warmth >= 4 ? GENERIC.handsWarm : GENERIC.hands,
      warmth: Math.max(warmth, handsWind >= 4 ? 4 : warmth),
      wind: handsWind,
      water: input.water,
    });
  }

  if (warmth >= 2 || input.water >= 2) {
    push('wear', {
      slot: 'feet',
      zone: 'feet',
      categories: ['socks'],
      genericLabel: GENERIC.feet,
      warmth,
      wind: 1,
      water: 1,
    });
  }

  if (warmth >= 3 || wind >= 3) {
    push('wear', {
      slot: 'head',
      zone: 'head',
      categories: ['headwear'],
      genericLabel: GENERIC.head,
      warmth,
      wind,
      water: 1,
    });
  }

  if (wind >= 3 || warmth >= 4) {
    push('wear', {
      slot: 'neck',
      zone: 'neck',
      categories: ['neckwear'],
      genericLabel: GENERIC.neck,
      warmth,
      wind,
      water: 1,
    });
  }

  if (input.spreadC != null && input.spreadC >= 6 && warmth >= 4) {
    push('pack', {
      slot: 'lighter_mid',
      zone: 'torso',
      categories: ['mid_layer'],
      genericLabel: 'Lighter mid layer for lower on the hill',
      warmth: Math.max(1, warmth - 2),
      wind: 1,
      water: 1,
    });
  }

  reasons.push({ code: 'BOOTS_ARE_EQUIPMENT' });
  reasons.push({ code: 'GOGGLES_ARE_EQUIPMENT' });
  reasons.push({ code: 'HELMET_IS_EQUIPMENT' });

  const selectedWarmth = wornMidWarmth(wear);
  const warmerLeft = input.wardrobe.some(
    (garment) =>
      isAlpineFamily(garment) &&
      garment.category === 'mid_layer' &&
      !used.has(garment.id) &&
      garment.warmthTier >= selectedWarmth + 2,
  );
  if (warmerLeft) reasons.push({ code: 'LEAVE_WARMER_LAYER_OFF_HILL' });

  return { wear, pack, reasons };
}

export function isAlpineFamily(garment: AlpineGarmentInput): boolean {
  return (
    garment.activityTags.includes('alpine_skiing') ||
    garment.activityTags.includes('snowboarding')
  );
}

function wornMidWarmth(wear: AlpineKitItem[]): number {
  const mid = wear.find((item) => item.slot === 'mid');
  if (!mid) return 1;
  return mid.effectiveTiers?.warmthTier ?? 3;
}

function choose(
  need: SlotNeed,
  mode: 'wear' | 'pack',
  wardrobe: AlpineGarmentInput[],
  used: Set<string>,
): AlpineKitItem {
  const candidates = wardrobe.filter(
    (garment) =>
      isAlpineFamily(garment) &&
      need.categories.includes(garment.category) &&
      !EXCLUDED_CATEGORIES.has(garment.category) &&
      !used.has(garment.id),
  );
  let best: {
    garment: AlpineGarmentInput;
    score: number;
    configuration: AlpineConfigInstruction[];
    tiers: ReturnType<typeof effectiveGarmentTiers>;
  } | null = null;
  for (const garment of candidates) {
    const scored = scoreGarment(garment, need);
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
  garment: AlpineGarmentInput,
  need: SlotNeed,
): {
  score: number;
  configuration: AlpineConfigInstruction[];
  tiers: ReturnType<typeof effectiveGarmentTiers>;
} {
  const configuration: AlpineConfigInstruction[] = [];
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
  if (garment.hasVentilation && need.warmth <= 2) {
    configuration.push({ code: 'VENTS_OPEN', vents: 'open' });
  } else if (garment.hasVentilation) {
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
  if (EXCLUDED_CATEGORIES.has(garment.category)) score -= 100;
  return { score, configuration, tiers };
}
