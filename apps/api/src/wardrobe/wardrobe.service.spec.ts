import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WardrobeService } from './wardrobe.service';
import { PrismaService } from '../prisma/prisma.service';
import { effectiveGarmentTiers } from '../domain';

describe('WardrobeService', () => {
  let service: WardrobeService;
  const store: Record<string, unknown>[] = [];
  const components: Record<string, unknown>[] = [];
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
      deleteMany: jest.fn(async ({ where }: { where: { userId: string } }) => {
        let i = store.length;
        while (i--) {
          if (store[i].userId === where.userId) {
            const id = store[i].id;
            store.splice(i, 1);
            for (let j = components.length - 1; j >= 0; j--) {
              if (components[j].garmentId === id) components.splice(j, 1);
            }
          }
        }
        return { count: 0 };
      }),
      count: jest.fn(async ({ where }: { where: { userId: string } }) =>
        store.filter((g) => g.userId === where.userId).length,
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
  };

  beforeEach(async () => {
    store.length = 0;
    components.length = 0;
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
