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


const RAIN_CAPABLE_CATEGORIES = new Set([
  'shell_jacket',
  'pants',
  'one_piece_suit',
  'rain_layer',
]);

function waterTierOf(item: KitItem): number {
  return item.effectiveTiers?.waterResistTier ?? 0;
}

/** True when an already-selected WEAR item meets waterproof demand. */
function wornSatisfiesWaterDemand(wear: KitItem[], needWater: number): boolean {
  return wear.some(
    (item) =>
      item.source === 'wardrobe' &&
      item.slot !== 'mid' &&
      item.slot !== 'base' &&
      item.slot !== 'hands' &&
      item.slot !== 'feet' &&
      item.slot !== 'head' &&
      waterTierOf(item) >= needWater,
  );
}

function deltasFromConfiguration(
  garment: GarmentInput,
  configuration: ConfigInstruction[],
): ComponentDeltaLike[] {
  const deltas: ComponentDeltaLike[] = [];
  for (const instr of configuration) {
    if (instr.code === 'INSTALL_THERMAL_LINER') {
      const c = garment.components.find((x) => x.kind === 'thermal_liner');
      if (c) deltas.push(c);
    }
    if (instr.code === 'INSTALL_WATERPROOF_LINER') {
      const c = garment.components.find((x) => x.kind === 'waterproof_liner');
      if (c) deltas.push(c);
    }
  }
  return deltas;
}

type ComponentDeltaLike = {
  kind?: string;
  warmthDelta: number;
  windResistDelta: number;
  waterResistDelta: number;
  breathabilityDelta: number;
};

/**
 * If a worn outer garment can meet waterproof demand by installing its
 * waterproof liner, upgrade that same physical garment in place.
 * Returns true when wear items then satisfy needWater.
 */
function upgradeWornWithWaterproofLiner(
  wear: KitItem[],
  wardrobe: GarmentInput[],
  needWater: number,
  reasons: Reason[],
): boolean {
  if (wornSatisfiesWaterDemand(wear, needWater)) return true;

  for (const item of wear) {
    if (!item.garmentId || item.source !== 'wardrobe') continue;
    const garment = wardrobe.find((g) => g.id === item.garmentId);
    if (!garment || !RAIN_CAPABLE_CATEGORIES.has(garment.category)) continue;
    if (item.configuration.some((c) => c.code === 'INSTALL_WATERPROOF_LINER')) {
      continue;
    }
    const liner = garment.components.find((c) => c.kind === 'waterproof_liner');
    if (!liner) continue;

    const installed = deltasFromConfiguration(garment, item.configuration);
    installed.push(liner);
    const tiers = effectiveGarmentTiers(
      {
        warmthTier: garment.warmthTier,
        windResistTier: garment.windResistTier,
        waterResistTier: garment.waterResistTier,
        breathabilityTier: garment.breathabilityTier,
      },
      installed,
    );
    if (tiers.waterResistTier < needWater) continue;

    item.configuration = [
      ...item.configuration.filter((c) => c.code !== 'REMOVE_WATERPROOF_LINER'),
      {
        code: 'INSTALL_WATERPROOF_LINER',
        componentKind: 'waterproof_liner',
      },
    ];
    item.effectiveTiers = tiers;
    reasons.push({ code: 'WATERPROOF_LINER_RECOMMENDED' });
    return true;
  }
  return wornSatisfiesWaterDemand(wear, needWater);
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

  // 1) Match non-rain WEAR slots first so outer gear is chosen before rain.
  for (const slot of WEAR_SLOTS) {
    if (slot.slot === 'rain') continue;
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

  // 2) Sustained rain: credit waterproof worn gear / liner config before
  //    adding a separate rain-slot item (no duplicate physical garment).
  const rainSlot = WEAR_SLOTS.find((s) => s.slot === 'rain')!;
  const sustainedWater = zoneOf(input.demand.sustained, 'torso').water;
  if (sustainedWater >= 3) {
    const covered =
      wornSatisfiesWaterDemand(wear, sustainedWater) ||
      upgradeWornWithWaterproofLiner(
        wear,
        input.wardrobe,
        sustainedWater,
        reasons,
      );
    if (!covered) {
      const matched = matchSlot(
        rainSlot,
        'wear',
        input.demand.sustained,
        input.wardrobe,
        input.sustainedExposureC,
        used,
      );
      if (matched.item) wear.push(matched.item);
      reasons.push(...matched.reasons);
    }
  }

  // 3) PACK warmth for short extremes — peak demand, avoid duplicating wear.
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
        pack.push(matched.item);
        reasons.push(...matched.reasons);
      }
    }
  }

  // 4) PACK rain when peak waterproof demand exceeds what worn config covers.
  if (input.packRain) {
    const peakWater = zoneOf(input.demand.peak, 'torso').water;
    const alreadyWearRain = wear.some((w) => w.slot === 'rain');
    const wornCoversPeak = wornSatisfiesWaterDemand(wear, peakWater);
    if (!alreadyWearRain && !wornCoversPeak && peakWater >= 3) {
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
