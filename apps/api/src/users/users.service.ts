import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createLocalUser(input: {
    email: string;
    displayName: string;
    passwordHash: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        passwordHash: input.passwordHash,
        profile: { create: {} },
        comfortSettings: { create: {} },
        authProviders: {
          create: {
            provider: 'local',
            providerUserId: input.email,
          },
        },
      },
    });
  }

  async createOAuthUser(input: {
    email: string | null;
    displayName: string;
    provider: string;
    providerUserId: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        profile: { create: {} },
        comfortSettings: { create: {} },
        authProviders: {
          create: {
            provider: input.provider,
            providerUserId: input.providerUserId,
          },
        },
      },
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        comfortSettings: true,
        authProviders: { select: { provider: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName,
        profile: {
          upsert: {
            create: {
              homeLat: dto.homeLat,
              homeLon: dto.homeLon,
              units: dto.units ?? 'celsius',
              defaultRouteId: dto.defaultRouteId,
            },
            update: {
              homeLat: dto.homeLat,
              homeLon: dto.homeLon,
              units: dto.units,
              defaultRouteId: dto.defaultRouteId,
            },
          },
        },
      },
    });
    return this.getMe(userId);
  }
}
