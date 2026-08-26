import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { OAuthDto } from './dto/oauth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.createLocalUser({
      email: dto.email.toLowerCase(),
      displayName: dto.displayName,
      passwordHash,
    });
    return this.tokenResponse(user.id, user.email, user.displayName);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.tokenResponse(user.id, user.email, user.displayName);
  }

  async oauth(dto: OAuthDto) {
    const identity = await this.resolveOAuthIdentity(dto);
    const linked = await this.prisma.authProvider.findUnique({
      where: {
        provider_providerUserId: {
          provider: identity.provider,
          providerUserId: identity.providerUserId,
        },
      },
      include: { user: true },
    });

    if (linked) {
      return this.tokenResponse(
        linked.user.id,
        linked.user.email,
        linked.user.displayName,
      );
    }

    let user =
      identity.email != null
        ? await this.prisma.user.findUnique({
            where: { email: identity.email.toLowerCase() },
          })
        : null;

    if (!user) {
      user = await this.users.createOAuthUser({
        email: identity.email?.toLowerCase() ?? null,
        displayName: identity.displayName,
        provider: identity.provider,
        providerUserId: identity.providerUserId,
      });
    } else {
      await this.prisma.authProvider.create({
        data: {
          userId: user.id,
          provider: identity.provider,
          providerUserId: identity.providerUserId,
        },
      });
    }

    return this.tokenResponse(user.id, user.email, user.displayName);
  }

  private async resolveOAuthIdentity(dto: OAuthDto): Promise<{
    provider: string;
    providerUserId: string;
    email?: string | null;
    displayName: string;
  }> {
    const allowDemo =
      this.config.get('NODE_ENV') !== 'production' ||
      this.config.get('ALLOW_DEMO_OAUTH') === 'true';

    if (dto.provider === 'facebook') {
      return this.verifyFacebook(dto.accessToken, allowDemo);
    }
    if (dto.provider === 'microsoft') {
      return this.verifyMicrosoft(dto.accessToken, allowDemo);
    }
    throw new UnauthorizedException('Unsupported provider');
  }

  private async verifyFacebook(accessToken: string, allowDemo: boolean) {
    const appId = this.config.get<string>('FACEBOOK_APP_ID');
    if (!appId) {
      if (!allowDemo || !accessToken.startsWith('demo:')) {
        throw new UnauthorizedException(
          'Facebook OAuth not configured (use demo:userId in test)',
        );
      }
      const id = accessToken.slice('demo:'.length) || 'fb-demo';
      return {
        provider: 'facebook',
        providerUserId: id,
        email: `${id}@facebook.demo`,
        displayName: `Facebook ${id}`,
      };
    }

    try {
      const { data } = await axios.get('https://graph.facebook.com/me', {
        params: {
          fields: 'id,name,email',
          access_token: accessToken,
        },
      });
      return {
        provider: 'facebook',
        providerUserId: String(data.id),
        email: data.email ?? null,
        displayName: data.name ?? 'Facebook rider',
      };
    } catch {
      throw new UnauthorizedException('Invalid Facebook token');
    }
  }

  private async verifyMicrosoft(accessToken: string, allowDemo: boolean) {
    const clientId = this.config.get<string>('MICROSOFT_CLIENT_ID');
    if (!clientId) {
      if (!allowDemo || !accessToken.startsWith('demo:')) {
        throw new UnauthorizedException(
          'Microsoft OAuth not configured (use demo:userId in test)',
        );
      }
      const id = accessToken.slice('demo:'.length) || 'ms-demo';
      return {
        provider: 'microsoft',
        providerUserId: id,
        email: `${id}@microsoft.demo`,
        displayName: `Microsoft ${id}`,
      };
    }

    try {
      const tenant = this.config.get('MICROSOFT_TENANT_ID', 'common');
      const jwks = createRemoteJWKSet(
        new URL(`https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`),
      );
      const { payload } = await jwtVerify(accessToken, jwks, {
        audience: clientId,
      });
      return {
        provider: 'microsoft',
        providerUserId: String(payload.oid ?? payload.sub),
        email: (payload.preferred_username as string) ?? (payload.email as string) ?? null,
        displayName:
          (payload.name as string) ??
          (payload.preferred_username as string) ??
          'Microsoft rider',
      };
    } catch {
      throw new UnauthorizedException('Invalid Microsoft token');
    }
  }

  private tokenResponse(
    userId: string,
    email: string | null | undefined,
    displayName: string,
  ) {
    const accessToken = this.jwt.sign({ sub: userId, email: email ?? null });
    return {
      accessToken,
      user: { id: userId, email: email ?? null, displayName },
    };
  }
}
