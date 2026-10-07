import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { GarmentCatalogueService } from './garment-catalogue.service';
import { WardrobeService } from './wardrobe.service';

describe('GarmentCatalogueService', () => {
  const garments: Record<string, unknown>[] = [];
  const rows: Array<Record<string, unknown>> = [];
  let seq = 0;
  const statements: string[] = [];

  const countFields = [
    'warmth1',
    'warmth2',
    'warmth3',
    'warmth4',
    'warmth5',
    'wind1',
    'wind2',
    'wind3',
    'wind4',
    'wind5',
    'water1',
    'water2',
    'water3',
    'water4',
    'water5',
  ] as const;

  function identityOf(where: {
    brandKey_modelKey_category_activityScope_heated_linerKey_materialKey: Record<
      string,
      unknown
    >;
  }) {
    return where.brandKey_modelKey_category_activityScope_heated_linerKey_materialKey;
  }

  function sameIdentity(
    row: Record<string, unknown>,
    identity: Record<string, unknown>,
  ) {
    return (
      row.brandKey === identity.brandKey &&
      row.modelKey === identity.modelKey &&
      row.category === identity.category &&
      row.activityScope === identity.activityScope &&
      row.heated === identity.heated &&
      row.linerKey === identity.linerKey &&
      row.materialKey === identity.materialKey
    );
  }

  const prisma = {
    garment: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) => {
        return garments.find((row) => row.id === where.id) ?? null;
      }),
      findMany: jest.fn(
        ({ where }: { where?: { userId?: string; isDemo?: boolean } }) => {
          return garments
            .filter((row) => {
              if (where?.userId && row.userId !== where.userId) return false;
              if (where?.isDemo !== undefined && row.isDemo !== where.isDemo)
                return false;
              return true;
            })
            .map((row) => ({ ...row, components: [] }));
        },
      ),
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: `g_${++seq}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          material: null,
          hasVentilation: false,
          isHeated: false,
          isDemo: false,
          brand: null,
          model: null,
          notes: null,
          ...data,
          components: undefined,
        };
        garments.push(row);
        return { ...row, components: [] };
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const idx = garments.findIndex((row) => row.id === where.id);
          garments[idx] = {
            ...garments[idx],
            ...Object.fromEntries(
              Object.entries(data).filter(([, value]) => value !== undefined),
            ),
            updatedAt: new Date(),
          };
          return { ...garments[idx], components: [] };
        },
      ),
      delete: jest.fn(({ where }: { where: { id: string } }) => {
        const idx = garments.findIndex((row) => row.id === where.id);
        const [removed] = garments.splice(idx, 1);
        return removed;
      }),
    },
    garmentComponent: {
      deleteMany: jest.fn(() => ({ count: 0 })),
      createMany: jest.fn(() => ({ count: 0 })),
    },
    garmentCatalogueEntry: {
      findUnique: jest.fn(
        ({ where }: { where: Parameters<typeof identityOf>[0] }) => {
          const identity = identityOf(where);
          return rows.find((row) => sameIdentity(row, identity)) ?? null;
        },
      ),
      findMany: jest.fn(() =>
        rows.map((row) => ({
          brandLabel: row.brandLabel,
          modelLabel: row.modelLabel,
          category: row.category,
          activityScope: row.activityScope,
          heated: row.heated,
          linerKey: row.linerKey,
          materialKey: row.materialKey,
        })),
      ),
    },
    userProfile: {
      findUnique: jest.fn(() => null),
    },
    $executeRawUnsafe: jest.fn((sql: string, ...values: unknown[]) => {
      statements.push(sql);
      expect(sql).toContain('ON CONFLICT');
      expect(sql).toContain('+ EXCLUDED');
      expect(sql).not.toMatch(/userId|garmentId|email|notes/);
      expect(values).not.toContain('user-1');
      expect(values).not.toContain('my secret jacket');
      const row: Record<string, unknown> = {
        id: values[0],
        brandKey: values[1],
        modelKey: values[2],
        category: values[3],
        activityScope: values[4],
        heated: values[5],
        linerKey: values[6],
        materialKey: values[7],
        brandLabel: values[8],
        modelLabel: values[9],
      };
      countFields.forEach((field, index) => {
        row[field] = values[10 + index];
      });
      const existing = rows.find((candidate) => sameIdentity(candidate, row));
      if (!existing) {
        rows.push(row);
      } else {
        for (const field of countFields) {
          existing[field] = Number(existing[field]) + Number(row[field]);
        }
      }
      return 1;
    }),
  };

  let catalogue: GarmentCatalogueService;
  let wardrobe: WardrobeService;

  function histogramTotal() {
    return rows.reduce((sum, row) => {
      return (
        sum +
        countFields.reduce((inner, field) => inner + Number(row[field] ?? 0), 0)
      );
    }, 0);
  }

  beforeEach(async () => {
    garments.length = 0;
    rows.length = 0;
    statements.length = 0;
    seq = 0;
    const module = await Test.createTestingModule({
      providers: [
        GarmentCatalogueService,
        WardrobeService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    catalogue = module.get(GarmentCatalogueService);
    wardrobe = module.get(WardrobeService);
  });

  function rate(
    score: number,
    submissionId: string,
    metric: 'warmth' | 'wind' | 'water' = 'warmth',
  ) {
    return catalogue.contribute('user-1', {
      brand: 'Klim',
      model: 'Badlands Pro',
      category: 'shell_jacket',
      activityTags: ['motorcycle'],
      material: 'textile',
      explicitMetrics: [metric],
      submissionId,
      [metric]: score,
    });
  }

  it('rejects out-of-range ratings before any shared write', async () => {
    for (const warmth of [0, 6, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(
        catalogue.contribute('user-1', {
          brand: 'Klim',
          model: 'Badlands Pro',
          category: 'shell_jacket',
          explicitMetrics: ['warmth'],
          submissionId: `bad-${warmth}`,
          warmth,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('uses fallback below five samples and a trimmed mean at five', async () => {
    for (const [index, score] of [1, 2, 3, 4].entries()) {
      await rate(score, `sample-${index}`);
    }
    const below = await catalogue.preview({
      brand: 'Klim',
      model: 'Badlands Pro',
      category: 'shell_jacket',
      material: 'textile',
      activityTags: ['motorcycle'],
    });
    expect(below.metrics.warmth).toMatchObject({
      source: 'fallback',
      sampleCount: 4,
      rounded: null,
    });
    await rate(5, 'sample-4');
    const ready = await catalogue.preview({
      brand: 'Klim',
      model: 'Badlands Pro',
      category: 'shell_jacket',
      material: 'textile',
      activityTags: ['motorcycle'],
    });
    expect(ready.metrics.warmth).toMatchObject({
      source: 'community',
      sampleCount: 5,
      estimate: 3,
      rounded: 3,
    });
    expect(ready.metrics.wind.sampleCount).toBe(0);
    expect(ready.limitation).toMatch(/not a count of distinct people/);
  });

  it('trims ties and all-equal histograms, and rounds 2.5 up to 3', async () => {
    for (const [index, score] of [3, 3, 3, 3, 3].entries()) {
      await rate(score, `equal-${index}`);
    }
    const equal = await catalogue.preview(klim());
    expect(equal.metrics.warmth.rounded).toBe(3);

    rows.length = 0;
    for (const [index, score] of [2, 2, 2, 4, 4].entries()) {
      await rate(score, `tie-${index}`);
    }
    const tied = await catalogue.preview(klim());
    expect(tied.metrics.warmth.estimate).toBeCloseTo(8 / 3);
    expect(tied.metrics.warmth.rounded).toBe(3);

    rows.length = 0;
    for (const [index, score] of [1, 2, 2, 3, 3, 4].entries()) {
      await rate(score, `half-${index}`);
    }
    const half = await catalogue.preview(klim());
    expect(half.metrics.warmth.estimate).toBe(2.5);
    expect(half.metrics.warmth.rounded).toBe(3);
  });

  it('does not let a default, a demo, or a retry become a new measurement', async () => {
    await rate(4, 'once');
    await rate(4, 'once');
    expect(histogramTotal()).toBe(1);
    const duplicate = await rate(4, 'once');
    expect(duplicate).toMatchObject({ accepted: false, duplicate: true });

    const created = await wardrobe.create('user-1', {
      name: 'my secret jacket',
      category: 'shell_jacket',
      brand: 'Klim',
      model: 'Badlands Pro',
      material: 'textile',
    });
    expect(histogramTotal()).toBe(1);
    expect(created.name).toBe('my secret jacket');

    garments.push({
      id: 'demo-1',
      userId: 'user-1',
      isDemo: true,
      name: 'Demo – Touring jacket',
    });
    await expect(
      catalogue.contribute('user-1', {
        brand: 'Klim',
        model: 'Badlands Pro',
        category: 'shell_jacket',
        material: 'textile',
        explicitMetrics: ['warmth'],
        warmth: 5,
        submissionId: 'demo-try',
        garmentId: 'demo-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(histogramTotal()).toBe(1);
    expect(JSON.stringify(rows)).not.toContain('my secret jacket');
    expect(JSON.stringify(rows)).not.toContain('user-1');
  });

  it('keeps an explicit value, leaves an existing garment unchanged, and refreshes only a new copy', async () => {
    for (const [index, score] of [5, 5, 5, 5, 5].entries()) {
      await rate(score, `hot-${index}`);
    }
    const overridden = await wardrobe.create('user-1', {
      name: 'Cooler than the crowd',
      category: 'shell_jacket',
      brand: 'Klim',
      model: 'Badlands Pro',
      material: 'textile',
      warmthTier: 1,
    });
    expect(overridden.warmthTier).toBe(1);

    rows.length = 0;
    const snapshot = await wardrobe.create('user-1', {
      name: 'Snapshot',
      category: 'shell_jacket',
      brand: 'Klim',
      model: 'Badlands Pro',
      material: 'textile',
      warmthTier: 4,
    });
    for (const [index, score] of [1, 1, 1, 1, 1].entries()) {
      await rate(score, `cold-${index}`);
    }
    const renamed = await wardrobe.update('user-1', snapshot.id, {
      name: 'Renamed snapshot',
      notes: 'personal note',
    });
    expect(renamed.warmthTier).toBe(4);
    expect(renamed.name).toBe('Renamed snapshot');
    const read = await wardrobe.get('user-1', snapshot.id);
    expect(read.warmthTier).toBe(4);

    await wardrobe.remove('user-1', snapshot.id);
    const again = await wardrobe.create('user-1', {
      name: 'Snapshot again',
      category: 'shell_jacket',
      brand: 'Klim',
      model: 'Badlands Pro',
      material: 'textile',
    });
    expect(again.warmthTier).toBe(1);
    expect(statements.every((sql) => sql.includes('ON CONFLICT'))).toBe(true);
  });

  it('does not merge heated, liner, generation, or activity variants', async () => {
    for (const [index, score] of [5, 5, 5, 5, 5].entries()) {
      await rate(score, `base-${index}`);
    }
    const heated = await catalogue.preview({
      ...klim(),
      isHeated: true,
    });
    const lined = await catalogue.preview({
      ...klim(),
      linerKinds: ['thermal_liner'],
    });
    const generation = await catalogue.preview({
      brand: "REV'IT!",
      model: 'Sand 4',
      category: 'shell_jacket',
      material: 'textile',
      activityTags: ['motorcycle'],
    });
    const cycling = await catalogue.preview({
      brand: 'Scott',
      model: 'Patrol',
      category: 'shell_jacket',
      material: 'textile',
      activityTags: ['cycling'],
    });
    expect(heated.metrics.warmth.source).toBe('fallback');
    expect(lined.metrics.warmth.source).toBe('fallback');
    expect(generation.metrics.warmth.sampleCount).toBe(0);
    expect(cycling.metrics.warmth.sampleCount).toBe(0);

    const byName = await catalogue.preview({
      name: 'Klim Badlands Pro',
      category: 'shell_jacket',
      material: 'textile',
      activityTags: ['motorcycle'],
    });
    expect(byName.matchKind).toBe('name');
    expect(byName.metrics.warmth.rounded).toBe(5);
    const otherCategory = await catalogue.preview({
      name: 'Klim Badlands Pro',
      category: 'gloves',
      activityTags: ['motorcycle'],
    });
    expect(otherCategory.matchKind).toBe('none');
  });

  it('applies a server-side default when the client sends no previewed tier', async () => {
    for (const [index, score] of [1, 2, 2, 3, 3, 4].entries()) {
      await rate(score, `server-${index}`);
    }
    const created = await wardrobe.create('user-1', {
      name: 'No preview',
      category: 'shell_jacket',
      brand: '  klim ',
      model: 'badlands   pro',
      material: 'textile',
    });
    expect(created.warmthTier).toBe(3);
    expect(created.windResistTier).toBe(5);
    expect(histogramTotal()).toBe(6);
  });
});

function klim() {
  return {
    brand: 'Klim',
    model: 'Badlands Pro',
    category: 'shell_jacket' as const,
    material: 'textile' as const,
    activityTags: ['motorcycle'],
  };
}
