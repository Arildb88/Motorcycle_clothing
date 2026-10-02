import {
  demoGarmentMatchesCategory,
  demoSeedsForCategory,
  engineActivityTags,
  isGarmentAvailableForActivity,
  normalizeGarmentActivityTags,
  parseStoredSharedCategories,
  prepareRecommendationWardrobe,
} from './wardrobe-sharing';

const sharedAll = ['cycling', 'alpine_snowboard', 'xc_skiing'] as const;
const sharedCycleXc = ['cycling', 'xc_skiing'] as const;

function garment(
  name: string,
  tags: string[],
  isDemo = false,
  category = 'shell_jacket',
) {
  return {
    id: name,
    name,
    category,
    layer: 'outer',
    primaryBodyZone: 'torso',
    warmthTier: 3,
    windResistTier: 4,
    waterResistTier: 3,
    breathabilityTier: 3,
    material: 'textile',
    hasVentilation: false,
    isHeated: false,
    activityTags: tags,
    isDemo,
    components: [],
  };
}

describe('wardrobe sharing rules', () => {
  it('rejects motorcycle membership mixed with any other activity', () => {
    expect(() =>
      normalizeGarmentActivityTags(['motorcycle', 'cycling']),
    ).toThrow(/Motorcycle/);
    expect(() =>
      normalizeGarmentActivityTags(['snowboarding', 'motorcycle']),
    ).toThrow(/Motorcycle/);
    expect(normalizeGarmentActivityTags(['motorcycle'])).toEqual([
      'motorcycle',
    ]);
    expect(normalizeGarmentActivityTags()).toEqual(['motorcycle']);
  });

  it('rejects hiking and stores resort membership as both snow sports', () => {
    expect(() => normalizeGarmentActivityTags(['hiking'])).toThrow(/Hiking/);
    expect(normalizeGarmentActivityTags(['alpine_skiing'])).toEqual([
      'alpine_skiing',
      'snowboarding',
    ]);
    expect(normalizeGarmentActivityTags(['cycling', 'xc_skiing'])).toEqual([
      'cycling',
      'xc_skiing',
    ]);
  });

  it('drops motorcycle from a stored sharing set', () => {
    expect(
      parseStoredSharedCategories([
        'motorcycle',
        'cycling',
        'hiking',
        'xc_skiing',
        'xc_skiing',
      ]),
    ).toEqual(['cycling', 'xc_skiing']);
  });

  it('keeps motorcycle clothes unavailable to every other activity', () => {
    const jacket = garment('MC shell', ['motorcycle']);
    expect(
      isGarmentAvailableForActivity(jacket, 'motorcycle', sharedAll),
    ).toBe(true);
    for (const activity of ['cycling', 'alpine_skiing', 'snowboarding', 'xc_skiing']) {
      expect(
        isGarmentAvailableForActivity(jacket, activity, sharedAll),
      ).toBe(false);
    }
    expect(isGarmentAvailableForActivity(jacket, 'hiking', [])).toBe(false);
  });

  it('keeps non-motorcycle clothes unavailable to motorcycle', () => {
    const jersey = garment('Jersey', ['cycling']);
    const resort = garment('Shell', ['alpine_skiing', 'snowboarding']);
    const xc = garment('Tights', ['xc_skiing'], false, 'pants');
    for (const item of [jersey, resort, xc]) {
      expect(
        isGarmentAvailableForActivity(item, 'motorcycle', sharedAll),
      ).toBe(false);
    }
  });

  it('keeps separate non-motorcycle wardrobes isolated until the user shares them', () => {
    const jersey = garment('Jersey', ['cycling']);
    expect(isGarmentAvailableForActivity(jersey, 'cycling', [])).toBe(true);
    expect(isGarmentAvailableForActivity(jersey, 'xc_skiing', [])).toBe(false);
    expect(
      isGarmentAvailableForActivity(jersey, 'alpine_skiing', sharedCycleXc),
    ).toBe(false);
    expect(
      isGarmentAvailableForActivity(jersey, 'xc_skiing', sharedCycleXc),
    ).toBe(true);
    expect(
      isGarmentAvailableForActivity(jersey, 'snowboarding', sharedAll),
    ).toBe(true);
  });

  it('treats alpine skiing and snowboarding as one wardrobe without a sharing choice', () => {
    const shell = garment('Resort shell', ['alpine_skiing']);
    expect(isGarmentAvailableForActivity(shell, 'snowboarding', [])).toBe(true);
    expect(isGarmentAvailableForActivity(shell, 'alpine_skiing', [])).toBe(true);
    expect(isGarmentAvailableForActivity(shell, 'cycling', [])).toBe(false);
  });

  it('does not let demo clothes follow personal wardrobe sharing', () => {
    const demo = garment('Demo – Alpin skalljakke', ['alpine_skiing', 'snowboarding'], true);
    expect(isGarmentAvailableForActivity(demo, 'alpine_skiing', sharedAll)).toBe(
      true,
    );
    expect(isGarmentAvailableForActivity(demo, 'snowboarding', sharedAll)).toBe(
      true,
    );
    expect(isGarmentAvailableForActivity(demo, 'cycling', sharedAll)).toBe(false);
    expect(isGarmentAvailableForActivity(demo, 'xc_skiing', sharedAll)).toBe(
      false,
    );
    expect(isGarmentAvailableForActivity(demo, 'motorcycle', sharedAll)).toBe(
      false,
    );
  });

  it('filters recommendation wardrobes and retags only shared personal clothes', () => {
    const wardrobe = [
      garment('MC shell', ['motorcycle']),
      garment('Jersey', ['cycling']),
      garment('Demo – Sykkelcaps', ['cycling'], true, 'headwear'),
      garment('Demo – Alpin skalljakke', ['alpine_skiing', 'snowboarding'], true),
      garment('My fleece', ['alpine_skiing', 'snowboarding'], false, 'mid_layer'),
    ];

    const motorcycle = prepareRecommendationWardrobe(wardrobe, 'motorcycle', sharedAll);
    expect(motorcycle.map((item) => item.name)).toEqual(['MC shell']);

    const cycling = prepareRecommendationWardrobe(wardrobe, 'cycling', sharedCycleXc);
    expect(cycling.map((item) => item.name)).toEqual([
      'Jersey',
      'Demo – Sykkelcaps',
    ]);

    const sharedCycling = prepareRecommendationWardrobe(
      wardrobe,
      'cycling',
      sharedAll,
    );
    expect(sharedCycling.map((item) => item.name)).toEqual([
      'Jersey',
      'Demo – Sykkelcaps',
      'My fleece',
    ]);
    expect(
      sharedCycling.find((item) => item.name === 'My fleece')?.activityTags,
    ).toEqual(expect.arrayContaining(['cycling', 'alpine_skiing', 'snowboarding']));
    expect(
      sharedCycling.find((item) => item.name === 'Demo – Alpin skalljakke'),
    ).toBeUndefined();

    const xc = prepareRecommendationWardrobe(wardrobe, 'xc_skiing', sharedAll);
    expect(xc.map((item) => item.name)).toEqual(['Jersey', 'My fleece']);
    expect(xc.every((item) => item.activityTags.includes('xc_skiing'))).toBe(
      true,
    );
  });

  it('seeds one demo set per category and keeps resort clothes together', () => {
    const motorcycle = demoSeedsForCategory('motorcycle', 'nb');
    const cycling = demoSeedsForCategory('cycling', 'en');
    const resort = demoSeedsForCategory('alpine_snowboard', 'nb');
    const xc = demoSeedsForCategory('xc_skiing', 'en');
    expect(motorcycle.length).toBeGreaterThan(0);
    expect(cycling.length).toBeGreaterThan(0);
    expect(resort.length).toBeGreaterThan(0);
    expect(xc.length).toBeGreaterThan(0);
    expect(motorcycle.some((seed) => seed.name === 'Demo – Touringjakke')).toBe(
      true,
    );
    expect(resort.some((seed) => seed.name === 'Demo – Alpin ulltrøye')).toBe(
      true,
    );
    expect(
      resort.every((seed) =>
        demoGarmentMatchesCategory(
          seed.activityTags ?? [],
          'alpine_snowboard',
        ),
      ),
    ).toBe(true);
    expect(
      cycling.some((seed) =>
        (seed.activityTags ?? []).includes('alpine_skiing'),
      ),
    ).toBe(false);
    const names = new Set(
      [...motorcycle, ...cycling, ...resort, ...xc].map((seed) => seed.name),
    );
    expect(names.size).toBe(
      motorcycle.length + cycling.length + resort.length + xc.length,
    );
  });

  it('gives each engine only clothes that activity may use', () => {
    const wardrobe = [
      garment('MC shell', ['motorcycle']),
      garment('Jersey', ['cycling']),
      garment('Demo alpine', ['alpine_skiing', 'snowboarding'], true),
      garment('Shared fleece', ['xc_skiing']),
    ];
    const cases = [
      ['motorcycle', sharedAll, ['MC shell']],
      ['cycling', [] as string[], ['Jersey']],
      ['cycling', [...sharedAll], ['Jersey', 'Shared fleece']],
      ['snowboarding', [] as string[], ['Demo alpine']],
      ['xc_skiing', [...sharedCycleXc], ['Jersey', 'Shared fleece']],
    ] as const;
    for (const [activity, shared, names] of cases) {
      const prepared = prepareRecommendationWardrobe(wardrobe, activity, shared);
      expect(prepared.map((item) => item.name)).toEqual([...names]);
      for (const item of prepared) {
        const tags = engineActivityTags(item, activity, shared);
        expect(tags).not.toBeNull();
        if (activity === 'motorcycle') {
          expect(tags).toEqual(['motorcycle']);
        } else {
          expect(tags).not.toContain('motorcycle');
        }
      }
    }
  });
});
