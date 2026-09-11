import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WardrobeService } from './wardrobe.service';
import { PrismaService } from '../prisma/prisma.service';

describe('WardrobeService', () => {
  let service: WardrobeService;
  const store: Record<string, unknown>[] = [];

  const prismaMock = {
    garment: {
      findMany: jest.fn(async ({ where }: { where: { userId: string } }) =>
        store.filter((g) => g.userId === where.userId),
      ),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
        store.find((g) => g.id === where.id) ?? null,
      ),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: `g_${store.length + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        store.push(row);
        return row;
      }),
      createMany: jest.fn(async ({ data }: { data: Record<string, unknown>[] }) => {
        for (const d of data) {
          store.push({
            id: `g_${store.length + 1}`,
            createdAt: new Date(),
            updatedAt: new Date(),
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
          return store[idx];
        },
      ),
      delete: jest.fn(async ({ where }: { where: { id: string } }) => {
        const idx = store.findIndex((g) => g.id === where.id);
        const [removed] = store.splice(idx, 1);
        return removed;
      }),
      deleteMany: jest.fn(async ({ where }: { where: { userId: string } }) => {
        let i = store.length;
        while (i--) {
          if (store[i].userId === where.userId) store.splice(i, 1);
        }
        return { count: 0 };
      }),
      count: jest.fn(async ({ where }: { where: { userId: string } }) =>
        store.filter((g) => g.userId === where.userId).length,
      ),
    },
  };

  beforeEach(async () => {
    store.length = 0;
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

  it('updates and deletes a garment', async () => {
    const created = await service.create('user1', {
      name: 'Summer gloves',
      category: 'gloves',
      warmthTier: 1,
    });
    const updated = await service.update('user1', created.id, {
      name: 'Winter gloves',
      category: 'gloves',
      warmthTier: 5,
    });
    expect(updated.name).toBe('Winter gloves');
    expect(updated.warmthTier).toBe(5);
    expect(updated.primaryBodyZone).toBe('hands');

    await service.remove('user1', created.id);
    await expect(service.get('user1', created.id)).rejects.toThrow(
      'Garment not found',
    );
  });

  it('seeds demo wardrobe only when empty', async () => {
    const result = await service.seedDemo('user1');
    expect(result.created).toBe(8);
    await expect(service.seedDemo('user1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    const forced = await service.seedDemo('user1', true);
    expect(forced.created).toBe(8);
  });

  it('exposes meta categories', () => {
    const meta = service.meta();
    expect(meta.categories).toContain('heated_vest');
    expect(meta.mvpActivityType).toBe('motorcycle');
  });
});
