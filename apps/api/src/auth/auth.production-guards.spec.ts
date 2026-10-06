jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

describe('production auth guards', () => {
  const passwordHash = bcrypt.hashSync('password1', 10);
  const users = [
    {
      id: 'u1',
      email: 'rider@example.com',
      displayName: 'Rider',
      passwordHash,
    },
  ];

  function config(nodeEnv: string, allowDemo = 'true') {
    return {
      get: (key: string, fallback?: string) => {
        if (key === 'NODE_ENV') return nodeEnv;
        if (key === 'ALLOW_DEMO_OAUTH') return allowDemo;
        return fallback;
      },
    };
  }

  async function serviceFor(nodeEnv: string) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(async ({ where }: { where: { email?: string } }) =>
                users.find((user) => user.email === where.email) ?? null,
              ),
            },
            passwordResetToken: {
              deleteMany: jest.fn(async () => ({ count: 0 })),
              create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => data),
            },
          },
        },
        {
          provide: UsersService,
          useValue: { createOAuthUser: jest.fn(), createLocalUser: jest.fn() },
        },
        { provide: JwtService, useValue: { sign: () => 'jwt-token' } },
        { provide: ConfigService, useValue: config(nodeEnv) },
      ],
    }).compile();
    return moduleRef.get(AuthService);
  }

  it('rejects demo oauth in production even when ALLOW_DEMO_OAUTH is true', async () => {
    const service = await serviceFor('production');
    await expect(
      service.oauthLegacy({ provider: 'facebook', accessToken: 'demo:fb-1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not return a reset token in production', async () => {
    const service = await serviceFor('production');
    const res = await service.forgotPassword({ email: 'rider@example.com' });
    expect(res).toEqual({
      ok: true,
      message: expect.stringContaining('If an account exists'),
    });
    expect(res).not.toHaveProperty('devResetToken');
  });
});
