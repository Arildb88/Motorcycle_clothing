/**
 * Shared garment catalogue.
 *
 * Identity is an exact normalized brand + model + category + variant.
 * Histograms store how many times each score 1–5 was explicitly submitted.
 * They do not store who submitted them.
 *
 * Trimming drops one lowest and one highest occurrence before the mean.
 * That reduces the pull of extremes. It does not identify distinct people
 * and it is not fraud resistance.
 */

export const CATALOGUE_METRICS = ['warmth', 'wind', 'water'] as const;
export type CatalogueMetric = (typeof CATALOGUE_METRICS)[number];

export const CATALOGUE_SAMPLE_THRESHOLD = 5;
export const CATALOGUE_SUBMISSION_TTL_MS = 10 * 60 * 1000;

export const CURATED_BRANDS = [
  'Alpinestars',
  'Dainese',
  "REV'IT!",
  'Klim',
  'Rukka',
  'Halvarssons',
  'Lindstrands',
  'Held',
  'RST',
  'Furygan',
  'Ixon',
  'Spidi',
  'TCX',
  'Sidi',
  'Forma',
  'Scott',
  'Castelli',
  'Assos',
  'Rapha',
  'Norrøna',
  'Helly Hansen',
  'Peak Performance',
  'Swix',
  'Craft',
] as const;

export type CuratedProduct = {
  brand: string;
  model: string;
  category: string;
  activityScope: string;
  heated: boolean;
  linerKey: string;
  materialKey: string;
  /** Curated lookup name. Never copied from a personal garment name. */
  curatedName: string;
};

/**
 * Searchable product identities. No warmth, wind, or water measurements.
 * These are not verified manufacturer data.
 */
export const CURATED_PRODUCTS: readonly CuratedProduct[] = [
  {
    brand: 'Klim',
    model: 'Badlands Pro',
    category: 'shell_jacket',
    activityScope: 'motorcycle',
    heated: false,
    linerKey: 'none',
    materialKey: 'textile',
    curatedName: 'Klim Badlands Pro',
  },
  {
    brand: 'Klim',
    model: 'Badlands Pro',
    category: 'shell_jacket',
    activityScope: 'motorcycle',
    heated: false,
    linerKey: 'thermal_liner,waterproof_liner',
    materialKey: 'textile',
    curatedName: 'Klim Badlands Pro with liners',
  },
  {
    brand: "REV'IT!",
    model: 'Sand 4',
    category: 'shell_jacket',
    activityScope: 'motorcycle',
    heated: false,
    linerKey: 'none',
    materialKey: 'textile',
    curatedName: "REV'IT! Sand 4",
  },
  {
    brand: "REV'IT!",
    model: 'Sand 5',
    category: 'shell_jacket',
    activityScope: 'motorcycle',
    heated: false,
    linerKey: 'none',
    materialKey: 'textile',
    curatedName: "REV'IT! Sand 5",
  },
  {
    brand: 'Klim',
    model: 'Inferno',
    category: 'gloves',
    activityScope: 'motorcycle',
    heated: true,
    linerKey: 'none',
    materialKey: 'textile',
    curatedName: 'Klim Inferno heated gloves',
  },
  {
    brand: 'Klim',
    model: 'Inferno',
    category: 'gloves',
    activityScope: 'motorcycle',
    heated: false,
    linerKey: 'none',
    materialKey: 'textile',
    curatedName: 'Klim Inferno gloves',
  },
  {
    brand: 'Dainese',
    model: 'Carve Master 3',
    category: 'shell_jacket',
    activityScope: 'motorcycle',
    heated: false,
    linerKey: 'none',
    materialKey: 'textile',
    curatedName: 'Dainese Carve Master 3',
  },
  {
    brand: 'Castelli',
    model: 'Perfetto RoS 2',
    category: 'shell_jacket',
    activityScope: 'cycling',
    heated: false,
    linerKey: 'none',
    materialKey: 'textile',
    curatedName: 'Castelli Perfetto RoS 2',
  },
  {
    brand: 'Scott',
    model: 'Patrol',
    category: 'shell_jacket',
    activityScope: 'motorcycle',
    heated: false,
    linerKey: 'none',
    materialKey: 'textile',
    curatedName: 'Scott Patrol',
  },
  {
    brand: 'Scott',
    model: 'Patrol',
    category: 'shell_jacket',
    activityScope: 'cycling',
    heated: false,
    linerKey: 'none',
    materialKey: 'textile',
    curatedName: 'Scott Patrol cycling jacket',
  },
  {
    brand: 'Craft',
    model: 'Core',
    category: 'base_layer',
    activityScope: 'xc_skiing',
    heated: false,
    linerKey: 'none',
    materialKey: 'synthetic',
    curatedName: 'Craft Core',
  },
  {
    brand: 'Norrøna',
    model: 'Lofoten',
    category: 'shell_jacket',
    activityScope: 'alpine_skiing,snowboarding',
    heated: false,
    linerKey: 'none',
    materialKey: 'textile',
    curatedName: 'Norrøna Lofoten',
  },
];

