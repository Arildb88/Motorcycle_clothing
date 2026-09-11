import { effectiveGarmentTiers } from '../../domain/garment-config';
import { VENT_ADVICE } from './constants';
import type {
  ConfigInstruction,
  DemandSummary,
  GarmentInput,
  KitItem,
  Reason,
  ZoneDemand,
  ZoneId,
} from './types';

type SlotSpec = {
  slot: string;
  zone: ZoneId | 'full_body' | 'rain';
  categories: string[];
  /** Which demand axis drives matching for this slot. */
  axis: 'warmth' | 'wind' | 'water';
  genericLabel: string;
};

const WEAR_SLOTS: SlotSpec[] = [
  {
    slot: 'shell',
    zone: 'torso',
    categories: ['shell_jacket', 'one_piece_suit'],
    axis: 'warmth',
    genericLabel: 'Warm windproof motorcycle jacket required',
  },
  {
    slot: 'legs',
    zone: 'legs',
    categories: ['pants', 'one_piece_suit'],
    axis: 'warmth',
    genericLabel: 'Warm windproof motorcycle pants required',
  },
  {
    slot: 'mid',
    zone: 'torso',
    categories: ['mid_layer', 'heated_vest'],
    axis: 'warmth',
    genericLabel: 'Insulating mid layer required',
  },
  {
    slot: 'base',
    zone: 'torso',
    categories: ['base_layer'],
    axis: 'warmth',
    genericLabel: 'Thermal base layer required',
  },
  {
    slot: 'hands',
    zone: 'hands',
    categories: ['gloves'],
    axis: 'warmth',
    genericLabel: 'Warm waterproof motorcycle gloves required',
  },
  {
    slot: 'feet',
    zone: 'feet',
    categories: ['boots', 'socks'],
    axis: 'warmth',
    genericLabel: 'Warm motorcycle boots required',
  },
  {
    slot: 'head',
    zone: 'head',
    categories: ['headwear'],
    axis: 'warmth',
    genericLabel: 'Insulating headwear / balaclava required',
  },
  {
    slot: 'rain',
    zone: 'rain',
    categories: ['rain_layer', 'shell_jacket', 'pants'],
    axis: 'water',
    genericLabel: 'Waterproof motorcycle rain protection required',
  },
];

function zoneOf(demand: ZoneDemand[], zone: ZoneId): ZoneDemand {
  return (
    demand.find((z) => z.zone === zone) ?? {
      zone,
      warmth: 1,
      wind: 1,
      water: 1,
    }
  );
}

function demandForSlot(slot: SlotSpec, zones: ZoneDemand[]): number {
  if (slot.zone === 'rain' || slot.zone === 'full_body') {
    const torso = zoneOf(zones, 'torso');
    if (slot.axis === 'water') return torso.water;
    return Math.max(torso.warmth, torso.wind, torso.water);
  }
  const z = zoneOf(zones, slot.zone as ZoneId);
  if (slot.axis === 'water') return z.water;
  if (slot.axis === 'wind') return z.wind;
  return z.warmth;
}

/** Minimum demand to bother recommending this slot for WEAR. */
function wearThreshold(slot: SlotSpec): number {
  if (slot.slot === 'shell' || slot.slot === 'legs') return 1; // always wear protective outer
  if (slot.slot === 'base') return 3;
  if (slot.slot === 'mid') return 3;
  if (slot.slot === 'hands') return 2;
  if (slot.slot === 'head') return 3;
  if (slot.slot === 'feet') return 3;
  if (slot.slot === 'rain') return 3;
  return 2;
}

function scoreGarment(
  g: GarmentInput,
  needWarmth: number,
  needWind: number,
  needWater: number,
  installedIds: string[],
): {
  score: number;
  tiers: ReturnType<typeof effectiveGarmentTiers>;
  configuration: ConfigInstruction[];
} {
  const installed = g.components.filter((c) => installedIds.includes(c.id));
  const tiers = effectiveGarmentTiers(
    {
      warmthTier: g.warmthTier,
      windResistTier: g.windResistTier,
      waterResistTier: g.waterResistTier,
      breathabilityTier: g.breathabilityTier,
    },
    installed,
  );

  const configuration: ConfigInstruction[] = [];
  for (const c of installed) {
    if (c.kind === 'thermal_liner') {
      configuration.push({
        code: 'INSTALL_THERMAL_LINER',
        componentKind: c.kind,
      });
    }
    if (c.kind === 'waterproof_liner') {
      configuration.push({
        code: 'INSTALL_WATERPROOF_LINER',
        componentKind: c.kind,
      });
    }
  }

  // Prefer meeting demand without large overshoot; under-shooting is worse.
  const warmthGap = tiers.warmthTier - needWarmth;
  const windGap = tiers.windResistTier - needWind;
  const waterGap = tiers.waterResistTier - needWater;
  let score = 0;
  score += warmthGap >= 0 ? 10 - warmthGap : warmthGap * 5;
  score += windGap >= 0 ? 6 - windGap : windGap * 3;
  score += waterGap >= 0 ? 8 - waterGap : waterGap * 4;
  if (g.activityTags.includes('motorcycle')) score += 2;
  return { score, tiers, configuration };
}

