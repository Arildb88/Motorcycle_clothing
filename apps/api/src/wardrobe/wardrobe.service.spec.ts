import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WardrobeService } from './wardrobe.service';
import { PrismaService } from '../prisma/prisma.service';
import { effectiveGarmentTiers } from '../domain';
import { CreateGarmentDto } from './dto/create-garment.dto';
import { UpdateGarmentDto } from './dto/update-garment.dto';

describe('WardrobeService', () => {
  let service: WardrobeService;
  const store: Record<string, unknown>[] = [];
  const components: Record<string, unknown>[] = [];
  const profiles = new Map<string, string>();
  let seq = 0;

  const prismaMock = {
    garment: {
      findMany: jest.fn(async ({ where }: { where: { userId: string } }) =>
        store
          .filter((g) => g.userId === where.userId)
          .map((g) => ({
            ...g,
            components: components.filter((c) => c.garmentId === g.id),
          })),
      ),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
        const g = store.find((x) => x.id === where.id);
        if (!g) return null;
        return {
          ...g,
          components: components.filter((c) => c.garmentId === g.id),
        };
      }),
      create: jest.fn(
        async ({
          data,
        }: {
          data: Record<string, unknown> & {
            components?: { create: Array<Record<string, unknown>> };
          };
        }) => {
          const row = {
            id: `g_${++seq}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            material: null,
            hasVentilation: false,
            isHeated: false,
            isDemo: false,
            ...data,
          };
          delete (row as { components?: unknown }).components;
          store.push(row);
          for (const c of data.components?.create ?? []) {
            components.push({
              id: `c_${++seq}`,
              garmentId: row.id,
              ...c,
            });
          }
          return {
            ...row,
            components: components.filter((c) => c.garmentId === row.id),
          };
        },
      ),
      createMany: jest.fn(async ({ data }: { data: Record<string, unknown>[] }) => {
        for (const d of data) {
          store.push({
            id: `g_${++seq}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            material: null,
            hasVentilation: false,
            isHeated: false,
            isDemo: false,
            ...d,
          });
        }
        return { count: data.length };
      }),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const idx = store.findIndex((g) => g.id === where.id);
          store[idx] = {
            ...store[idx],
            ...Object.fromEntries(
              Object.entries(data).filter(([, v]) => v !== undefined),
            ),
            updatedAt: new Date(),
          };
          return {
            ...store[idx],
            components: components.filter((c) => c.garmentId === where.id),
          };
        },
      ),
      delete: jest.fn(async ({ where }: { where: { id: string } }) => {
        const idx = store.findIndex((g) => g.id === where.id);
        const [removed] = store.splice(idx, 1);
        for (let i = components.length - 1; i >= 0; i--) {
          if (components[i].garmentId === where.id) components.splice(i, 1);
        }
        return removed;
      }),
      deleteMany: jest.fn(
        async ({
          where,
        }: {
          where: { userId: string; isDemo?: boolean };
        }) => {
          let count = 0;
          let i = store.length;
          while (i--) {
            const matchesUser = store[i].userId === where.userId;
            const matchesDemo =
              where.isDemo === undefined || store[i].isDemo === where.isDemo;
            if (matchesUser && matchesDemo) {
              const id = store[i].id;
              store.splice(i, 1);
              count += 1;
              for (let j = components.length - 1; j >= 0; j--) {
                if (components[j].garmentId === id) components.splice(j, 1);
              }
            }
          }
          return { count };
        },
      ),
      count: jest.fn(
        async ({
          where,
        }: {
          where: { userId: string; isDemo?: boolean };
        }) =>
          store.filter((g) => {
            if (g.userId !== where.userId) return false;
            if (where.isDemo !== undefined && g.isDemo !== where.isDemo) {
              return false;
            }
            return true;
          }).length,
      ),
    },
    garmentComponent: {
      deleteMany: jest.fn(async ({ where }: { where: { garmentId: string } }) => {
        for (let i = components.length - 1; i >= 0; i--) {
          if (components[i].garmentId === where.garmentId) {
            components.splice(i, 1);
          }
        }
        return { count: 0 };
      }),
      createMany: jest.fn(
        async ({ data }: { data: Array<Record<string, unknown>> }) => {
          for (const c of data) {
            components.push({ id: `c_${++seq}`, ...c });
          }
          return { count: data.length };
        },
      ),
    },
    userProfile: {
      findUnique: jest.fn(async ({ where }: { where: { userId: string } }) => {
        if (!profiles.has(where.userId)) return null;
        return {
          userId: where.userId,
          sharedWardrobeCategoriesJson: profiles.get(where.userId),
        };
      }),
      upsert: jest.fn(
        async ({
          where,
          update,
          create,
        }: {
          where: { userId: string };
          update: { sharedWardrobeCategoriesJson?: string };
          create: { sharedWardrobeCategoriesJson?: string };
        }) => {
          const json =
            update.sharedWardrobeCategoriesJson ??
            create.sharedWardrobeCategoriesJson ??
            '[]';
          profiles.set(where.userId, json);
          return { userId: where.userId, sharedWardrobeCategoriesJson: json };
        },
      ),
    },
  };

  beforeEach(async () => {
    store.length = 0;
    components.length = 0;
    profiles.clear();
    seq = 0;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WardrobeService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(WardrobeService);
  });

  it('creates a garment with category defaults', async () => {
    const g = await service.create('user1', {
      name: 'Merino 200',
      category: 'base_layer',
    });
    expect(g.layer).toBe('base');
    expect(g.primaryBodyZone).toBe('torso');
    expect(g.warmthTier).toBe(3);
    expect(g.activityTags).toEqual(['motorcycle']);
    expect(g.components).toEqual([]);
    expect(g.isDemo).toBe(false);
  });

  it('creates textile jacket preset with liners and vents capability', async () => {
    const g = await service.create('user1', {
      name: 'Dainese Carve Master',
      category: 'shell_jacket',
      preset: 'textile_jacket',
    });
    expect(g.material).toBe('textile');
    expect(g.hasVentilation).toBe(true);
    expect(g.components.map((c) => c.kind).sort()).toEqual([
      'thermal_liner',
      'waterproof_liner',
    ]);
    expect(g.components.find((c) => c.kind === 'thermal_liner')?.warmthDelta).toBe(
      2,
    );
  });

  it('creates motorcycle jeans via preset (pants + denim)', async () => {
    const g = await service.create('user1', {
      name: 'Bull-it jeans',
      category: 'pants',
      preset: 'motorcycle_jeans',
    });
    expect(g.category).toBe('pants');
    expect(g.material).toBe('denim');
  });

  it('rejects invalid category', async () => {
    await expect(
      service.create('user1', { name: 'X', category: 'cape' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid activity tags', async () => {
    await expect(
      service.create('user1', {
        name: 'X',
        category: 'gloves',
        activityTags: ['motorcycle', 'skydiving'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates components and heated flag', async () => {
    const created = await service.create('user1', {
      name: 'Summer gloves',
      category: 'gloves',
      warmthTier: 1,
    });
    const updated = await service.update('user1', created.id, {
      isHeated: true,
      warmthTier: 5,
      components: [],
    });
    expect(updated.isHeated).toBe(true);
    expect(updated.warmthTier).toBe(5);
  });

  it('enforces ownership on get', async () => {
    const created = await service.create('user1', {
      name: 'Mine',
      category: 'gloves',
    });
    await expect(service.get('user2', created.id)).rejects.toBeDefined();
  });

  it('seeds demo garments as isDemo and keeps normal creates false', async () => {
    const seeded = await service.seedDemo('user1', 'motorcycle', false, 'nb');
    expect(seeded.created).toBeGreaterThanOrEqual(8);
    expect(seeded.garments.every((g) => g.isDemo)).toBe(true);
    expect(seeded.garments.some((g) => g.name === 'Demo – Touringjakke')).toBe(
      true,
    );
    expect(
      seeded.garments.every((g) =>
        g.activityTags.every((tag) => tag === 'motorcycle'),
      ),
    ).toBe(true);
    expect(seeded.garments.flatMap((g) => g.activityTags)).not.toContain(
      'hiking',
    );

    const personal = await service.create('user1', {
      name: 'My jacket',
      category: 'shell_jacket',
    });
    expect(personal.isDemo).toBe(false);

    const english = await service.seedDemo('user2', 'motorcycle', false, 'en');
    expect(
      english.garments.some((g) => g.name === 'Demo – Touring jacket'),
    ).toBe(true);
  });

  it('preserves demo identity across rename and ignores client isDemo', async () => {
    const created = await service.create('user1', {
      name: 'Mine',
      category: 'gloves',
      isDemo: true,
    } as CreateGarmentDto);
    expect(created.isDemo).toBe(false);

    const seeded = await service.seedDemo('user2', 'motorcycle', false, 'en');
    const demo = seeded.garments[0];
    const updated = await service.update('user2', demo.id, {
      name: 'Renamed jacket',
      isDemo: false,
    } as UpdateGarmentDto);
    expect(updated.name).toBe('Renamed jacket');
    expect(updated.isDemo).toBe(true);
    const written = prismaMock.garment.update.mock.calls.at(-1)?.[0] as {
      data: Record<string, unknown>;
    };
    expect(written.data.isDemo).toBeUndefined();
  });

  it('deletes only the authenticated user demo rows', async () => {
    await service.seedDemo('user1', 'motorcycle', false, 'en');
    const personal = await service.create('user1', {
      name: 'My jacket',
      category: 'shell_jacket',
    });
    await service.seedDemo('user2', 'motorcycle', false, 'en');

    const removed = await service.deleteDemo('user1', 'motorcycle');
    expect(removed.deleted).toBeGreaterThanOrEqual(8);

    const mine = await service.list('user1');
    expect(mine.map((g) => g.id)).toEqual([personal.id]);
    expect(mine[0].isDemo).toBe(false);

    const other = await service.list('user2');
    expect(other.length).toBeGreaterThanOrEqual(8);
    expect(other.every((g) => g.isDemo)).toBe(true);
  });

  it('adds demo garments beside personal ones and does not duplicate them', async () => {
    await service.create('user1', {
      name: 'My jacket',
      category: 'shell_jacket',
    });
    const seeded = await service.seedDemo('user1', 'motorcycle', false, 'en');
    expect(seeded.created).toBeGreaterThanOrEqual(8);
    expect(seeded.garments.some((g) => g.name === 'My jacket' && !g.isDemo)).toBe(
      true,
    );
    const demoCount = seeded.garments.filter((g) => g.isDemo).length;
    expect(demoCount).toBe(seeded.created);

    const again = await service.seedDemo('user1', 'motorcycle', false, 'en');
    expect(again.created).toBe(0);
    expect(again.garments.filter((g) => g.isDemo)).toHaveLength(demoCount);
    expect(again.garments.filter((g) => !g.isDemo).map((g) => g.name)).toEqual([
      'My jacket',
    ]);
  });

  it('rejects motorcycle sharing and hiking wardrobe tags', async () => {
    await expect(
      service.create('user1', {
        name: 'Mixed',
        category: 'shell_jacket',
        activityTags: ['motorcycle', 'cycling'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create('user1', {
        name: 'Hike',
        category: 'shell_jacket',
        activityTags: ['hiking'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateSharing('user1', ['motorcycle', 'cycling']),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('shares personal non-motorcycle clothes only in the chosen combination', async () => {
    const cycling = await service.create('user1', {
      name: 'My jersey',
      category: 'base_layer',
      activityTags: ['cycling'],
    });
    const resort = await service.create('user1', {
      name: 'My alpine shell',
      category: 'shell_jacket',
      activityTags: ['alpine_skiing'],
    });
    expect(resort.activityTags).toEqual(['alpine_skiing', 'snowboarding']);
    const motorcycle = await service.create('user1', {
      name: 'My motorcycle jacket',
      category: 'shell_jacket',
    });

    const separate = await service.list('user1', 'xc_skiing');
    expect(separate.map((g) => g.id)).not.toContain(cycling.id);
    expect(separate.map((g) => g.id)).not.toContain(motorcycle.id);

    await service.updateSharing('user1', ['xc_skiing', 'cycling']);
    const shared = await service.list('user1', 'xc_skiing');
    expect(shared.map((g) => g.name)).toContain('My jersey');
    expect(shared.map((g) => g.name)).not.toContain('My alpine shell');
    expect(shared.map((g) => g.name)).not.toContain('My motorcycle jacket');

    const motorcycleList = await service.list('user1', 'motorcycle');
    expect(motorcycleList.map((g) => g.id)).toEqual([motorcycle.id]);
    const resortList = await service.list('user1', 'snowboarding');
    expect(resortList.map((g) => g.name)).toEqual(['My alpine shell']);
  });

  it('keeps demo seeding idempotent per category and preserves personal garments', async () => {
    const personal = await service.create('user1', {
      name: 'My jacket',
      category: 'shell_jacket',
    });
    const motorcycle = await service.seedDemo('user1', 'motorcycle', false, 'en');
    const cycling = await service.seedDemo('user1', 'cycling', false, 'nb');
    const resort = await service.seedDemo('user1', 'alpine_skiing', false, 'nb');
    expect(cycling.created).toBeGreaterThan(0);
    expect(resort.garments.some((g) => g.name === 'Demo – Alpin ulltrøye')).toBe(
      true,
    );
    const repeat = await service.seedDemo('user1', 'snowboarding', false, 'en');
    expect(repeat.created).toBe(0);
    expect(repeat.garments.filter((g) => g.isDemo)).toHaveLength(
      motorcycle.created + cycling.created + resort.created,
    );

    await service.updateSharing('user1', [
      'cycling',
      'alpine_snowboard',
      'xc_skiing',
    ]);
    const cyclingView = await service.list('user1', 'cycling');
    expect(
      cyclingView.some((g) => g.isDemo && g.activityTags.includes('alpine_skiing')),
    ).toBe(false);
    expect(
      cyclingView.some((g) => g.isDemo && g.activityTags.includes('cycling')),
    ).toBe(true);
    expect(cyclingView.some((g) => g.id === personal.id)).toBe(false);

    const removed = await service.deleteDemo('user1', 'cycling');
    expect(removed.deleted).toBe(cycling.created);
    const left = await service.list('user1');
    expect(left.some((g) => g.id === personal.id && !g.isDemo)).toBe(true);
    expect(left.some((g) => g.isDemo && g.activityTags.includes('cycling'))).toBe(
      false,
    );
    expect(
      left.some((g) => g.isDemo && g.activityTags.includes('motorcycle')),
    ).toBe(true);
    expect(left.some((g) => g.name === 'Demo – Alpin ulltrøye')).toBe(true);
  });

  it('still deletes one garment by id and leaves the rest', async () => {
    const seeded = await service.seedDemo('user1', 'motorcycle', false, 'en');
    const personal = await service.create('user1', {
      name: 'Mine',
      category: 'gloves',
    });
    await service.remove('user1', personal.id);
    const left = await service.list('user1');
    expect(left.map((g) => g.id)).not.toContain(personal.id);
    expect(left).toHaveLength(seeded.garments.length);
    expect(left.every((g) => g.isDemo)).toBe(true);
  });
});

describe('effectiveGarmentTiers', () => {
  it('applies liner deltas without inventing a second garment', () => {
    const base = {
      warmthTier: 2,
      windResistTier: 5,
      waterResistTier: 4,
      breathabilityTier: 3,
    };
    const withLiner = effectiveGarmentTiers(base, [
      { warmthDelta: 2, breathabilityDelta: -1 },
    ]);
    expect(withLiner.warmthTier).toBe(4);
    expect(withLiner.breathabilityTier).toBe(2);
    expect(withLiner.windResistTier).toBe(5);
  });
});
