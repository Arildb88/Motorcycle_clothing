import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACTIVITY_TYPES,
  ActivityType,
  COMPONENT_KIND_DEFAULTS,
  GARMENT_CATEGORIES,
  GARMENT_CATEGORY_DEFAULTS,
  GARMENT_PRESETS,
  GarmentCategory,
  GarmentComponentKind,
  MVP_ACTIVITY_TYPE,
  clampTier,
  defaultsForCategory,
  isActivityType,
  isGarmentCategory,
  isGarmentComponentKind,
  isGarmentMaterial,
  presetById,
} from '../domain';
import { DEMO_MOTORCYCLE_WARDROBE, expandDemoGarment } from '../domain';
import { CreateGarmentDto } from './dto/create-garment.dto';
import { UpdateGarmentDto } from './dto/update-garment.dto';

export type GarmentComponentResponse = {
  id: string;
  kind: string;
  name: string | null;
  warmthDelta: number;
  windResistDelta: number;
  waterResistDelta: number;
  breathabilityDelta: number;
};

export type GarmentResponse = {
  id: string;
  name: string;
  category: string;
  layer: string;
  primaryBodyZone: string;
  warmthTier: number;
  windResistTier: number;
  waterResistTier: number;
  breathabilityTier: number;
  material: string | null;
  hasVentilation: boolean;
  isHeated: boolean;
  brand: string | null;
  model: string | null;
  notes: string | null;
  activityTags: string[];
  components: GarmentComponentResponse[];
  createdAt: string;
  updatedAt: string;
};

type ComponentInput = {
  kind: string;
  name?: string;
  warmthDelta?: number;
  windResistDelta?: number;
  waterResistDelta?: number;
  breathabilityDelta?: number;
};

