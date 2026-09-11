import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';

@Injectable()
export class RoutesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.route.findMany({
      where: { userId },
      orderBy: [{ isDefaultCommute: 'desc' }, { name: 'asc' }],
    });
  }

  async get(userId: string, id: string) {
    const route = await this.prisma.route.findUnique({ where: { id } });
    if (!route) throw new NotFoundException('Route not found');
    if (route.userId !== userId) throw new ForbiddenException();
    return route;
  }

  async create(userId: string, dto: CreateRouteDto) {
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
        name: dto.name,
        isDefaultCommute: makeDefault,
        startLat: dto.startLat,
        startLon: dto.startLon,
        startLabel: dto.startLabel,
        endLat: dto.endLat,
        endLon: dto.endLon,
        endLabel: dto.endLabel,
        waypointsJson: JSON.stringify(dto.waypoints ?? []),
        typicalDurationMin: dto.typicalDurationMin ?? 30,
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

    return this.prisma.route.update({
      where: { id },
      data: {
        name: dto.name,
        isDefaultCommute: dto.isDefaultCommute,
        startLat: dto.startLat,
        startLon: dto.startLon,
        startLabel: dto.startLabel,
        endLat: dto.endLat,
        endLon: dto.endLon,
        endLabel: dto.endLabel,
        waypointsJson:
          dto.waypoints !== undefined
            ? JSON.stringify(dto.waypoints)
            : undefined,
        typicalDurationMin: dto.typicalDurationMin,
      },
    });
  }

  async remove(userId: string, id: string) {
    const route = await this.get(userId, id);
    await this.prisma.route.delete({ where: { id } });
    if (route.isDefaultCommute) {
      const next = await this.prisma.route.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
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
    return this.prisma.route.findFirst({
      where: { userId, isDefaultCommute: true },
    });
  }
}
