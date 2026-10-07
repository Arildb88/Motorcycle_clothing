import {
  CatalogueCounts,
  CatalogueSubmissionGuard,
  assertContributionScore,
  atomicIncrementCount,
  buildIdentity,
  emptyCatalogueCounts,
  emptyHistogram,
  estimateMetric,
  histogramFromCounts,
  matchCuratedByName,
  mergeCounts,
  normalizeIdentity,
  roundHalfUp,
  searchCatalogueChoices,
  staleAssignCount,
  trimmedMean,
} from './garment-catalogue';

describe('garment catalogue math', () => {
  it('normalizes case and whitespace without merging distinct models', () => {
    expect(normalizeIdentity('  Klim   Badlands ')).toBe('klim badlands');
    expect(normalizeIdentity('Sand 4')).not.toBe(normalizeIdentity('Sand4'));
    expect(normalizeIdentity("REV'IT!")).toBe("rev'it!");
    expect(normalizeIdentity("REV'IT!")).not.toBe(normalizeIdentity('Revit'));
  });

  it('keeps motorcycle, heated, and liner variants apart', () => {
    const shell = {
      category: 'shell_jacket',
      activityTags: ['motorcycle'],
      heated: false,
      linerKinds: [],
      material: 'textile',
    };
    const base = buildIdentity({
      brand: ' klim ',
      model: ' Badlands   Pro ',
      ...shell,
    });
    const heated = buildIdentity({
      brand: 'Klim',
      model: 'Badlands Pro',
      ...shell,
      heated: true,
    });
    const lined = buildIdentity({
      brand: 'Klim',
      model: 'Badlands Pro',
      ...shell,
      linerKinds: ['waterproof_liner', 'thermal_liner'],
    });
    const cycling = buildIdentity({
      brand: 'Scott',
      model: 'Patrol',
      ...shell,
      activityTags: ['cycling'],
    });
    const motorcycle = buildIdentity({
      brand: 'Scott',
      model: 'Patrol',
      ...shell,
    });
    const nextGeneration = buildIdentity({
      brand: "REV'IT!",
      model: 'Sand 5',
      ...shell,
    });
    const previousGeneration = buildIdentity({
      brand: "rev'it!",
      model: 'sand 4',
      ...shell,
    });
    expect(base?.brandKey).toBe('klim');
    expect(base?.modelKey).toBe('badlands pro');
    expect(base).not.toEqual(heated);
    expect(base).not.toEqual(lined);
    expect(lined?.linerKey).toBe('thermal_liner,waterproof_liner');
    expect(cycling?.activityScope).toBe('cycling');
    expect(motorcycle?.activityScope).toBe('motorcycle');
    expect(cycling).not.toEqual(motorcycle);
    expect(nextGeneration?.modelKey).not.toBe(previousGeneration?.modelKey);
    expect(
      buildIdentity({ brand: 'Not A Brand', model: 'X', ...shell }),
    ).toBeNull();
  });

  it('matches a curated name only inside one category and variant', () => {
    const hit = matchCuratedByName({
      name: '  klim   badlands pro ',
      category: 'shell_jacket',
      activityScope: 'motorcycle',
      heated: false,
      linerKey: 'none',
      materialKey: 'textile',
    });
    expect(hit?.model).toBe('Badlands Pro');
    expect(
      matchCuratedByName({
        name: 'Klim Badlands Pro',
        category: 'gloves',
        activityScope: 'motorcycle',
        heated: false,
        linerKey: 'none',
        materialKey: 'textile',
      }),
    ).toBeNull();
    expect(
      matchCuratedByName({
        name: 'Klim Badlands Pro',
        category: 'shell_jacket',
        activityScope: 'cycling',
        heated: false,
        linerKey: 'none',
        materialKey: 'textile',
      }),
    ).toBeNull();
    expect(
      matchCuratedByName({
        name: 'my secret jacket',
        category: 'shell_jacket',
        activityScope: 'motorcycle',
        heated: false,
        linerKey: 'none',
        materialKey: 'textile',
      }),
    ).toBeNull();
    expect(
      matchCuratedByName(
        {
          name: 'Same Name',
          category: 'shell_jacket',
          activityScope: 'motorcycle',
          heated: false,
          linerKey: 'none',
          materialKey: 'textile',
        },
        [
          {
            brand: 'Klim',
            model: 'One',
            category: 'shell_jacket',
            activityScope: 'motorcycle',
            heated: false,
            linerKey: 'none',
            materialKey: 'textile',
            curatedName: 'Same Name',
          },
          {
            brand: 'Klim',
            model: 'Two',
            category: 'shell_jacket',
            activityScope: 'motorcycle',
            heated: false,
            linerKey: 'none',
            materialKey: 'textile',
            curatedName: 'Same Name',
          },
        ],
      ),
    ).toBeNull();
  });

  it('trims one lowest and one highest occurrence, including ties and all-equal values', () => {
    expect(trimmedMean(histogram(1, 1, 1, 1))).toBeNull();
    expect(trimmedMean(histogram(1, 2, 3, 4, 5))).toBe(3);
    expect(trimmedMean(histogram(3, 3, 3, 3, 3))).toBe(3);
    expect(trimmedMean(histogram(1, 1, 3, 5, 5))).toBe(3);
    expect(trimmedMean(histogram(2, 2, 2, 4, 4))).toBeCloseTo(8 / 3);
    expect(trimmedMean(histogram(1, 2, 2, 3, 3, 4))).toBe(2.5);
  });

  it('rounds half up and keeps each metric count separate', () => {
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(2.49)).toBe(2);
    expect(roundHalfUp(3.5)).toBe(4);
    const counts = emptyCatalogueCounts();
    for (const score of [1, 2, 2, 3, 3, 4]) {
      counts[`warmth${score}`] += 1;
    }
    for (const score of [5, 5, 5]) counts[`wind${score}`] += 1;
    const warmth = estimateMetric(histogramFromCounts(counts, 'warmth'));
    const wind = estimateMetric(histogramFromCounts(counts, 'wind'));
    expect(warmth).toMatchObject({
      source: 'community',
      sampleCount: 6,
      estimate: 2.5,
      rounded: 3,
    });
    expect(wind).toMatchObject({
      source: 'fallback',
      sampleCount: 3,
      estimate: null,
      rounded: null,
    });
  });

  it('rejects out-of-range contribution scores instead of clamping them', () => {
    expect(() => assertContributionScore(0)).toThrow(RangeError);
    expect(() => assertContributionScore(6)).toThrow(RangeError);
    expect(() => assertContributionScore(1.5)).toThrow(RangeError);
    expect(() => assertContributionScore(Number.NaN)).toThrow(RangeError);
    expect(() => assertContributionScore(Number.POSITIVE_INFINITY)).toThrow(
      RangeError,
    );
    expect(assertContributionScore(5)).toBe(5);
  });

  it('sums atomic increments and keeps a stale assignment at one', () => {
    expect(staleAssignCount(0, 2)).toBe(1);
    expect(atomicIncrementCount(0, 2)).toBe(2);
    const start = emptyCatalogueCounts();
    const once = bump(start, 'warmth3');
    const twice = mergeCounts(once, bump(emptyCatalogueCounts(), 'warmth3'));
    expect(twice.warmth3).toBe(2);
  });

  it('treats a repeated submission id as a duplicate until it expires', () => {
    const guard = new CatalogueSubmissionGuard(1000);
    expect(guard.claim('retry-token', 0)).toBe(false);
    expect(guard.claim('retry-token', 500)).toBe(true);
    expect(guard.claim('retry-token', 1000)).toBe(false);
  });

  it('searches curated brands and models without returning measurements', () => {
    const found = searchCatalogueChoices({
      query: 'badlands',
      category: 'shell_jacket',
      activityScope: 'motorcycle',
    });
    expect(found.models.map((model) => model.model)).toEqual([
      'Badlands Pro',
      'Badlands Pro',
    ]);
    expect(JSON.stringify(found)).not.toMatch(/warmth|sampleCount|wind1/);
    const brands = searchCatalogueChoices({ query: 'kli' });
    expect(brands.brands).toContain('Klim');
    expect(brands.brands).not.toContain('Castelli');
  });
});

function histogram(...scores: number[]) {
  const values = emptyHistogram();
  for (const score of scores) {
    values[score as 1 | 2 | 3 | 4 | 5] += 1;
  }
  return values;
}

function bump(
  counts: CatalogueCounts,
  field: keyof CatalogueCounts,
): CatalogueCounts {
  return { ...counts, [field]: counts[field] + 1 };
}
