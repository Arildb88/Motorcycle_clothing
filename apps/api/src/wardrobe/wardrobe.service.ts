import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACTIVITY_TYPES,
  ActivityType,
  GARMENT_CATEGORIES,
  GarmentCategory,
  MVP_ACTIVITY_TYPE,
  clampTier,
  defaultsForCategory,
  isActivityType,
  isGarmentCategory,
} from '../domain';
import { DEMO_MOTORCYCLE_WARDROBE, expandDemoGarment } from '../domain';
import { CreateGarmentDto } from './dto/create-garment.dto';
import { UpdateGarmentDto } from './dto/update-garment.dto';
import { GARMENT_CATEGORY_DEFAULTS } from '../domain';

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
  brand: string | null;
  model: string | null;
  notes: string | null;
  activityTags: string[];
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class WardrobeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<GarmentResponse[]> {
    const rows = await this.prisma.garment.findMany({
      where: { userId },
      orderBy: [{ layer: 'asc' }, { category: 'asc' }, { name: 'asc' }],
    });
    return rows.map((g) => this.toResponse(g));
  }

  async get(userId: string, id: string): Promise<GarmentResponse> {
    const garment = await this.prisma.garment.findUnique({ where: { id } });
    if (!garment || garment.userId !== userId) {
      throw new NotFoundException('Garment not found');
    }
    return this.toResponse(garment);
  }

  async create(userId: string, dto: CreateGarmentDto): Promise<GarmentResponse> {
    const category = this.requireCategory(dto.category);
    const defaults = defaultsForCategory(category);
    const activityTags = this.normalizeActivityTags(dto.activityTags);

    const created = await this.prisma.garment.create({
      data: {
        userId,
        name: dto.name.trim(),
        category,
        layer: defaults.layer,
        primaryBodyZone: defaults.primaryBodyZone,
        warmthTier: clampTier(dto.warmthTier ?? defaults.warmthTier),
        windResistTier: clampTier(
          dto.windResistTier ?? defaults.windResistTier,
        ),
        waterResistTier: clampTier(
          dto.waterResistTier ?? defaults.waterResistTier,
        ),
        breathabilityTier: clampTier(
          dto.breathabilityTier ?? defaults.breathabilityTier,
        ),
        brand: dto.brand?.trim() || null,
        model: dto.model?.trim() || null,
        notes: dto.notes?.trim() || null,
        activityTagsJson: JSON.stringify(activityTags),
      },
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
      // Re-derive layer/zone when category changes unless we later allow overrides.
      layer = defaults.layer;
      primaryBodyZone = defaults.primaryBodyZone;
    }

    const updated = await this.prisma.garment.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        category,
        layer,
        primaryBodyZone,
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
    });
    return this.toResponse(updated);
  }

  async remove(userId: string, id: string): Promise<{ ok: true }> {
    await this.get(userId, id);
    await this.prisma.garment.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Dev/demo helper: replace empty wardrobe with sample motorcycle kit.
   * Refuses if wardrobe already has items (unless force=true).
   */
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

    const data = DEMO_MOTORCYCLE_WARDROBE.map((seed) => ({
      userId,
      ...expandDemoGarment(seed),
    }));
    await this.prisma.garment.createMany({ data });
    const garments = await this.list(userId);
    return { created: garments.length, garments };
  }

  meta() {
    return {
      categories: [...GARMENT_CATEGORIES],
      categoryDefaults: GARMENT_CATEGORY_DEFAULTS,
      activityTypes: [...ACTIVITY_TYPES],
      mvpActivityType: MVP_ACTIVITY_TYPE,
      tierScale: { min: 1, max: 5 },
    };
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
    brand: string | null;
    model: string | null;
    notes: string | null;
    activityTagsJson: string;
    createdAt: Date;
    updatedAt: Date;
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
      brand: g.brand,
      model: g.model,
      notes: g.notes,
      activityTags,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    };
  }
}
