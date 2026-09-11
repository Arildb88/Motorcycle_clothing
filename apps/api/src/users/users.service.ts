import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { MVP_ACTIVITY_TYPE } from '../domain';
import { isSelectableActivity } from '../domain/oauth-utils';

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
        profile: {
          create: {
            coldSensitivity: 0,
            defaultActivity: 'motorcycle',
            showActivityChooserOnLaunch: true,
            interestedActivitiesJson: JSON.stringify(['motorcycle']),
            onboardingCompleted: false,
          },
        },
        motorcycleProfile: { create: {} },
        personalOffsets: {
          create: {
            activityType: MVP_ACTIVITY_TYPE,
            zone: 'overall',
            n: 0,
            meanResidual: 0,
          },
        },
        authIdentities: {
          create: {
            provider: 'local',
            providerSubjectId: input.email,
            providerEmail: input.email,
          },
        },
      },
    });
  }

  async createOAuthUser(input: {
    email: string | null;
    displayName: string;
    provider: string;
    providerSubjectId: string;
    avatarUrl?: string | null;
  }) {
    return this.prisma.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        profile: {
          create: {
            coldSensitivity: 0,
            defaultActivity: 'motorcycle',
            showActivityChooserOnLaunch: true,
            interestedActivitiesJson: JSON.stringify(['motorcycle']),
            onboardingCompleted: false,
            avatarUrl: input.avatarUrl ?? null,
          },
        },
        motorcycleProfile: { create: {} },
        personalOffsets: {
          create: {
            activityType: MVP_ACTIVITY_TYPE,
            zone: 'overall',
            n: 0,
            meanResidual: 0,
          },
        },
        authIdentities: {
          create: {
            provider: input.provider,
            providerSubjectId: input.providerSubjectId,
            providerEmail: input.email,
            avatarUrl: input.avatarUrl ?? null,
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
        authIdentities: {
          select: {
            id: true,
            provider: true,
            providerEmail: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
        connectedAccounts: {
          select: {
            id: true,
            provider: true,
            providerAccountId: true,
            displayName: true,
            status: true,
            scopes: true,
            updatedAt: true,
            metadataJson: true,
          },
        },
        personalOffsets: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash: _, ...safe } = user;
    return {
      ...safe,
      connectedAccounts: user.connectedAccounts.map((c) => ({
        ...c,
        metadata: safeJson(c.metadataJson),
        metadataJson: undefined,
      })),
      profile: user.profile
        ? {
            ...user.profile,
            interestedActivities: safeJsonArray(
              user.profile.interestedActivitiesJson,
            ),
          }
        : null,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.defaultActivity && !isSelectableActivity(dto.defaultActivity)) {
      throw new BadRequestException('Invalid default activity');
    }
    const interestedJson =
      dto.interestedActivities !== undefined
        ? JSON.stringify(dto.interestedActivities)
        : undefined;

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
              heatSensitivity: dto.heatSensitivity ?? 0,
              sweatTendency: dto.sweatTendency,
              avatarUrl: dto.avatarUrl,
              defaultActivity: dto.defaultActivity ?? 'motorcycle',
              showActivityChooserOnLaunch:
                dto.showActivityChooserOnLaunch ?? true,
              interestedActivitiesJson:
                interestedJson ?? JSON.stringify(['motorcycle']),
            },
            update: {
              homeLat: dto.homeLat,
              homeLon: dto.homeLon,
              units: dto.units,
              defaultRouteId: dto.defaultRouteId,
              coldSensitivity: dto.coldSensitivity,
              heatSensitivity: dto.heatSensitivity,
              sweatTendency: dto.sweatTendency,
              avatarUrl: dto.avatarUrl,
              defaultActivity: dto.defaultActivity,
              showActivityChooserOnLaunch: dto.showActivityChooserOnLaunch,
              interestedActivitiesJson: interestedJson,
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

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    const activities = dto.interestedActivities?.length
      ? dto.interestedActivities
      : ['motorcycle'];
    for (const a of activities) {
      if (!isSelectableActivity(a)) {
        throw new BadRequestException(`Invalid activity: ${a}`);
      }
    }
    const defaultActivity = dto.defaultActivity ?? activities[0];
    if (!isSelectableActivity(defaultActivity)) {
      throw new BadRequestException('Invalid default activity');
    }
    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        interestedActivitiesJson: JSON.stringify(activities),
        defaultActivity,
        showActivityChooserOnLaunch: dto.showActivityChooserOnLaunch ?? true,
        coldSensitivity: dto.coldSensitivity ?? 0,
        onboardingCompleted: true,
      },
    });
    return this.getMe(userId);
  }

  async deleteAccount(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
    return { ok: true };
  }
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function safeJsonArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