export type CatalogueIdentity = {
  brandKey: string;
  modelKey: string;
  category: string;
  activityScope: string;
  heated: boolean;
  linerKey: string;
  materialKey: string;
};

export type Histogram = Record<1 | 2 | 3 | 4 | 5, number>;

export type CatalogueCounts = Record<
  | 'warmth1'
  | 'warmth2'
  | 'warmth3'
  | 'warmth4'
  | 'warmth5'
  | 'wind1'
  | 'wind2'
  | 'wind3'
  | 'wind4'
  | 'wind5'
  | 'water1'
  | 'water2'
  | 'water3'
  | 'water4'
  | 'water5',
  number
>;

const SCORE_VALUES = [1, 2, 3, 4, 5] as const;

export function emptyHistogram(): Histogram {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

export function emptyCatalogueCounts(): CatalogueCounts {
  return {
    warmth1: 0,
    warmth2: 0,
    warmth3: 0,
    warmth4: 0,
    warmth5: 0,
    wind1: 0,
    wind2: 0,
    wind3: 0,
    wind4: 0,
    wind5: 0,
    water1: 0,
    water2: 0,
    water3: 0,
    water4: 0,
    water5: 0,
  };
}

/** Case and surrounding/repeated whitespace only. Punctuation stays. */
export function normalizeIdentity(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function curatedBrand(value: string): string | null {
  const key = normalizeIdentity(value);
  if (!key) return null;
  return (
    CURATED_BRANDS.find((brand) => normalizeIdentity(brand) === key) ?? null
  );
}

export function activityScopeKey(tags: readonly string[]): string {
  const unique = [
    ...new Set(tags.map((tag) => tag.trim()).filter(Boolean)),
  ].sort();
  if (unique.includes('motorcycle')) return 'motorcycle';
  return unique.join(',');
}

export function linerKeyFromKinds(kinds: readonly string[]): string {
  const liners = [
    ...new Set(
      kinds.filter(
        (kind) => kind === 'thermal_liner' || kind === 'waterproof_liner',
      ),
    ),
  ].sort();
  return liners.length > 0 ? liners.join(',') : 'none';
}

export function materialKeyFrom(material: string | null | undefined): string {
  const trimmed = material?.trim();
  return trimmed ? trimmed.toLowerCase() : 'unspecified';
}

export function histogramTotal(histogram: Histogram): number {
  return SCORE_VALUES.reduce((sum, score) => sum + histogram[score], 0);
}

/**
 * Remove one lowest occurrence and one highest occurrence, then average the rest.
 * When every value is equal, both removals come from that single score.
 * Returns null below five contributions.
 */
export function trimmedMean(histogram: Histogram): number | null {
  const total = histogramTotal(histogram);
  if (total < CATALOGUE_SAMPLE_THRESHOLD) return null;
  const lowest = SCORE_VALUES.find((score) => histogram[score] > 0);
  const highest = [...SCORE_VALUES]
    .reverse()
    .find((score) => histogram[score] > 0);
  if (lowest === undefined || highest === undefined) return null;
  const next: Histogram = { ...histogram, [lowest]: histogram[lowest] - 1 };
  next[highest] -= 1;
  let weighted = 0;
  let count = 0;
  for (const score of SCORE_VALUES) {
    if (next[score] < 0) return null;
    weighted += score * next[score];
    count += next[score];
  }
  if (count <= 0) return null;
  return weighted / count;
}

/** Round halves toward +infinity. 2.5 becomes 3. */
export function roundHalfUp(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Catalogue average is not finite');
  }
  return Math.floor(value + 0.5);
}

export function histogramFromCounts(
  counts: CatalogueCounts,
  metric: CatalogueMetric,
): Histogram {
  return {
    1: counts[`${metric}1`],
    2: counts[`${metric}2`],
    3: counts[`${metric}3`],
    4: counts[`${metric}4`],
    5: counts[`${metric}5`],
  };
}

export type MetricEstimate = {
  source: 'community' | 'fallback';
  sampleCount: number;
  estimate: number | null;
  rounded: number | null;
};

export function estimateMetric(histogram: Histogram): MetricEstimate {
  const sampleCount = histogramTotal(histogram);
  const estimate = trimmedMean(histogram);
  if (estimate === null) {
    return { source: 'fallback', sampleCount, estimate: null, rounded: null };
  }
  return {
    source: 'community',
    sampleCount,
    estimate,
    rounded: roundHalfUp(estimate),
  };
}

export function assertContributionScore(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value)
  ) {
    throw new RangeError('Contribution values must be integers from 1 to 5');
  }
  if (value < 1 || value > 5) {
    throw new RangeError('Contribution values must be integers from 1 to 5');
  }
  return value;
}