@Injectable()
export class WardrobeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<GarmentResponse[]> {
    const rows = await this.prisma.garment.findMany({
      where: { userId },
      include: { components: true },
      orderBy: [{ layer: 'asc' }, { category: 'asc' }, { name: 'asc' }],
    });
    return rows.map((g) => this.toResponse(g));
  }

  async get(userId: string, id: string): Promise<GarmentResponse> {
    const garment = await this.prisma.garment.findUnique({
      where: { id },
      include: { components: true },
    });
    if (!garment || garment.userId !== userId) {
      throw new NotFoundException('Garment not found');
    }
    return this.toResponse(garment);
  }

  async create(userId: string, dto: CreateGarmentDto): Promise<GarmentResponse> {
    const preset = dto.preset ? presetById(dto.preset) : undefined;
    if (dto.preset && !preset) {
      throw new BadRequestException(`Unknown garment preset: ${dto.preset}`);
    }

    const category = this.requireCategory(preset?.category ?? dto.category);
    const defaults = defaultsForCategory(category);
    const activityTags = this.normalizeActivityTags(dto.activityTags);

    const material =
      dto.material ??
      preset?.material ??
      null;
    if (material && !isGarmentMaterial(material)) {
      throw new BadRequestException(`Invalid material: ${material}`);
    }

    const hasVentilation =
      dto.hasVentilation ?? preset?.hasVentilation ?? false;
    const isHeated = dto.isHeated ?? preset?.isHeated ?? false;

    let componentInputs = dto.components;
    if (
      (!componentInputs || componentInputs.length === 0) &&
      preset?.suggestedComponents?.length
    ) {
      componentInputs = preset.suggestedComponents.map((kind) => ({
        kind,
      }));
    }

    const created = await this.prisma.garment.create({
      data: {
        userId,
        name: dto.name.trim(),
        category,
        layer: defaults.layer,
        primaryBodyZone: defaults.primaryBodyZone,
        warmthTier: clampTier(
          dto.warmthTier ?? preset?.warmthTier ?? defaults.warmthTier,
        ),
        windResistTier: clampTier(
          dto.windResistTier ??
            preset?.windResistTier ??
            defaults.windResistTier,
        ),
        waterResistTier: clampTier(
          dto.waterResistTier ??
            preset?.waterResistTier ??
            defaults.waterResistTier,
        ),
        breathabilityTier: clampTier(
          dto.breathabilityTier ??
            preset?.breathabilityTier ??
            defaults.breathabilityTier,
        ),
        material,
        hasVentilation,
        isHeated,
        brand: dto.brand?.trim() || null,
        model: dto.model?.trim() || null,
        notes: dto.notes?.trim() || null,
        activityTagsJson: JSON.stringify(activityTags),
        components: {
          create: this.normalizeComponents(componentInputs),
        },
      },
      include: { components: true },
    });
    return this.toResponse(created);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateGarmentDto,
  ): Promise<GarmentResponse> {
    await this.get(userId, id);

    let category: GarmentCategory | undefined;
    let layer: string | undefined;
    let primaryBodyZone: string | undefined;

    if (dto.category !== undefined) {
      category = this.requireCategory(dto.category);
      const defaults = defaultsForCategory(category);
      layer = defaults.layer;
      primaryBodyZone = defaults.primaryBodyZone;
    }

    if (dto.material !== undefined && dto.material !== null) {
      if (!isGarmentMaterial(dto.material)) {
        throw new BadRequestException(`Invalid material: ${dto.material}`);
      }
    }

    if (dto.components !== undefined) {
      await this.prisma.garmentComponent.deleteMany({ where: { garmentId: id } });
      await this.prisma.garmentComponent.createMany({
        data: this.normalizeComponents(dto.components).map((c) => ({
          garmentId: id,
          ...c,
        })),
      });
    }

    const updated = await this.prisma.garment.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        category,
        layer,
        primaryBodyZone,
        material:
          dto.material === undefined
            ? undefined
            : dto.material === null
              ? null
              : dto.material,
        hasVentilation: dto.hasVentilation,
        isHeated: dto.isHeated,
        warmthTier:
          dto.warmthTier !== undefined ? clampTier(dto.warmthTier) : undefined,
        windResistTier:
          dto.windResistTier !== undefined
            ? clampTier(dto.windResistTier)
            : undefined,
        waterResistTier:
          dto.waterResistTier !== undefined
            ? clampTier(dto.waterResistTier)
            : undefined,
        breathabilityTier:
          dto.breathabilityTier !== undefined
            ? clampTier(dto.breathabilityTier)
            : undefined,
        brand: dto.brand === undefined ? undefined : dto.brand.trim() || null,
        model: dto.model === undefined ? undefined : dto.model.trim() || null,
        notes: dto.notes === undefined ? undefined : dto.notes.trim() || null,
        activityTagsJson:
          dto.activityTags !== undefined
            ? JSON.stringify(this.normalizeActivityTags(dto.activityTags))
            : undefined,
      },
      include: { components: true },
    });
    return this.toResponse(updated);
  }

  async remove(userId: string, id: string): Promise<{ ok: true }> {
    await this.get(userId, id);
    await this.prisma.garment.delete({ where: { id } });
    return { ok: true };
  }

  async seedDemo(
    userId: string,
    force = false,
  ): Promise<{ created: number; garments: GarmentResponse[] }> {
    const count = await this.prisma.garment.count({ where: { userId } });
    if (count > 0 && !force) {
      throw new BadRequestException(
        'Wardrobe is not empty. Pass force=true to replace demo data.',
      );
    }
    if (force && count > 0) {
      await this.prisma.garment.deleteMany({ where: { userId } });
    }

    for (const seed of DEMO_MOTORCYCLE_WARDROBE) {
      const expanded = expandDemoGarment(seed);
      await this.prisma.garment.create({
        data: {
          userId,
          ...expanded,
          components: seed.components
            ? {
                create: this.normalizeComponents(seed.components),
              }
            : undefined,
        },
      });
    }
    const garments = await this.list(userId);
    return { created: garments.length, garments };
  }

  meta() {
    return {
      categories: [...GARMENT_CATEGORIES],
      categoryDefaults: GARMENT_CATEGORY_DEFAULTS,
      materials: [
        'textile',
        'leather',
        'mesh',
        'denim',
        'synthetic',
        'merino',
        'mixed',
        'other',
      ],
      componentKinds: ['thermal_liner', 'waterproof_liner', 'other'],
      presets: GARMENT_PRESETS,
      activityTypes: [...ACTIVITY_TYPES],
      mvpActivityType: MVP_ACTIVITY_TYPE,
      tierScale: { min: 1, max: 5 },
      ventStates: ['closed', 'open'],
      notes: {
        garmentVsConfiguration:
          'Garment = owned item; installed liners/vents are ride configuration.',
        wornEvidence:
          'ActivityLog should later store {garmentId, installedComponentIds, vents}.',
      },
    };
  }

  private normalizeComponents(inputs?: ComponentInput[]) {
    if (!inputs || inputs.length === 0) return [];
    return inputs.map((c) => {
      if (!isGarmentComponentKind(c.kind)) {
        throw new BadRequestException(`Invalid component kind: ${c.kind}`);
      }
      const kind = c.kind as GarmentComponentKind;
      const defaults = COMPONENT_KIND_DEFAULTS[kind];
      return {
        kind,
        name: c.name?.trim() || defaults.name,
        warmthDelta: c.warmthDelta ?? defaults.warmthDelta,
        windResistDelta: c.windResistDelta ?? defaults.windResistDelta,
        waterResistDelta: c.waterResistDelta ?? defaults.waterResistDelta,
        breathabilityDelta:
          c.breathabilityDelta ?? defaults.breathabilityDelta,
      };
    });
  }

  private requireCategory(value: string): GarmentCategory {
    if (!isGarmentCategory(value)) {
      throw new BadRequestException(`Invalid garment category: ${value}`);
    }
    return value;
  }

  private normalizeActivityTags(tags?: string[]): ActivityType[] {
    if (!tags || tags.length === 0) return [MVP_ACTIVITY_TYPE];
    const normalized = tags.map((t) => t.trim()).filter(Boolean);
    for (const t of normalized) {
      if (!isActivityType(t)) {
        throw new BadRequestException(`Invalid activity type: ${t}`);
      }
    }
    return [...new Set(normalized)] as ActivityType[];
  }

  private toResponse(g: {
    id: string;
    name: string;
    category: string;
    layer: string;
    primaryBodyZone: string;
    warmthTier: number;
    windResistTier: number;
    waterResistTier: number;
    breathabilityTier: number;
    material: string | null;
    hasVentilation: boolean;
    isHeated: boolean;
    brand: string | null;
    model: string | null;
    notes: string | null;
    activityTagsJson: string;
    createdAt: Date;
    updatedAt: Date;
    components?: Array<{
      id: string;
      kind: string;
      name: string | null;
      warmthDelta: number;
      windResistDelta: number;
      waterResistDelta: number;
      breathabilityDelta: number;
    }>;
  }): GarmentResponse {
    let activityTags: string[] = [MVP_ACTIVITY_TYPE];
    try {
      const parsed = JSON.parse(g.activityTagsJson);
      if (Array.isArray(parsed)) activityTags = parsed.map(String);
    } catch {
      /* keep default */
    }
    return {
      id: g.id,
      name: g.name,
      category: g.category,
      layer: g.layer,
      primaryBodyZone: g.primaryBodyZone,
      warmthTier: g.warmthTier,
      windResistTier: g.windResistTier,
      waterResistTier: g.waterResistTier,
      breathabilityTier: g.breathabilityTier,
      material: g.material,
      hasVentilation: g.hasVentilation,
      isHeated: g.isHeated,
      brand: g.brand,
      model: g.model,
      notes: g.notes,
      activityTags,
      components: (g.components ?? []).map((c) => ({
        id: c.id,
        kind: c.kind,
        name: c.name,
        warmthDelta: c.warmthDelta,
        windResistDelta: c.windResistDelta,
        waterResistDelta: c.waterResistDelta,
        breathabilityDelta: c.breathabilityDelta,
      })),
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    };
  }
}