/**
 * Choose best component install set for a garment against demand.
 * Considers base (no liners) and each liner combination.
 */
function bestConfiguration(
  g: GarmentInput,
  needWarmth: number,
  needWind: number,
  needWater: number,
  sustainedExposureC: number,
): {
  score: number;
  tiers: ReturnType<typeof effectiveGarmentTiers>;
  configuration: ConfigInstruction[];
} {
  const thermal = g.components.filter((c) => c.kind === 'thermal_liner');
  const waterproof = g.components.filter((c) => c.kind === 'waterproof_liner');

  const candidates: string[][] = [[]];
  for (const t of thermal) candidates.push([t.id]);
  for (const w of waterproof) candidates.push([w.id]);
  for (const t of thermal) {
    for (const w of waterproof) candidates.push([t.id, w.id]);
  }

  let best = scoreGarment(g, needWarmth, needWind, needWater, []);
  for (const ids of candidates) {
    const scored = scoreGarment(g, needWarmth, needWind, needWater, ids);
    if (scored.score > best.score) best = scored;
  }

  if (g.hasVentilation) {
    if (sustainedExposureC < VENT_ADVICE.closeBelowC) {
      best.configuration.push({ code: 'VENTS_CLOSED', vents: 'closed' });
    } else if (sustainedExposureC > VENT_ADVICE.openAboveC) {
      best.configuration.push({ code: 'VENTS_OPEN', vents: 'open' });
    }
  }

  // Prefer remove instructions when warmth is low and liner would overshoot —
  // only emit REMOVE when liner exists but was not selected.
  for (const t of thermal) {
    const installed = best.configuration.some(
      (c) => c.code === 'INSTALL_THERMAL_LINER',
    );
    if (!installed && needWarmth <= 2) {
      best.configuration.push({
        code: 'REMOVE_THERMAL_LINER',
        componentKind: 'thermal_liner',
      });
    }
    void t;
  }

  return best;
}

function matchSlot(
  slot: SlotSpec,
  mode: 'wear' | 'pack',
  zones: ZoneDemand[],
  wardrobe: GarmentInput[],
  sustainedExposureC: number,
  usedGarmentIds: Set<string>,
): { item: KitItem | null; reasons: Reason[] } {
  const need = demandForSlot(slot, zones);
  if (mode === 'wear' && need < wearThreshold(slot)) {
    return { item: null, reasons: [] };
  }
  // Pack rain / insulation only when demand justifies.
  if (mode === 'pack' && slot.slot === 'rain' && need < 3) {
    return { item: null, reasons: [] };
  }
  if (mode === 'pack' && slot.slot !== 'rain' && need < 3) {
    return { item: null, reasons: [] };
  }

  const torso = zoneOf(zones, 'torso');
  const needWarmth =
    slot.axis === 'warmth'
      ? need
      : slot.zone === 'rain'
        ? 1
        : zoneOf(zones, slot.zone as ZoneId).warmth;
  const needWind = torso.wind;
  const needWater =
    slot.axis === 'water' || slot.slot === 'rain' ? need : torso.water;

  const candidates = wardrobe.filter(
    (g) =>
      slot.categories.includes(g.category) &&
      !usedGarmentIds.has(g.id) &&
      (slot.zone === 'rain' ||
        g.primaryBodyZone === slot.zone ||
        g.primaryBodyZone === 'full_body'),
  );

  // Loosen zone filter for rain / multi-zone categories.
  const pool =
    candidates.length > 0
      ? candidates
      : wardrobe.filter(
          (g) =>
            slot.categories.includes(g.category) && !usedGarmentIds.has(g.id),
        );

  let best: {
    garment: GarmentInput;
    score: number;
    tiers: ReturnType<typeof effectiveGarmentTiers>;
    configuration: ConfigInstruction[];
  } | null = null;

  for (const g of pool) {
    const scored = bestConfiguration(
      g,
      needWarmth,
      needWind,
      needWater,
      sustainedExposureC,
    );
    if (!best || scored.score > best.score) {
      best = { garment: g, ...scored };
    }
  }

  const reasons: Reason[] = [];

  if (best && best.score > -20) {
    usedGarmentIds.add(best.garment.id);
    for (const c of best.configuration) {
      if (c.code === 'INSTALL_THERMAL_LINER') {
        reasons.push({ code: 'THERMAL_LINER_RECOMMENDED' });
      }
      if (c.code === 'INSTALL_WATERPROOF_LINER') {
        reasons.push({ code: 'WATERPROOF_LINER_RECOMMENDED' });
      }
      if (c.code === 'VENTS_CLOSED') {
        reasons.push({ code: 'VENTS_CLOSED_RECOMMENDED' });
      }
      if (c.code === 'VENTS_OPEN') {
        reasons.push({ code: 'VENTS_OPEN_RECOMMENDED' });
      }
    }
    return {
      item: {
        mode,
        source: 'wardrobe',
        slot: slot.slot,
        zone: slot.zone,
        garmentId: best.garment.id,
        garmentName: best.garment.name,
        category: best.garment.category,
        configuration: best.configuration,
        effectiveTiers: best.tiers,
      },
      reasons,
    };
  }

  reasons.push({
    code: 'WARDROBE_GAP',
    params: { slot: slot.slot, genericLabel: slot.genericLabel },
  });
  return {
    item: {
      mode,
      source: 'generic',
      slot: slot.slot,
      zone: slot.zone,
      genericLabel: slot.genericLabel,
      category: slot.categories[0],
      configuration: [],
    },
    reasons,
  };
}

