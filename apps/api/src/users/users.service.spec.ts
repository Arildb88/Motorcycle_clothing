import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

type Profile = {
  userId: string;
  homeLat?: number;
  homeLon?: number;
  units: string;
  distanceUnit: string;
  speedUnit: string;
  windSpeedUnit: string;
  preferredLanguage?: string | null;
  defaultRouteId?: string;
  coldSensitivity: number;
  heatSensitivity: number;
  sweatTendency?: number;
  avatarUrl?: string | null;
  defaultActivity: string;
  showActivityChooserOnLaunch: boolean;
  interestedActivitiesJson: string;
  onboardingCompleted: boolean;
};

type StoredUser = {
  id: string;
  email: string | null;
  displayName: string;
  passwordHash: string | null;
  profile: Profile | null;
  motorcycleProfile: { category: string; windProtection: string } | null;
  authIdentities: Array<Record<string, unknown>>;
  connectedAccounts: Array<Record<string, unknown>>;
  personalOffsets: unknown[];
};

function assignDefined(target: object, data: object) {
  const record = target as Record<string, unknown>;
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) record[key] = value;
  }
}

describe('UsersService profile and account', () => {
  const users: StoredUser[] = [];

  function seed(partial?: Partial<StoredUser>): StoredUser {
    const user: StoredUser = {
      id: partial?.id ?? 'user-1',
      email: partial?.email ?? 'rider@example.com',
      displayName: partial?.displayName ?? 'Rider',
      passwordHash: partial?.passwordHash ?? 'hashed-secret',
      profile:
        partial?.profile === undefined
          ? {
              userId: partial?.id ?? 'user-1',
              units: 'celsius',
              distanceUnit: 'kilometer',
              speedUnit: 'kmh',
              windSpeedUnit: 'ms',
              coldSensitivity: 0,
              heatSensitivity: 0,
              defaultActivity: 'motorcycle',
              showActivityChooserOnLaunch: true,
              interestedActivitiesJson: JSON.stringify(['motorcycle']),
              onboardingCompleted: false,
            }
          : partial.profile,
      motorcycleProfile: partial?.motorcycleProfile ?? null,
      authIdentities: partial?.authIdentities ?? [
        {
          id: 'id-1',
          provider: 'local',
          providerEmail: 'rider@example.com',
          avatarUrl: null,
          createdAt: new Date('2026-10-02T00:00:00Z'),
        },
      ],
      connectedAccounts: partial?.connectedAccounts ?? [],
      personalOffsets: partial?.personalOffsets ?? [],
    };
    users.push(user);
    return user;
  }

  const prisma = {
    user: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) => {
        return users.find((user) => user.id === where.id) ?? null;
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: {
            displayName?: string;
            profile?: {
              upsert: {
                create: Record<string, unknown>;
                update: Record<string, unknown>;
              };
            };
            motorcycleProfile?: {
              upsert: {
                create: { category: string; windProtection: string };
                update: { category?: string; windProtection?: string };
              };
            };
          };
        }) => {
          const user = users.find((row) => row.id === where.id);
          if (!user) throw new Error('missing user');
          if (data.displayName !== undefined)
            user.displayName = data.displayName;
          if (data.profile) {
            if (!user.profile) {
              user.profile = {
                userId: user.id,
                onboardingCompleted: false,
                ...(data.profile.upsert.create as Profile),
              };
            } else {
              assignDefined(user.profile, data.profile.upsert.update);
            }
          }
          if (data.motorcycleProfile) {
            if (!user.motorcycleProfile) {
              user.motorcycleProfile = {
                ...data.motorcycleProfile.upsert.create,
              };
            } else {
              assignDefined(
                user.motorcycleProfile,
                data.motorcycleProfile.upsert.update,
              );
            }
          }
          return user;
        },
      ),
      delete: jest.fn(({ where }: { where: { id: string } }) => {
        const index = users.findIndex((user) => user.id === where.id);
        if (index < 0) throw new Error('missing user');
        const [removed] = users.splice(index, 1);
        return removed;
      }),
    },
    userProfile: {
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { userId: string };
          data: Record<string, unknown>;
        }) => {
          const user = users.find((row) => row.id === where.userId);
          if (!user?.profile) throw new Error('missing profile');
          assignDefined(user.profile, data);
          return user.profile;
        },
      ),
    },
  };

  const service = new UsersService(prisma as unknown as PrismaService);

  beforeEach(() => {
    users.length = 0;
  });

  it('returns the profile without the password hash', async () => {
    seed({
      displayName: 'Åse',
      connectedAccounts: [
        {
          id: 'conn-1',
          provider: 'strava',
          providerAccountId: '1',
          displayName: 'Åse',
          status: 'active',
          scopes: 'read',
          updatedAt: new Date('2026-10-02T00:00:00Z'),
          metadataJson: '{"athlete":"Åse"}',
        },
      ],
    });
    const me = await service.getMe('user-1');
    expect(me.displayName).toBe('Åse');
    expect(me).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(me)).not.toContain('hashed-secret');
    expect(me.profile?.interestedActivities).toEqual(['motorcycle']);
    expect(me.connectedAccounts[0]).toMatchObject({
      metadata: { athlete: 'Åse' },
      metadataJson: undefined,
    });
  });

  it('treats a corrupt activity list as empty and a missing user as not found', async () => {
    const user = seed();
    user.profile!.interestedActivitiesJson = '{';
    user.connectedAccounts = [
      {
        id: 'conn-1',
        provider: 'strava',
        providerAccountId: '1',
        displayName: null,
        status: 'active',
        scopes: '',
        updatedAt: new Date('2026-10-02T00:00:00Z'),
        metadataJson: '{',
      },
    ];
    const me = await service.getMe('user-1');
    expect(me.profile?.interestedActivities).toEqual([]);
    expect(me.connectedAccounts[0].metadata).toEqual({});
    await expect(service.getMe('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates a partial profile without resetting the saved activity', async () => {
    const user = seed();
    user.profile!.defaultActivity = 'cycling';
    user.profile!.interestedActivitiesJson = JSON.stringify([
      'cycling',
      'hiking',
    ]);
    user.motorcycleProfile = { category: 'touring', windProtection: 'high' };

    const me = await service.updateProfile('user-1', {
      displayName: 'Åse Ødegård',
    });

    expect(me.displayName).toBe('Åse Ødegård');
    expect(me.profile?.defaultActivity).toBe('cycling');
    expect(me.profile?.interestedActivities).toEqual(['cycling', 'hiking']);
    expect(me.motorcycleProfile).toEqual({
      category: 'touring',
      windProtection: 'high',
    });
    expect(me).not.toHaveProperty('passwordHash');
  });

  it('rejects a session activity as the stored profile default', async () => {
    const user = seed();
    await expect(
      service.updateProfile('user-1', { defaultActivity: 'alpine_skiing' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateProfile('user-1', { defaultActivity: 'xc_skiing' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(user.profile?.defaultActivity).toBe('motorcycle');
    expect(user.displayName).toBe('Rider');
  });

  it('stores an allowed profile default and motorcycle setup together', async () => {
    seed({ profile: null });
    const me = await service.updateProfile('user-1', {
      displayName: 'Rider',
      defaultActivity: 'hiking',
      interestedActivities: ['hiking', 'cycling'],
      motorcycleCategory: 'adventure',
      windProtection: 'medium',
      preferredLanguage: 'nb',
    });
    expect(me.profile?.defaultActivity).toBe('hiking');
    expect(me.profile?.interestedActivities).toEqual(['hiking', 'cycling']);
    expect(me.profile?.preferredLanguage).toBe('nb');
    expect(me.motorcycleProfile).toEqual({
      category: 'adventure',
      windProtection: 'medium',
    });
  });

  it('completes onboarding only for profile activities', async () => {
    const user = seed();
    await expect(
      service.completeOnboarding('user-1', {
        interestedActivities: ['snowboarding'],
        defaultActivity: 'snowboarding',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(user.profile?.onboardingCompleted).toBe(false);

    const me = await service.completeOnboarding('user-1', {
      interestedActivities: ['cycling', 'hiking'],
      showActivityChooserOnLaunch: false,
    });
    expect(me.profile?.onboardingCompleted).toBe(true);
    expect(me.profile?.defaultActivity).toBe('cycling');
    expect(me.profile?.interestedActivities).toEqual(['cycling', 'hiking']);
    expect(me.profile?.showActivityChooserOnLaunch).toBe(false);
  });

  it('deletes the account and then refuses to load it', async () => {
    seed();
    seed({ id: 'other', email: 'other@example.com' });
    await expect(service.deleteAccount('user-1')).resolves.toEqual({
      ok: true,
    });
    await expect(service.getMe('user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.getMe('other')).resolves.toMatchObject({
      email: 'other@example.com',
    });
  });
});
