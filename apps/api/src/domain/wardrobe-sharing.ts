import { MVP_ACTIVITY_TYPE, type ActivityType, isActivityType } from './enums';
import {
  demoWardrobe,
  type DemoGarmentSeed,
  type DemoLanguage,
} from './demo-wardrobe';

/**
 * User-facing wardrobe domains.
 * Alpine skiing and snowboarding are one resort category.
 * Motorcycle is never shareable. Hiking has no wardrobe.
 */
export const WARDROBE_CATEGORIES = [
  'motorcycle',
  'cycling',
  'alpine_snowboard',
  'xc_skiing',
] as const;

export type WardrobeCategory = (typeof WARDROBE_CATEGORIES)[number];

export const SHAREABLE_WARDROBE_CATEGORIES = [
  'cycling',
  'alpine_snowboard',
  'xc_skiing',
] as const;

export type ShareableWardrobeCategory =
  (typeof SHAREABLE_WARDROBE_CATEGORIES)[number];

const ACTIVITY_CATEGORY: Record<string, WardrobeCategory> = {
  motorcycle: 'motorcycle',
  cycling: 'cycling',
  alpine_skiing: 'alpine_snowboard',
  snowboarding: 'alpine_snowboard',
  xc_skiing: 'xc_skiing',
};

const CATEGORY_ACTIVITIES: Record<WardrobeCategory, ActivityType[]> = {
  motorcycle: ['motorcycle'],
  cycling: ['cycling'],
  alpine_snowboard: ['alpine_skiing', 'snowboarding'],
  xc_skiing: ['xc_skiing'],
};

export function isWardrobeCategory(value: string): value is WardrobeCategory {
  return (WARDROBE_CATEGORIES as readonly string[]).includes(value);
}

export function isShareableWardrobeCategory(
  value: string,
): value is ShareableWardrobeCategory {
  return (SHAREABLE_WARDROBE_CATEGORIES as readonly string[]).includes(value);
}

export function wardrobeCategoryForActivity(
  activity: string,
): WardrobeCategory | null {
  return ACTIVITY_CATEGORY[activity] ?? null;
}

export function activityTagsForCategory(
  category: WardrobeCategory,
): ActivityType[] {
  return [...CATEGORY_ACTIVITIES[category]];
}

export function parseActivityTags(value: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(value ?? '');
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    /* stored default */
  }
  return [MVP_ACTIVITY_TYPE];
}

/** Wardrobe categories implied by stored activity tags. Hiking is ignored. */
export function wardrobeCategoriesOf(tags: readonly string[]): WardrobeCategory[] {
  const found = new Set<WardrobeCategory>();
  for (const tag of tags) {
    const category = wardrobeCategoryForActivity(tag);
    if (category) found.add(category);
  }
  return WARDROBE_CATEGORIES.filter((category) => found.has(category));
}

/**
 * Stored sharing set. Unknown values, motorcycle, and hiking are dropped.
 * Fewer than two categories means personal wardrobes stay separate.
 */
export function parseStoredSharedCategories(
  value: unknown,
): ShareableWardrobeCategory[] {
  let raw: unknown = value;
  if (typeof value === 'string') {
    try {
      raw = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  const picked = new Set<string>();
  for (const item of raw) {
    if (typeof item === 'string' && isShareableWardrobeCategory(item)) {
      picked.add(item);
    }
  }
  return SHAREABLE_WARDROBE_CATEGORIES.filter((category) =>
    picked.has(category),
  );
}

export function sharingIsActive(
  sharedCategories: readonly string[],
): boolean {
  return parseStoredSharedCategories(sharedCategories).length >= 2;
}

/**
 * Persist one garment's activity membership.
 * Motorcycle cannot be combined with any other activity.
 * Hiking is rejected. Resort membership stores both alpine and snowboard.
 */
export function normalizeGarmentActivityTags(tags?: string[]): ActivityType[] {
  if (!tags || tags.length === 0) return ['motorcycle'];
  const normalized = [
    ...new Set(tags.map((tag) => tag.trim()).filter(Boolean)),
  ];
  for (const tag of normalized) {
    if (!isActivityType(tag)) {
      throw new Error(`Invalid activity type: ${tag}`);
    }
    if (tag === 'hiking') {
      throw new Error('Hiking has no wardrobe');
    }
  }
  const categories = wardrobeCategoriesOf(normalized);
  const motorcycle = categories.includes('motorcycle');
  const others = categories.filter((category) => category !== 'motorcycle');
  if (motorcycle && others.length > 0) {
    throw new Error(
      'Motorcycle garments cannot be shared with other activities',
    );
  }
  if (motorcycle) return ['motorcycle'];
  if (categories.length === 0) {
    throw new Error('Invalid activity type: wardrobe');
  }
  return categories.flatMap((category) => activityTagsForCategory(category));
}

export function isGarmentAvailableForActivity(
  garment: { activityTags: readonly string[]; isDemo?: boolean },
  activity: string,
  sharedCategories: readonly string[],
): boolean {
  const target = wardrobeCategoryForActivity(activity);
  if (!target) return false;
  const categories = wardrobeCategoriesOf(garment.activityTags);
  const motorcycle = categories.includes('motorcycle');
  const others = categories.filter((category) => category !== 'motorcycle');
  if (motorcycle && others.length > 0) return false;
  if (target === 'motorcycle') return motorcycle && others.length === 0;
  if (motorcycle) return false;
  if (garment.isDemo === true) {
    return categories.length === 1 && categories[0] === target;
  }
  if (categories.includes(target)) return true;
  const shared = parseStoredSharedCategories(sharedCategories);
  if (shared.length < 2 || !shared.includes(target as ShareableWardrobeCategory)) {
    return false;
  }
  return categories.some((category) =>
    shared.includes(category as ShareableWardrobeCategory),
  );
}

/**
 * Tags passed into an existing recommendation engine.
 * Personal garments shared into the target activity gain that activity's tags
 * in memory only. Demo garments never gain another category's tags.
 * Returns null when the garment must not be used.
 */
export function engineActivityTags(
  garment: { activityTags: readonly string[]; isDemo?: boolean },
  activity: string,
  sharedCategories: readonly string[],
): string[] | null {
  if (!isGarmentAvailableForActivity(garment, activity, sharedCategories)) {
    return null;
  }
  const target = wardrobeCategoryForActivity(activity);
  if (!target) return null;
  if (target === 'motorcycle') return ['motorcycle'];
  const tags = garment.activityTags.filter((tag) => tag !== 'motorcycle');
  for (const tag of activityTagsForCategory(target)) {
    if (!tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

export function prepareRecommendationWardrobe<
  T extends { activityTags: string[]; isDemo?: boolean },
>(
  garments: T[],
  activity: string,
  sharedCategories: readonly string[],
): T[] {
  const prepared: T[] = [];
  for (const garment of garments) {
    const tags = engineActivityTags(garment, activity, sharedCategories);
    if (!tags) continue;
    prepared.push({ ...garment, activityTags: tags });
  }
  return prepared;
}

export function demoSeedsForCategory(
  category: WardrobeCategory,
  language: DemoLanguage,
): DemoGarmentSeed[] {
  return demoWardrobe(language).filter((seed) => {
    const categories = wardrobeCategoriesOf(seed.activityTags ?? []);
    return categories.length === 1 && categories[0] === category;
  });
}

export function demoGarmentMatchesCategory(
  tags: readonly string[],
  category: WardrobeCategory,
): boolean {
  const categories = wardrobeCategoriesOf(tags);
  return categories.length === 1 && categories[0] === category;
}