export function countColumn(
  metric: CatalogueMetric,
  score: number,
): keyof CatalogueCounts {
  const checked = assertContributionScore(score);
  return `${metric}${checked}` as keyof CatalogueCounts;
}

export function mergeCounts(
  base: CatalogueCounts,
  delta: CatalogueCounts,
): CatalogueCounts {
  const next = { ...base };
  for (const key of Object.keys(next) as (keyof CatalogueCounts)[]) {
    next[key] += delta[key];
  }
  return next;
}

/** Stale read/write of one bin. Both writers store the same snapshot + 1. */
export function staleAssignCount(start: number, writes: number): number {
  if (writes <= 0) return start;
  return start + 1;
}

/** Each writer adds one, independent of a shared snapshot. */
export function atomicIncrementCount(start: number, writes: number): number {
  return start + writes;
}

export function identitiesMatch(
  left: CatalogueIdentity,
  right: CatalogueIdentity,
): boolean {
  return (
    left.brandKey === right.brandKey &&
    left.modelKey === right.modelKey &&
    left.category === right.category &&
    left.activityScope === right.activityScope &&
    left.heated === right.heated &&
    left.linerKey === right.linerKey &&
    left.materialKey === right.materialKey
  );
}

export function identityFromProduct(
  product: CuratedProduct,
): CatalogueIdentity {
  return {
    brandKey: normalizeIdentity(product.brand),
    modelKey: normalizeIdentity(product.model),
    category: product.category,
    activityScope: product.activityScope,
    heated: product.heated,
    linerKey: product.linerKey,
    materialKey: product.materialKey,
  };
}

export function buildIdentity(input: {
  brand: string;
  model: string;
  category: string;
  activityTags: readonly string[];
  heated: boolean;
  linerKinds: readonly string[];
  material?: string | null;
}): CatalogueIdentity | null {
  const brand = curatedBrand(input.brand);
  const modelKey = normalizeIdentity(input.model);
  if (!brand || !modelKey) return null;
  return {
    brandKey: normalizeIdentity(brand),
    modelKey,
    category: input.category,
    activityScope: activityScopeKey(input.activityTags),
    heated: input.heated,
    linerKey: linerKeyFromKinds(input.linerKinds),
    materialKey: materialKeyFrom(input.material),
  };
}

