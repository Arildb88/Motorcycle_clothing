jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

describe('AuthService login/register/password reset', () => {
  let service: AuthService;
  const users: Array<{
    id: string;
    email: string | null;
    displayName: string;
    passwordHash: string | null;
  }> = [];
  const resetTokens: Array<{
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
  }> = [];

  const prismaMock = {
    user: {
      findUnique: jest.fn(
        async ({ where }: { where: { email?: string; id?: string } }) => {
          if (where.email) {
            return users.find((u) => u.email === where.email) ?? null;
          }
          if (where.id) {
            return users.find((u) => u.id === where.id) ?? null;
          }
          return null;
        },
      ),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { passwordHash: string };
        }) => {
          const user = users.find((u) => u.id === where.id);
          if (!user) throw new Error('missing user');
          user.passwordHash = data.passwordHash;
          return user;
        },
      ),
    },
    passwordResetToken: {
      deleteMany: jest.fn(async ({ where }: { where: { userId: string } }) => {
        for (let i = resetTokens.length - 1; i >= 0; i--) {
          if (resetTokens[i].userId === where.userId && !resetTokens[i].usedAt) {
            resetTokens.splice(i, 1);
          }
        }
        return { count: 0 };
      }),
      create: jest.fn(
        async ({
          data,
        }: {
          data: { userId: string; tokenHash: string; expiresAt: Date };
        }) => {
          const row = {
            id: `prt_${resetTokens.length + 1}`,
            usedAt: null as Date | null,
            ...data,
          };
          resetTokens.push(row);
          return row;
        },
      ),
      findUnique: jest.fn(
        async ({ where }: { where: { tokenHash: string } }) => {
          const row = resetTokens.find((t) => t.tokenHash === where.tokenHash);
          if (!row) return null;
          const user = users.find((u) => u.id === row.userId);
          return { ...row, user };
        },
      ),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { usedAt: Date };
        }) => {
          const row = resetTokens.find((t) => t.id === where.id);
          if (!row) throw new Error('missing token');
          row.usedAt = data.usedAt;
          return row;
        },
      ),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) =>
      Promise.all(ops),
    ),
    authIdentity: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    oAuthState: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  const usersMock = {
    createLocalUser: jest.fn(
      async (input: {
        email: string;
        displayName: string;
        passwordHash: string;
      }) => {
        const user = {
          id: `u_${users.length + 1}`,
          email: input.email,
          displayName: input.displayName,
          passwordHash: input.passwordHash,
        };
        users.push(user);
        return user;
      },
    ),
    createOAuthUser: jest.fn(),
    getMe: jest.fn(),
  };

  beforeEach(async () => {
    users.length = 0;
    resetTokens.length = 0;
    jest.clearAllMocks();
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

  it('registers a local user and returns a token', async () => {
    const res = await service.register({
      email: 'Rider@Example.com',
      password: 'password1',
      displayName: 'Rider',
    });
    expect(res.accessToken).toBe('jwt-token');
    expect(users[0].email).toBe('rider@example.com');
    expect(usersMock.createLocalUser).toHaveBeenCalled();
  });

  it('rejects duplicate email with EMAIL_ALREADY_REGISTERED', async () => {
    users.push({
      id: 'u1',
      email: 'taken@example.com',
      displayName: 'Taken',
      passwordHash: 'hash',
    });
    await expect(
      service.register({
        email: 'taken@example.com',
        password: 'password1',
        displayName: 'Other',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'EMAIL_ALREADY_REGISTERED',
      }),
    });
    await expect(
      service.register({
        email: 'taken@example.com',
        password: 'password1',
        displayName: 'Other',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('keeps a Norwegian display name and trims surrounding spaces', async () => {
    await service.register({
      email: 'ase@example.com',
      password: 'password1',
      displayName: '  Åse Ødegård  ',
    });
    expect(users[0].displayName).toBe('Åse Ødegård');
    expect(users[0].email).toBe('ase@example.com');
  });

  it('logs in with valid credentials', async () => {
    const passwordHash = await bcrypt.hash('password1', 10);
    users.push({
      id: 'u1',
      email: 'rider@example.com',
      displayName: 'Rider',
      passwordHash,
    });
    const res = await service.login({
      email: 'Rider@example.com',
      password: 'password1',
    });
    expect(res.accessToken).toBe('jwt-token');
    expect(res.user.email).toBe('rider@example.com');
  });

  it('rejects an unknown email with the same invalid-credentials error', async () => {
    await expect(
      service.login({ email: 'missing@example.com', password: 'password1' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_CREDENTIALS' }),
    });
  });

  it('rejects invalid login credentials', async () => {
    const passwordHash = await bcrypt.hash('password1', 10);
    users.push({
      id: 'u1',
      email: 'rider@example.com',
      displayName: 'Rider',
      passwordHash,
    });
    await expect(
      service.login({ email: 'rider@example.com', password: 'wrong-pass' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('forgot-password returns the same shape when email is unknown', async () => {
    const res = await service.forgotPassword({ email: 'nobody@example.com' });
    expect(res.ok).toBe(true);
    expect(res.message).toContain('If an account exists');
    expect((res as { devResetToken?: string }).devResetToken).toBeUndefined();
    expect(resetTokens).toHaveLength(0);
  });

  it('forgot-password issues a hashed token and exposes devResetToken in non-prod', async () => {
    const passwordHash = await bcrypt.hash('password1', 10);
    users.push({
      id: 'u1',
      email: 'rider@example.com',
      displayName: 'Rider',
      passwordHash,
    });
    const res = await service.forgotPassword({ email: 'rider@example.com' });
    expect(res.ok).toBe(true);
    expect(res.devResetToken).toBeTruthy();
    expect(resetTokens).toHaveLength(1);
    const expectedHash = createHash('sha256')
      .update(res.devResetToken!)
      .digest('hex');
    expect(resetTokens[0].tokenHash).toBe(expectedHash);
    expect(resetTokens[0].tokenHash).not.toBe(res.devResetToken);
  });

  it('reset-password accepts a valid token once', async () => {
    const passwordHash = await bcrypt.hash('old-password', 10);
    users.push({
      id: 'u1',
      email: 'rider@example.com',
      displayName: 'Rider',
      passwordHash,
    });
    const forgot = await service.forgotPassword({ email: 'rider@example.com' });
    const token = forgot.devResetToken!;
    const ok = await service.resetPassword({
      token,
      password: 'new-password',
    });
    expect(ok.ok).toBe(true);
    const matches = await bcrypt.compare('new-password', users[0].passwordHash!);
    expect(matches).toBe(true);

    await expect(
      service.resetPassword({ token, password: 'another-password' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reset-password rejects expired tokens', async () => {
    users.push({
      id: 'u1',
      email: 'rider@example.com',
      displayName: 'Rider',
      passwordHash: 'hash',
    });
    const raw = 'expired-token-value-1234567890';
    resetTokens.push({
      id: 'prt_old',
      userId: 'u1',
      tokenHash: createHash('sha256').update(raw).digest('hex'),
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
    });
    await expect(
      service.resetPassword({ token: raw, password: 'new-password' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_RESET_TOKEN' }),
    });
  });

  it('change-password rejects an incorrect current password', async () => {
    const passwordHash = await bcrypt.hash('current-password', 10);
    users.push({
      id: 'u1',
      email: 'rider@example.com',
      displayName: 'Rider',
      passwordHash,
    });
    await expect(
      service.changePassword('u1', {
        currentPassword: 'wrong-password',
        newPassword: 'new-password',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_CURRENT_PASSWORD' }),
    });
    expect(await bcrypt.compare('current-password', users[0].passwordHash!)).toBe(
      true,
    );
  });

  it('change-password updates the hash when the current password is correct', async () => {
    const passwordHash = await bcrypt.hash('current-password', 10);
    users.push({
      id: 'u1',
      email: 'rider@example.com',
      displayName: 'Rider',
      passwordHash,
    });
    const res = await service.changePassword('u1', {
      currentPassword: 'current-password',
      newPassword: 'new-password',
    });
    expect(res.ok).toBe(true);
    expect(await bcrypt.compare('new-password', users[0].passwordHash!)).toBe(
      true,
    );
    expect(
      await bcrypt.compare('current-password', users[0].passwordHash!),
    ).toBe(false);
  });

  it('change-password rejects accounts that have no local password', async () => {
    users.push({
      id: 'oauth',
      email: 'oauth@example.com',
      displayName: 'OAuth',
      passwordHash: null,
    });
    await expect(
      service.changePassword('oauth', {
        currentPassword: 'anything',
        newPassword: 'new-password',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'NO_LOCAL_PASSWORD' }),
    });
  });
});
