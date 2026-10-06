/**
 * Everyday clothes worn under motorcycle protective gear.
 *
 * Warmth values are ordinal credits on the existing 1–5 demand scale.
 * They are explainable engineering constants, not laboratory CLO values.
 *
 * Upper body (torso only):
 * - t_shirt: 1
 * - thin_sweater: 2
 * - wool_base_top: 2, insulating and warmer than a plain T-shirt
 * - thick_sweater: 3, warmer than a thin sweater
 *
 * Lower body (legs only):
 * - jeans: 1
 * - joggers: 2
 * - wool_base_bottom: 2, insulating base that can sit under pants
 *
 * A base piece and a sweater may be worn together. Wool bottoms may be worn
 * under jeans or joggers. Two sweaters, two pants, or a T-shirt plus a wool
 * top would count the same role twice, so only the warmer piece in that role
 * is kept. Combined credit is capped at 5.
 */

export const BASIC_UPPER_PIECES = [
  't_shirt',
  'wool_base_top',
  'thin_sweater',
  'thick_sweater',
] as const;

export const BASIC_LOWER_PIECES = [
  'wool_base_bottom',
  'jeans',
  'joggers',
] as const;

export type BasicUpperPiece = (typeof BASIC_UPPER_PIECES)[number];
export type BasicLowerPiece = (typeof BASIC_LOWER_PIECES)[number];

export type BasicLayerSelection = {
  upper: BasicUpperPiece[];
  lower: BasicLowerPiece[];
};

export type BasicWarmthCredit = {
  torso: number;
  legs: number;
};

export const NO_BASIC_LAYERS: BasicLayerSelection = {
  upper: [],
  lower: [],
};

export const NO_BASIC_WARMTH: BasicWarmthCredit = {
  torso: 0,
  legs: 0,
};

/** Ordinal torso credit. Not a CLO measurement. */
export const BASIC_UPPER_WARMTH: Record<BasicUpperPiece, number> = {
  t_shirt: 1,
  thin_sweater: 2,
  wool_base_top: 2,
  thick_sweater: 3,
};

/** Ordinal leg credit. Not a CLO measurement. */
export const BASIC_LOWER_WARMTH: Record<BasicLowerPiece, number> = {
  wool_base_bottom: 2,
  jeans: 1,
  joggers: 2,
};

const UPPER_BASE: readonly BasicUpperPiece[] = ['t_shirt', 'wool_base_top'];
const UPPER_SWEATER: readonly BasicUpperPiece[] = [
  'thin_sweater',
  'thick_sweater',
];
const LOWER_PANTS: readonly BasicLowerPiece[] = ['jeans', 'joggers'];

const WARMTH_CAP = 5;

export class InvalidBasicLayerError extends Error {
  constructor(readonly token: string) {
    super(`Invalid basic clothing: ${token}`);
    this.name = 'InvalidBasicLayerError';
  }
}

export function parseBasicLayers(
  upper?: string | null,
  lower?: string | null,
): BasicLayerSelection {
  return {
    upper: normalizeUpper(readTokens(upper, BASIC_UPPER_PIECES)),
    lower: normalizeLower(readTokens(lower, BASIC_LOWER_PIECES)),
  };
}

export function normalizeUpper(pieces: readonly string[]): BasicUpperPiece[] {
  const known = pieces.filter(isUpper);
  return canonicalUpper([
    warmerOf(known, UPPER_BASE),
    warmerOf(known, UPPER_SWEATER),
  ]);
}

export function normalizeLower(pieces: readonly string[]): BasicLowerPiece[] {
  const known = pieces.filter(isLower);
  const pants = warmerOf(known, LOWER_PANTS);
  const base = known.includes('wool_base_bottom')
    ? 'wool_base_bottom'
    : undefined;
  return canonicalLower([base, pants]);
}

export function basicLayerWarmth(
  selection: BasicLayerSelection,
): BasicWarmthCredit {
  return {
    torso: capped(
      selection.upper.reduce(
        (sum, piece) => sum + BASIC_UPPER_WARMTH[piece],
        0,
      ),
    ),
    legs: capped(
      selection.lower.reduce(
        (sum, piece) => sum + BASIC_LOWER_WARMTH[piece],
        0,
      ),
    ),
  };
}

export function basicLayersQueryValue(pieces: readonly string[]): string {
  return pieces.join(',');
}

function readTokens<T extends string>(
  raw: string | null | undefined,
  allowed: readonly T[],
): T[] {
  if (raw == null) return [];
  const text = raw.trim().toLowerCase();
  if (text === '' || text === 'none') return [];
  const out: T[] = [];
  for (const part of text.split(',')) {
    const token = part.trim();
    if (token === '' || token === 'none') continue;
    if (!allowed.includes(token as T)) {
      throw new InvalidBasicLayerError(token);
    }
    const known = token as T;
    if (!out.includes(known)) out.push(known);
  }
  return out;
}

function warmerOf<T extends string>(
  selected: readonly T[],
  group: readonly T[],
): T | undefined {
  let best: T | undefined;
  let bestWarmth = -1;
  for (const piece of group) {
    if (!selected.includes(piece)) continue;
    const warmth = warmthOf(piece);
    if (warmth > bestWarmth) {
      best = piece;
      bestWarmth = warmth;
    }
  }
  return best;
}

function warmthOf(piece: string): number {
  if (isUpper(piece)) return BASIC_UPPER_WARMTH[piece];
  if (isLower(piece)) return BASIC_LOWER_WARMTH[piece];
  return 0;
}

function canonicalUpper(
  pieces: Array<BasicUpperPiece | undefined>,
): BasicUpperPiece[] {
  return BASIC_UPPER_PIECES.filter((piece) => pieces.includes(piece));
}

function canonicalLower(
  pieces: Array<BasicLowerPiece | undefined>,
): BasicLowerPiece[] {
  return BASIC_LOWER_PIECES.filter((piece) => pieces.includes(piece));
}

function isUpper(value: string): value is BasicUpperPiece {
  return (BASIC_UPPER_PIECES as readonly string[]).includes(value);
}

function isLower(value: string): value is BasicLowerPiece {
  return (BASIC_LOWER_PIECES as readonly string[]).includes(value);
}

function capped(value: number): number {
  return Math.min(WARMTH_CAP, Math.max(0, value));
}
