jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

describe('AuthService account linking rules', () => {
  let service: AuthService;
  const identities: Record<string, unknown>[] = [];
  const users: Record<string, unknown>[] = [];

  const prismaMock = {
    authIdentity: {
      findUnique: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
        if ('provider_providerSubjectId' in where) {
          const key = where.provider_providerSubjectId as {
            provider: string;
            providerSubjectId: string;
          };
          return (
            identities.find(
              (i) =>
                i.provider === key.provider &&
                i.providerSubjectId === key.providerSubjectId,
            ) ?? null
          );
        }
        return null;
      }),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `ai_${identities.length}`, ...data };
        identities.push(row);
        return row;
      }),
    },
    user: {
      findUnique: jest.fn(async ({ where }: { where: { email?: string } }) => {
        if (where.email) {
          return users.find((u) => u.email === where.email) ?? null;
        }
        return null;
      }),
    },
    oAuthState: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  const usersMock = {
    createOAuthUser: jest.fn(async (input: Record<string, unknown>) => {
      const user = {
        id: `u_${users.length + 1}`,
        email: input.email,
        displayName: input.displayName,
      };
      users.push(user);
      identities.push({
        provider: input.provider,
        providerSubjectId: input.providerSubjectId,
        userId: user.id,
        user,
      });
      return user;
    }),
    getMe: jest.fn(async (userId: string) => ({ id: userId })),
  };

  beforeEach(async () => {
    identities.length = 0;
    users.length = 0;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: UsersService, useValue: usersMock },
        {
          provide: JwtService,
          useValue: { sign: () => 'jwt-token' },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, fallback?: string) => {
              if (key === 'NODE_ENV') return 'test';
              if (key === 'ALLOW_DEMO_OAUTH') return 'true';
              return fallback;
            },
          },
        },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('creates a new user for demo facebook identity', async () => {
    const res = await service.oauthLegacy({
      provider: 'facebook',
      accessToken: 'demo:fb-1',
    });
    expect(res.accessToken).toBe('jwt-token');
    expect(usersMock.createOAuthUser).toHaveBeenCalled();
  });

  it('refuses silent email merge when email already belongs to another user', async () => {
    users.push({ id: 'existing', email: 'taken@example.com' });
    // Force facebook configured path with graph would need network;
    // instead simulate via loginWithIdentity through a configured stub:
    // Use demo identity that includes email by temporarily calling private via legacy without email — 
    // Cover Conflict by creating oauth user then attempting second path:
    await service.oauthLegacy({ provider: 'facebook', accessToken: 'demo:fb-a' });

    // Manually insert email collision scenario into create path:
    usersMock.createOAuthUser.mockClear();
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'other',
      email: 'taken@example.com',
    });

    // We need an identity with email — use microsoft demo then patch:
    // Directly test through reflect: call private method via any
    await expect(
      (service as unknown as {
        loginWithIdentity: (i: Record<string, unknown>) => Promise<unknown>;
      }).loginWithIdentity({
        provider: 'facebook',
        providerSubjectId: 'new-subject',
        email: 'taken@example.com',
        displayName: 'X',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('reports provider status without secrets', () => {
    const status = service.providersStatus();
    expect(status.email.enabled).toBe(true);
    expect(status.facebook.enabled).toBe(false);
    expect(status.microsoft.enabled).toBe(false);
  });
});
