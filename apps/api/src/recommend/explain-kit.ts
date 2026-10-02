/**
 * Attaches concise reason codes to wear and pack items.
 *
 * A code is included only when the engine already emitted it and the slot's
 * own selection rule reads that input. Limit notes, other activities' codes,
 * and personal-history claims are left off the garment.
 */

export type ExplainableReason = {
  code: string;
  params?: Record<string, string | number | boolean>;
};

export type ExplainableKitItem = {
  mode: 'wear' | 'pack';
  slot: string;
  source?: string;
  configuration?: ReadonlyArray<{ code: string }>;
};

const CONFIG_INSTRUCTION: Record<string, string> = {
  THERMAL_LINER_RECOMMENDED: 'INSTALL_THERMAL_LINER',
  WATERPROOF_LINER_RECOMMENDED: 'INSTALL_WATERPROOF_LINER',
  VENTS_CLOSED_RECOMMENDED: 'VENTS_CLOSED',
  VENTS_OPEN_RECOMMENDED: 'VENTS_OPEN',
  VENTS_FOR_CLIMB: 'VENTS_OPEN',
};

const MC_COLD = ['LOW_EFFECTIVE_TEMPERATURE', 'SUSTAINED_COLD_EXPOSURE'];
const MC_CONFIG = [
  'THERMAL_LINER_RECOMMENDED',
  'WATERPROOF_LINER_RECOMMENDED',
  'VENTS_CLOSED_RECOMMENDED',
  'VENTS_OPEN_RECOMMENDED',
];

export function explainKitItems<T extends ExplainableKitItem>(
  engine: string,
  items: readonly T[],
  reasons: readonly ExplainableReason[],
): Array<T & { because: string[] }> {
  return items.map((item) => ({
    ...item,
    because: becauseFor(engine, item, reasons),
  }));
}

function becauseFor(
  engine: string,
  item: ExplainableKitItem,
  reasons: readonly ExplainableReason[],
): string[] {
  const allowed = new Set(allowlist(engine, item.mode, item.slot));
  const because: string[] = [];
  for (const reason of reasons) {
    if (!allowed.has(reason.code) || because.includes(reason.code)) continue;
    if (!passesGates(item, reason)) continue;
    because.push(reason.code);
  }
  return because;
}

function passesGates(
  item: ExplainableKitItem,
  reason: ExplainableReason,
): boolean {
  if (reason.code === 'WARDROBE_GAP') {
    return item.source === 'generic' && reason.params?.slot === item.slot;
  }
  const instruction = CONFIG_INSTRUCTION[reason.code];
  if (!instruction) return true;
  return (item.configuration ?? []).some((entry) => entry.code === instruction);
}

function allowlist(
  engine: string,
  mode: 'wear' | 'pack',
  slot: string,
): readonly string[] {
  switch (engine) {
    case 'motorcycle_v1':
      return motorcycleAllow(mode, slot);
    case 'cycling_v1':
      return cyclingAllow(mode, slot);
    case 'alpine_v1':
      return alpineAllow(mode, slot);
    case 'xc_v1':
      return xcAllow(mode, slot);
    default:
      return [];
  }
}

function motorcycleAllow(mode: 'wear' | 'pack', slot: string): readonly string[] {
  if (mode === 'pack') {
    if (slot === 'rain') return ['PACK_RAIN_LAYER', 'WARDROBE_GAP'];
    if (slot === 'mid' || slot === 'hands' || slot === 'base') {
      return ['PACK_EXTRA_INSULATION', 'SHORT_COLD_SEGMENT', 'WARDROBE_GAP'];
    }
    return ['WARDROBE_GAP'];
  }
  switch (slot) {
    case 'shell':
    case 'legs':
      return [
        'MILD_CONDITIONS',
        ...MC_COLD,
        'HIGH_WIND_EXPOSURE',
        'RAIN_PROTECTION_REQUIRED',
        ...MC_CONFIG,
        'WARDROBE_GAP',
      ];
    case 'hands':
      return [...MC_COLD, 'HIGH_WIND_EXPOSURE', ...MC_CONFIG, 'WARDROBE_GAP'];
    case 'rain':
      return [
        'RAIN_PROTECTION_REQUIRED',
        'WATERPROOF_LINER_RECOMMENDED',
        'WARDROBE_GAP',
      ];
    case 'mid':
    case 'base':
    case 'head':
    case 'feet':
      return [...MC_COLD, ...MC_CONFIG, 'WARDROBE_GAP'];
    default:
      return ['WARDROBE_GAP'];
  }
}

