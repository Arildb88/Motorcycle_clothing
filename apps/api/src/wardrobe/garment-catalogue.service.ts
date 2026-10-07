import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CATALOGUE_LIMITATION,
  CatalogueChoice,
  CatalogueCounts,
  CatalogueIdentity,
  CatalogueMetric,
  CatalogueSubmissionGuard,
  activityScopeKey,
  buildIdentity,
  countColumn,
  curatedBrand,
  defaultsForCategory,
  emptyCatalogueCounts,
  estimateMetric,
  histogramFromCounts,
  identityFromProduct,
  isGarmentCategory,
  linerKeyFromKinds,
  matchCuratedByName,
  materialKeyFrom,
  presetById,
  searchCatalogueChoices,
  type MetricEstimate,
} from '../domain';
import {
  CatalogueContributionDto,
  CataloguePreviewDto,
} from './dto/catalogue.dto';

export type CataloguePreview = {
  matched: boolean;
  matchKind: 'identity' | 'name' | 'none';
  limitation: string;
  metrics: Record<CatalogueMetric, MetricEstimate>;
  fallback: {
    warmthTier: number;
    windResistTier: number;
    waterResistTier: number;
    breathabilityTier: number;
  };
};

type CountRow = CatalogueCounts &
  CatalogueIdentity & {
    id: string;
    brandLabel: string;
    modelLabel: string;
  };

