import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MVP_ACTIVITY_TYPE } from '../domain';

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
        profile: { create: { coldSensitivity: 0 } },
        motorcycleProfile: { create: {} },
        personalOffsets: {
          create: {
            activityType: MVP_ACTIVITY_TYPE,
            zone: 'overall',
            n: 0,
            meanResidual: 0,
          },
        },
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
        profile: { create: { coldSensitivity: 0 } },
        motorcycleProfile: { create: {} },
        personalOffsets: {
          create: {
            activityType: MVP_ACTIVITY_TYPE,
            zone: 'overall',
            n: 0,
            meanResidual: 0,
          },
        },
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
        motorcycleProfile: true,
        authProviders: { select: { provider: true } },
        personalOffsets: true,
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
              coldSensitivity: dto.coldSensitivity ?? 0,
            },
            update: {
              homeLat: dto.homeLat,
              homeLon: dto.homeLon,
              units: dto.units,
              defaultRouteId: dto.defaultRouteId,
              coldSensitivity: dto.coldSensitivity,
            },
          },
        },
        motorcycleProfile:
          dto.motorcycleCategory !== undefined ||
          dto.windProtection !== undefined
            ? {
                upsert: {
                  create: {
                    category: dto.motorcycleCategory ?? 'naked',
                    windProtection: dto.windProtection ?? 'low',
                  },
                  update: {
                    category: dto.motorcycleCategory,
                    windProtection: dto.windProtection,
                  },
                },
              }
            : undefined,
      },
    });
    return this.getMe(userId);
  }
}