function cyclingAllow(mode: 'wear' | 'pack', slot: string): readonly string[] {
  if (mode === 'pack') {
    if (slot === 'rain') return ['PACK_RAIN_LAYER', 'WARDROBE_GAP'];
    if (slot === 'mid') return ['SHORT_COLD_SEGMENT', 'WARDROBE_GAP'];
    if (slot === 'shell') return ['VENT_OR_PACK_SHELL', 'WARDROBE_GAP'];
    return ['WARDROBE_GAP'];
  }
  switch (slot) {
    case 'base':
      return ['MILD_CONDITIONS', 'SUSTAINED_COLD_EXPOSURE', 'WARDROBE_GAP'];
    case 'mid':
      return ['SUSTAINED_COLD_EXPOSURE', 'WARDROBE_GAP'];
    case 'shell':
      return [
        'SUSTAINED_COLD_EXPOSURE',
        'HIGH_WIND_EXPOSURE',
        'RAIN_PROTECTION_REQUIRED',
        'VENT_OR_PACK_SHELL',
        'WARDROBE_GAP',
      ];
    case 'legs':
      return [
        'MILD_CONDITIONS',
        'SUSTAINED_COLD_EXPOSURE',
        'RAIN_PROTECTION_REQUIRED',
        'WARDROBE_GAP',
      ];
    case 'hands':
      return [
        'SUSTAINED_COLD_EXPOSURE',
        'HIGH_WIND_EXPOSURE',
        'HANDS_WIND_CHILL',
        'WARDROBE_GAP',
      ];
    case 'feet':
      return [
        'SUSTAINED_COLD_EXPOSURE',
        'RAIN_PROTECTION_REQUIRED',
        'FEET_LIMITING_ZONE',
        'WARDROBE_GAP',
      ];
    case 'head':
      return ['SUSTAINED_COLD_EXPOSURE', 'HIGH_WIND_EXPOSURE', 'WARDROBE_GAP'];
    case 'rain':
      return ['RAIN_PROTECTION_REQUIRED', 'WARDROBE_GAP'];
    default:
      return ['WARDROBE_GAP'];
  }
}

function alpineAllow(mode: 'wear' | 'pack', slot: string): readonly string[] {
  const kitRule = ['UPPER_MOUNTAIN_SETS_KIT', 'STAYING_AT_BASE', 'WARDROBE_GAP'];
  if (mode === 'pack') {
    if (slot === 'lighter_mid') return ['TEMPERATURE_SPREAD', 'WARDROBE_GAP'];
    if (slot === 'mid' || slot === 'shell') return kitRule;
    return ['WARDROBE_GAP'];
  }
  if (['shell', 'legs', 'hands', 'head', 'neck'].includes(slot)) {
    return [...kitRule, 'HIGH_WIND_AT_UPPER'];
  }
  return kitRule;
}

function xcAllow(mode: 'wear' | 'pack', slot: string): readonly string[] {
  if (mode === 'pack') {
    if (slot === 'shell') return ['PACK_SHELL', 'WARDROBE_GAP'];
    if (slot === 'mid' || slot === 'overmitts') {
      return ['SHORT_COLD_STOP_PACKED', 'WARDROBE_GAP'];
    }
    return ['WARDROBE_GAP'];
  }
  switch (slot) {
    case 'base':
      return [
        'MILD_CONDITIONS',
        'SUSTAINED_COLD_EXPOSURE',
        'CLIMB_REDUCES_WORN_DEMAND',
        'WARDROBE_GAP',
      ];
    case 'mid':
      return ['SUSTAINED_COLD_EXPOSURE', 'VENTS_FOR_CLIMB', 'WARDROBE_GAP'];
    case 'shell':
      return [
        'SUSTAINED_COLD_EXPOSURE',
        'HIGH_WIND_EXPOSURE',
        'RAIN_PROTECTION_REQUIRED',
        'VENTS_FOR_CLIMB',
        'WARDROBE_GAP',
      ];
    case 'hands':
    case 'head':
      return ['SUSTAINED_COLD_EXPOSURE', 'HIGH_WIND_EXPOSURE', 'WARDROBE_GAP'];
    case 'legs':
    case 'feet':
      return ['SUSTAINED_COLD_EXPOSURE', 'MILD_CONDITIONS', 'WARDROBE_GAP'];
    default:
      return ['WARDROBE_GAP'];
  }
}
