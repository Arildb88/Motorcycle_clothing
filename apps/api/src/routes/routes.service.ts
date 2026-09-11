import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { PlanFromRouteDto } from './dto/plan-from-route.dto';
import {
  isActivityType,
  isRouteCategory,
  isRouteKind,
  MVP_ACTIVITY_TYPE,
  type RouteKind,
} from '../domain';

export type WaypointInput = {
  lat: number;
  lon: number;
  label?: string | null;
  address?: string | null;
  waypointType?: string | null;
};

@Injectable()
export class RoutesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, activityType?: string) {
    return this.prisma.route.findMany({
      where: {
        userId,
        ...(activityType ? { activityType } : {}),
      },
      include: {
        waypoints: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [
        { isFavorite: 'desc' },
        { lastUsedAt: 'desc' },
        { updatedAt: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async get(userId: string, id: string) {
    const route = await this.prisma.route.findUnique({
      where: { id },
      include: {
        waypoints: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!route) throw new NotFoundException('Route not found');
    if (route.userId !== userId) throw new ForbiddenException();
    return this.ensureWaypoints(route);
  }

  async create(userId: string, dto: CreateRouteDto) {
    const waypoints = this.resolveWaypoints(dto);
    const routeKind = this.resolveRouteKind(dto.routeKind, waypoints);
    const activityType = this.resolveActivityType(dto.activityType);
    const category = this.resolveCategory(dto.category);
    const ends = this.endsFromWaypoints(waypoints);

    const count = await this.prisma.route.count({ where: { userId } });
    const makeDefault = dto.isDefaultCommute === true || count === 0;

    if (makeDefault) {
      await this.prisma.route.updateMany({
        where: { userId, isDefaultCommute: true },
        data: { isDefaultCommute: false },
      });
    }

    const route = await this.prisma.route.create({
      data: {
        userId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        activityType,
        routeKind,
        category,
        isFavorite: dto.isFavorite === true,
        isDefaultCommute: makeDefault,
        ...ends,
        waypointsJson: JSON.stringify(waypoints),
        typicalDurationMin: dto.typicalDurationMin ?? 30,
        waypoints: {
          create: waypoints.map((w, i) => ({
            sortOrder: i,
            lat: w.lat,
            lon: w.lon,
            label: w.label ?? null,
            address: w.address ?? null,
            waypointType: w.waypointType ?? this.defaultWaypointType(i, waypoints.length),
          })),
        },
      },
      include: {
        waypoints: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (makeDefault) {
      await this.prisma.userProfile.updateMany({
        where: { userId },
        data: { defaultRouteId: route.id },
      });
    }

    return route;
  }

  async update(userId: string, id: string, dto: UpdateRouteDto) {
    await this.get(userId, id);

    if (dto.isDefaultCommute === true) {
      await this.prisma.route.updateMany({
        where: { userId, isDefaultCommute: true },
        data: { isDefaultCommute: false },
      });
      await this.prisma.userProfile.updateMany({
        where: { userId },
        data: { defaultRouteId: id },
      });
    }

    const data: Record<string, unknown> = {
      name: dto.name?.trim(),
      description:
        dto.description === undefined
          ? undefined
          : dto.description?.trim() || null,
      activityType:
        dto.activityType !== undefined
          ? this.resolveActivityType(dto.activityType)
          : undefined,
      category:
        dto.category === undefined
          ? undefined
          : this.resolveCategory(dto.category),
      isFavorite: dto.isFavorite,
      isDefaultCommute: dto.isDefaultCommute,
      typicalDurationMin: dto.typicalDurationMin,
    };

    if (dto.waypoints !== undefined) {
      const waypoints = this.normalizeWaypoints(dto.waypoints);
      const routeKind = this.resolveRouteKind(dto.routeKind, waypoints);
      const ends = this.endsFromWaypoints(waypoints);
      Object.assign(data, ends, {
        routeKind,
        waypointsJson: JSON.stringify(waypoints),
      });

      await this.prisma.$transaction([
        this.prisma.routeWaypoint.deleteMany({ where: { routeId: id } }),
        this.prisma.routeWaypoint.createMany({
          data: waypoints.map((w, i) => ({
            routeId: id,
            sortOrder: i,
            lat: w.lat,
            lon: w.lon,
            label: w.label ?? null,
            address: w.address ?? null,
            waypointType:
              w.waypointType ?? this.defaultWaypointType(i, waypoints.length),
          })),
        }),
        this.prisma.route.update({
          where: { id },
          data,
        }),
      ]);
    } else {
      if (dto.routeKind !== undefined) {
        if (!isRouteKind(dto.routeKind)) {
          throw new BadRequestException(`Invalid routeKind: ${dto.routeKind}`);
        }
        data.routeKind = dto.routeKind;
      }
      if (dto.startLat !== undefined) data.startLat = dto.startLat;
      if (dto.startLon !== undefined) data.startLon = dto.startLon;
      if (dto.startLabel !== undefined) data.startLabel = dto.startLabel;
      if (dto.endLat !== undefined) data.endLat = dto.endLat;
      if (dto.endLon !== undefined) data.endLon = dto.endLon;
      if (dto.endLabel !== undefined) data.endLabel = dto.endLabel;

      await this.prisma.route.update({ where: { id }, data });
    }

    return this.get(userId, id);
  }

  async remove(userId: string, id: string) {
    const route = await this.get(userId, id);
    // Plans/logs keep snapshotJson / weather summaries; routeId SetNull via FK.
    await this.prisma.route.delete({ where: { id } });
    if (route.isDefaultCommute) {
      const next = await this.prisma.route.findFirst({
        where: { userId },
        orderBy: [{ isFavorite: 'desc' }, { createdAt: 'asc' }],
      });
      if (next) {
        await this.prisma.route.update({
          where: { id: next.id },
          data: { isDefaultCommute: true },
        });
        await this.prisma.userProfile.updateMany({
          where: { userId },
          data: { defaultRouteId: next.id },
        });
      } else {
        await this.prisma.userProfile.updateMany({
          where: { userId },
          data: { defaultRouteId: null },
        });
      }
    }
    return { ok: true };
  }

  async getDefault(userId: string) {
    const route = await this.prisma.route.findFirst({
      where: { userId, isDefaultCommute: true },
      include: {
        waypoints: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return route ? this.ensureWaypoints(route) : null;
  }

  async touchLastUsed(userId: string, id: string) {
    await this.get(userId, id);
    return this.prisma.route.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  /**
   * Creates an ActivityPlan from a saved Route.
   * Snapshot preserves geometry for history if the Route is later edited/deleted.
   * Does NOT store weather or clothing recommendations on the Route.
   */
  async planFromRoute(userId: string, id: string, dto: PlanFromRouteDto) {
    const route = await this.get(userId, id);
    const departureAt = dto.departureAt
      ? new Date(dto.departureAt)
      : new Date();
    if (Number.isNaN(departureAt.getTime())) {
      throw new BadRequestException('Invalid departureAt');
    }
    const durationMin = dto.durationMin ?? route.typicalDurationMin;

    const snapshot = {
      version: 1,
      source: 'saved_route',
      savedRouteId: route.id,
      name: route.name,
      description: route.description,
      activityType: route.activityType,
      routeKind: route.routeKind,
      category: route.category,
      typicalDurationMin: route.typicalDurationMin,
      waypoints: route.waypoints.map((w) => ({
        sortOrder: w.sortOrder,
        lat: w.lat,
        lon: w.lon,
        label: w.label,
        address: w.address,
        waypointType: w.waypointType,
      })),
      startLat: route.startLat,
      startLon: route.startLon,
      startLabel: route.startLabel,
      endLat: route.endLat,
      endLon: route.endLon,
      endLabel: route.endLabel,
      snappedAt: new Date().toISOString(),
    };

    const plan = await this.prisma.activityPlan.create({
      data: {
        userId,
        activityType: route.activityType,
        routeId: route.id,
        departureAt,
        durationMin,
        snapshotJson: JSON.stringify(snapshot),
      },
    });

    await this.prisma.route.update({
      where: { id: route.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      plan,
      route: {
        id: route.id,
        name: route.name,
        routeKind: route.routeKind,
        typicalDurationMin: route.typicalDurationMin,
      },
      note: 'Weather and clothing must be recalculated for this departure; do not reuse prior recommendations.',
    };
  }

  /** Weather sample points: all waypoints when present, else start/end. */
  weatherPointsFor(route: {
    startLat: number;
    startLon: number;
    endLat: number;
    endLon: number;
    waypoints?: Array<{ lat: number; lon: number }>;
  }): Array<{ lat: number; lon: number }> {
    if (route.waypoints && route.waypoints.length >= 2) {
      return route.waypoints.map((w) => ({ lat: w.lat, lon: w.lon }));
    }
    return [
      { lat: route.startLat, lon: route.startLon },
      { lat: route.endLat, lon: route.endLon },
    ];
  }

  private resolveWaypoints(dto: CreateRouteDto): WaypointInput[] {
    if (dto.waypoints && dto.waypoints.length >= 2) {
      return this.normalizeWaypoints(dto.waypoints);
    }
    if (
      dto.startLat == null ||
      dto.startLon == null ||
      dto.endLat == null ||
      dto.endLon == null
    ) {
      throw new BadRequestException(
        'Provide waypoints (≥2) or startLat/startLon/endLat/endLon',
      );
    }
    this.assertCoords(dto.startLat, dto.startLon);
    this.assertCoords(dto.endLat, dto.endLon);
    return [
      {
        lat: dto.startLat,
        lon: dto.startLon,
        label: dto.startLabel,
        waypointType: 'start',
      },
      {
        lat: dto.endLat,
        lon: dto.endLon,
        label: dto.endLabel,
        waypointType: 'end',
      },
    ];
  }

  normalizeWaypoints(waypoints: WaypointInput[]): WaypointInput[] {
    if (waypoints.length < 2) {
      throw new BadRequestException('A route needs at least 2 waypoints');
    }
    return waypoints.map((w, i) => {
      this.assertCoords(w.lat, w.lon);
      return {
        lat: w.lat,
        lon: w.lon,
        label: w.label?.trim() || null,
        address: w.address?.trim() || null,
        waypointType: w.waypointType ?? this.defaultWaypointType(i, waypoints.length),
      };
    });
  }

  private resolveRouteKind(
    explicit: string | undefined,
    waypoints: WaypointInput[],
  ): RouteKind {
    if (explicit) {
      if (!isRouteKind(explicit)) {
        throw new BadRequestException(`Invalid routeKind: ${explicit}`);
      }
      return explicit;
    }
    if (waypoints.length === 2) return 'point_to_point';
    const first = waypoints[0];
    const last = waypoints[waypoints.length - 1];
    if (this.near(first.lat, first.lon, last.lat, last.lon)) return 'loop';
    return 'multi_stop';
  }

  private resolveActivityType(value?: string): string {
    const v = value ?? MVP_ACTIVITY_TYPE;
    if (!isActivityType(v)) {
      throw new BadRequestException(`Invalid activityType: ${v}`);
    }
    return v;
  }

  private resolveCategory(value?: string | null): string | null {
    if (value == null || value === '') return null;
    if (!isRouteCategory(value)) {
      throw new BadRequestException(`Invalid category: ${value}`);
    }
    return value;
  }

  private endsFromWaypoints(waypoints: WaypointInput[]) {
    const first = waypoints[0];
    const last = waypoints[waypoints.length - 1];
    return {
      startLat: first.lat,
      startLon: first.lon,
      startLabel: first.label ?? null,
      endLat: last.lat,
      endLon: last.lon,
      endLabel: last.label ?? null,
    };
  }

  private defaultWaypointType(index: number, total: number): string {
    if (index === 0) return 'start';
    if (index === total - 1) return 'end';
    return 'stop';
  }

  assertCoords(lat: number, lon: number) {
    if (
      typeof lat !== 'number' ||
      typeof lon !== 'number' ||
      Number.isNaN(lat) ||
      Number.isNaN(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      throw new BadRequestException(
        `Invalid coordinates: lat=${lat}, lon=${lon}`,
      );
    }
  }

  /** ~150 m — enough to treat round-trips ending "at home" as loops. */
  private near(lat1: number, lon1: number, lat2: number, lon2: number): boolean {
    const dLat = (lat1 - lat2) * 111_000;
    const dLon =
      (lon1 - lon2) * 111_000 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
    return Math.hypot(dLat, dLon) < 150;
  }

  /**
   * Backfill RouteWaypoint rows from denormalized start/end when missing
   * (routes created before this migration).
   */
  private async ensureWaypoints<
    T extends {
      id: string;
      startLat: number;
      startLon: number;
      startLabel: string | null;
      endLat: number;
      endLon: number;
      endLabel: string | null;
      waypointsJson: string;
      waypoints: Array<{
        id: string;
        sortOrder: number;
        lat: number;
        lon: number;
        label: string | null;
        address: string | null;
        waypointType: string | null;
      }>;
    },
  >(route: T): Promise<T> {
    if (route.waypoints.length >= 2) return route;

    let fromJson: WaypointInput[] = [];
    try {
      const parsed = JSON.parse(route.waypointsJson || '[]') as WaypointInput[];
      if (Array.isArray(parsed) && parsed.length >= 2) {
        fromJson = this.normalizeWaypoints(parsed);
      }
    } catch {
      fromJson = [];
    }

    const waypoints =
      fromJson.length >= 2
        ? fromJson
        : [
            {
              lat: route.startLat,
              lon: route.startLon,
              label: route.startLabel,
              waypointType: 'start',
            },
            {
              lat: route.endLat,
              lon: route.endLon,
              label: route.endLabel,
              waypointType: 'end',
            },
          ];

    await this.prisma.routeWaypoint.createMany({
      data: waypoints.map((w, i) => ({
        routeId: route.id,
        sortOrder: i,
        lat: w.lat,
        lon: w.lon,
        label: w.label ?? null,
        address: w.address ?? null,
        waypointType: w.waypointType ?? this.defaultWaypointType(i, waypoints.length),
      })),
    });

    const refreshed = await this.prisma.route.findUnique({
      where: { id: route.id },
      include: {
        waypoints: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return (refreshed ?? route) as T;
  }
}