export function matchWardrobe(input: {
  demand: DemandSummary;
  wardrobe: GarmentInput[];
  sustainedExposureC: number;
  packWarmth: boolean;
  packRain: boolean;
}): { wear: KitItem[]; pack: KitItem[]; reasons: Reason[] } {
  const wear: KitItem[] = [];
  const pack: KitItem[] = [];
  const reasons: Reason[] = [];
  const used = new Set<string>();

  for (const slot of WEAR_SLOTS) {
    // Skip mid/base on mild sustained demand.
    if (slot.slot === 'rain') {
      const water = zoneOf(input.demand.sustained, 'torso').water;
      if (water >= 3) {
        const matched = matchSlot(
          slot,
          'wear',
          input.demand.sustained,
          input.wardrobe,
          input.sustainedExposureC,
          used,
        );
        if (matched.item) wear.push(matched.item);
        reasons.push(...matched.reasons);
      }
      continue;
    }

    const matched = matchSlot(
      slot,
      'wear',
      input.demand.sustained,
      input.wardrobe,
      input.sustainedExposureC,
      used,
    );
    if (matched.item) wear.push(matched.item);
    reasons.push(...matched.reasons);
  }

  // PACK: short extremes / later rain — use peak demand, avoid duplicating wear garments.
  if (input.packWarmth || input.demand.shortExtremeInfluencesPackOnly) {
    for (const slot of WEAR_SLOTS.filter((s) =>
      ['mid', 'hands', 'base'].includes(s.slot),
    )) {
      const matched = matchSlot(
        slot,
        'pack',
        input.demand.peak,
        input.wardrobe,
        input.sustainedExposureC,
        used,
      );
      if (matched.item) {
        // Don't pack a duplicate of something already worn in same slot.
        if (
          wear.some(
            (w) =>
              w.slot === matched.item!.slot &&
              w.garmentId &&
              w.garmentId === matched.item!.garmentId,
          )
        ) {
          continue;
        }
        if (wear.some((w) => w.slot === matched.item!.slot && w.source === 'wardrobe')) {
          // Already wearing that slot from wardrobe — only pack if peak need higher
          // and we found a different item (already ensured by used set).
        }
        pack.push(matched.item);
        reasons.push(...matched.reasons);
      }
    }
  }

  if (input.packRain) {
    const rainSlot = WEAR_SLOTS.find((s) => s.slot === 'rain')!;
    const alreadyWearRain = wear.some((w) => w.slot === 'rain');
    if (!alreadyWearRain) {
      const matched = matchSlot(
        rainSlot,
        'pack',
        input.demand.peak,
        input.wardrobe,
        input.sustainedExposureC,
        used,
      );
      if (matched.item) {
        pack.push(matched.item);
        reasons.push(...matched.reasons);
      }
    }
  }

  return { wear, pack, reasons: dedupe(reasons) };
}

function dedupe(reasons: Reason[]): Reason[] {
  const seen = new Set<string>();
  const out: Reason[] = [];
  for (const r of reasons) {
    if (seen.has(r.code)) continue;
    seen.add(r.code);
    out.push(r);
  }
  return out;
}