/**
 * Name-only match is exact, category-scoped, and variant-scoped.
 * Zero or several curated hits return null.
 */
export function matchCuratedByName(
  input: {
    name: string;
    category: string;
    activityScope: string;
    heated: boolean;
    linerKey: string;
    materialKey: string;
  },
  products: readonly CuratedProduct[] = CURATED_PRODUCTS,
): CuratedProduct | null {
  const nameKey = normalizeIdentity(input.name);
  if (!nameKey) return null;
  const hits = products.filter(
    (product) =>
      normalizeIdentity(product.curatedName) === nameKey &&
      product.category === input.category &&
      product.activityScope === input.activityScope &&
      product.heated === input.heated &&
      product.linerKey === input.linerKey &&
      product.materialKey === input.materialKey,
  );
  return hits.length === 1 ? hits[0] : null;
}

export type CatalogueChoice = {
  brand: string;
  model: string;
  category: string;
  activityScope: string;
  heated: boolean;
  linerKey: string;
  materialKey: string;
  curatedName: string;
};

export function searchCatalogueChoices(input: {
  query?: string;
  brand?: string;
  category?: string;
  activityScope?: string;
  extra?: readonly CatalogueChoice[];
}): { brands: string[]; models: CatalogueChoice[] } {
  const query = normalizeIdentity(input.query ?? '');
  const brandKey = input.brand ? normalizeIdentity(input.brand) : '';
  const visibleBrands = input.brand
    ? CURATED_BRANDS.filter((brand) => normalizeIdentity(brand) === brandKey)
    : CURATED_BRANDS.filter(
        (brand) => !query || normalizeIdentity(brand).includes(query),
      );
  const curated: CatalogueChoice[] = CURATED_PRODUCTS.map((product) => ({
    brand: product.brand,
    model: product.model,
    category: product.category,
    activityScope: product.activityScope,
    heated: product.heated,
    linerKey: product.linerKey,
    materialKey: product.materialKey,
    curatedName: product.curatedName,
  }));
  const models = [...curated, ...(input.extra ?? [])].filter((choice) => {
    if (brandKey && normalizeIdentity(choice.brand) !== brandKey) return false;
    if (input.category && choice.category !== input.category) return false;
    if (input.activityScope && choice.activityScope !== input.activityScope) {
      return false;
    }
    if (!query) return true;
    return (
      normalizeIdentity(choice.model).includes(query) ||
      normalizeIdentity(choice.brand).includes(query) ||
      normalizeIdentity(choice.curatedName).includes(query)
    );
  });
  const unique = new Map<string, CatalogueChoice>();
  for (const choice of models) {
    const key = [
      normalizeIdentity(choice.brand),
      normalizeIdentity(choice.model),
      choice.category,
      choice.activityScope,
      choice.heated ? '1' : '0',
      choice.linerKey,
      choice.materialKey,
    ].join('|');
    if (!unique.has(key)) unique.set(key, choice);
  }
  return {
    brands: [...visibleBrands],
    models: [...unique.values()],
  };
}

/**
 * Remembers submission ids only. The id is a client retry token, not a user.
 * Memory is process-local and expires. It is not unique-user deduplication.
 */
export class CatalogueSubmissionGuard {
  private readonly seen = new Map<string, number>();

  constructor(private readonly ttlMs = CATALOGUE_SUBMISSION_TTL_MS) {}

  claim(submissionId: string, now = Date.now()): boolean {
    this.prune(now);
    const expires = this.seen.get(submissionId);
    if (expires !== undefined && expires > now) return true;
    this.seen.set(submissionId, now + this.ttlMs);
    return false;
  }

  release(submissionId: string): void {
    this.seen.delete(submissionId);
  }

  private prune(now: number): void {
    for (const [id, expires] of this.seen) {
      if (expires <= now) this.seen.delete(id);
    }
  }
}

export const CATALOGUE_LIMITATION =
  'Trimming one highest and one lowest contribution reduces extremes. It is not fraud resistance, and the sample count is not a count of distinct people.';