const COUNT_FIELDS = [
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

@Injectable()
export class GarmentCatalogueService {
  private readonly submissions = new CatalogueSubmissionGuard();

  constructor(private readonly prisma: PrismaService) {}

  async choices(query?: {
    q?: string;
    brand?: string;
    category?: string;
    activityScope?: string;
  }) {
    const rows = await this.prisma.garmentCatalogueEntry.findMany({
      select: {
        brandLabel: true,
        modelLabel: true,
        category: true,
        activityScope: true,
        heated: true,
        linerKey: true,
        materialKey: true,
      },
    });
    const extra: CatalogueChoice[] = rows.map((row) => ({
      brand: row.brandLabel,
      model: row.modelLabel,
      category: row.category,
      activityScope: row.activityScope,
      heated: row.heated,
      linerKey: row.linerKey,
      materialKey: row.materialKey,
      curatedName: '',
    }));
    const found = searchCatalogueChoices({
      query: query?.q,
      brand: query?.brand,
      category: query?.category,
      activityScope: query?.activityScope,
      extra,
    });
    return {
      brands: found.brands,
      models: found.models,
      curated: true,
      verifiedManufacturerData: false,
      limitation: CATALOGUE_LIMITATION,
    };
  }

  async preview(dto: CataloguePreviewDto): Promise<CataloguePreview> {
    const resolved = this.resolveLookup(dto);
    const counts = resolved
      ? await this.readCounts(resolved.identity)
      : emptyCatalogueCounts();
    return this.toPreview(
      resolved?.matchKind ?? 'none',
      counts,
      dto.category,
      dto.preset,
    );
  }

  /**
   * Rounded community tiers for a new garment. Omitted metrics stay unset
   * so the caller can keep preset and category defaults.
   * Does not write a contribution.
   */
  async roundedDefaults(input: CataloguePreviewDto): Promise<{
    warmth?: number;
    wind?: number;
    water?: number;
  }> {
    const preview = await this.preview(input);
    return {
      warmth:
        preview.metrics.warmth.source === 'community'
          ? (preview.metrics.warmth.rounded ?? undefined)
          : undefined,
      wind:
        preview.metrics.wind.source === 'community'
          ? (preview.metrics.wind.rounded ?? undefined)
          : undefined,
      water:
        preview.metrics.water.source === 'community'
          ? (preview.metrics.water.rounded ?? undefined)
          : undefined,
    };
  }

  async contribute(userId: string, dto: CatalogueContributionDto) {
    const explicit = this.explicitScores(dto);
    const identity = buildIdentity({
      brand: dto.brand,
      model: dto.model,
      category: dto.category,
      activityTags: dto.activityTags ?? ['motorcycle'],
      heated: dto.isHeated ?? false,
      linerKinds: dto.linerKinds ?? [],
      material: dto.material,
    });
    if (!identity) {
      throw new BadRequestException(
        'Community ratings require a curated brand and a product model',
      );
    }
    if (dto.garmentId) {
      await this.assertPersonalGarment(userId, dto.garmentId);
    }
    if (this.submissions.claim(dto.submissionId)) {
      return {
        accepted: false,
        duplicate: true,
        limitation: CATALOGUE_LIMITATION,
      };
    }
    const brandLabel = curatedBrand(dto.brand)!;
    const modelLabel = dto.model.trim().replace(/\s+/g, ' ');
    const delta = emptyCatalogueCounts();
    for (const [metric, score] of explicit) {
      const column = countColumn(metric, score);
      delta[column] += 1;
    }
    try {
      await this.applyIncrement(identity, brandLabel, modelLabel, delta);
    } catch (error) {
      this.submissions.release(dto.submissionId);
      throw error;
    }
    return {
      accepted: true,
      duplicate: false,
      limitation: CATALOGUE_LIMITATION,
    };
  }

  private explicitScores(
    dto: CatalogueContributionDto,
  ): Array<[CatalogueMetric, number]> {
    if (!dto.explicitMetrics?.length) {
      throw new BadRequestException(
        'Only an explicit rating can be shared. Defaults are not counted.',
      );
    }
    const scores: Array<[CatalogueMetric, number]> = [];
    for (const metric of dto.explicitMetrics) {
      if (metric !== 'warmth' && metric !== 'wind' && metric !== 'water') {
        throw new BadRequestException(`Unknown catalogue metric: ${metric}`);
      }
      const value = dto[metric];
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        !Number.isInteger(value)
      ) {
        throw new BadRequestException(
          'Contribution values must be integers from 1 to 5',
        );
      }
      if (value < 1 || value > 5) {
        throw new BadRequestException(
          'Contribution values must be integers from 1 to 5',
        );
      }
      scores.push([metric, value]);
    }
    return scores;
  }

  private async assertPersonalGarment(userId: string, garmentId: string) {
    const garment = await this.prisma.garment.findUnique({
      where: { id: garmentId },
    });
    if (!garment || garment.userId !== userId) {
      throw new NotFoundException('Garment not found');
    }
    if (garment.isDemo) {
      throw new BadRequestException(
        'Demo garments cannot contribute community ratings',
      );
    }
  }

  /**
   * One INSERT ... ON CONFLICT add. Concurrent contributions accumulate.
   * The statement has no user, garment, name, note, or timestamp column.
   */
  private async applyIncrement(
    identity: CatalogueIdentity,
    brandLabel: string,
    modelLabel: string,
    delta: CatalogueCounts,
  ) {
    const columns = [
      'id',
      'brandKey',
      'modelKey',
      'category',
      'activityScope',
      'heated',
      'linerKey',
      'materialKey',
      'brandLabel',
      'modelLabel',
      ...COUNT_FIELDS,
    ];
    const values = [
      randomUUID(),
      identity.brandKey,
      identity.modelKey,
      identity.category,
      identity.activityScope,
      identity.heated,
      identity.linerKey,
      identity.materialKey,
      brandLabel,
      modelLabel,
      ...COUNT_FIELDS.map((field) => delta[field]),
    ];
    const assignments = COUNT_FIELDS.map(
      (field) =>
        `"${field}" = "GarmentCatalogueEntry"."${field}" + EXCLUDED."${field}"`,
    ).join(', ');
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const sql = `
      INSERT INTO "GarmentCatalogueEntry" (${columns.map((column) => `"${column}"`).join(', ')})
      VALUES (${placeholders})
      ON CONFLICT ("brandKey", "modelKey", "category", "activityScope", "heated", "linerKey", "materialKey")
      DO UPDATE SET ${assignments}
    `;
    await this.prisma.$executeRawUnsafe(sql, ...values);
  }

  private resolveLookup(dto: CataloguePreviewDto): {
    identity: CatalogueIdentity;
    matchKind: 'identity' | 'name';
  } | null {
    const variant = this.variantOf(dto);
    const brand = dto.brand?.trim() ?? '';
    const model = dto.model?.trim() ?? '';
    if (brand && model) {
      const identity = buildIdentity({
        brand,
        model,
        category: dto.category,
        activityTags: variant.activityTags,
        heated: variant.heated,
        linerKinds: variant.linerKinds,
        material: variant.material,
      });
      return identity ? { identity, matchKind: 'identity' } : null;
    }
    if (brand || model) return null;
    const matched = matchCuratedByName({
      name: dto.name ?? '',
      category: dto.category,
      activityScope: activityScopeKey(variant.activityTags),
      heated: variant.heated,
      linerKey: linerKeyFromKinds(variant.linerKinds),
      materialKey: materialKeyFrom(variant.material),
    });
    if (!matched) return null;
    return { identity: identityFromProduct(matched), matchKind: 'name' };
  }

  private variantOf(dto: CataloguePreviewDto) {
    const preset = dto.preset ? presetById(dto.preset) : undefined;
    const linerKinds =
      dto.linerKinds ??
      (preset?.suggestedComponents ? [...preset.suggestedComponents] : []);
    return {
      activityTags: dto.activityTags?.length
        ? dto.activityTags
        : ['motorcycle'],
      heated: dto.isHeated ?? preset?.isHeated ?? false,
      material: dto.material ?? preset?.material ?? null,
      linerKinds,
    };
  }

  private async readCounts(
    identity: CatalogueIdentity,
  ): Promise<CatalogueCounts> {
    const row = await this.prisma.garmentCatalogueEntry.findUnique({
      where: {
        brandKey_modelKey_category_activityScope_heated_linerKey_materialKey:
          identity,
      },
    });
    if (!row) return emptyCatalogueCounts();
    return countsOf(row);
  }

  private toPreview(
    matchKind: CataloguePreview['matchKind'],
    counts: CatalogueCounts,
    category: string,
    presetId?: string,
  ): CataloguePreview {
    const preset = presetId ? presetById(presetId) : undefined;
    const categoryDefaults = isGarmentCategory(category)
      ? defaultsForCategory(category)
      : {
          warmthTier: 3,
          windResistTier: 3,
          waterResistTier: 3,
          breathabilityTier: 3,
        };
    return {
      matched: matchKind !== 'none',
      matchKind,
      limitation: CATALOGUE_LIMITATION,
      metrics: {
        warmth: estimateMetric(histogramFromCounts(counts, 'warmth')),
        wind: estimateMetric(histogramFromCounts(counts, 'wind')),
        water: estimateMetric(histogramFromCounts(counts, 'water')),
      },
      fallback: {
        warmthTier: preset?.warmthTier ?? categoryDefaults.warmthTier,
        windResistTier:
          preset?.windResistTier ?? categoryDefaults.windResistTier,
        waterResistTier:
          preset?.waterResistTier ?? categoryDefaults.waterResistTier,
        breathabilityTier:
          preset?.breathabilityTier ?? categoryDefaults.breathabilityTier,
      },
    };
  }
}

function countsOf(row: CountRow): CatalogueCounts {
  const counts = emptyCatalogueCounts();
  for (const field of COUNT_FIELDS) counts[field] = row[field] ?? 0;
  return counts;
}
