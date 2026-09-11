import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { pkceChallenge, randomUrlSafe } from '../domain/oauth-utils';

type IdentityProvider = 'facebook' | 'microsoft';

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

  /** Public provider capability map for Flutter login UI. */
  providersStatus() {
    return {
      email: { enabled: true },
      facebook: {
        enabled: this.isFacebookConfigured(),
        configured: this.isFacebookConfigured(),
      },
      microsoft: {
        enabled: this.isMicrosoftConfigured(),
        configured: this.isMicrosoftConfigured(),
      },
      demoOAuthAllowed: this.allowDemoOAuth(),
      oauthRedirectUri: this.config.get(
        'OAUTH_REDIRECT_URI',
        'ridewear://oauth/callback',
      ),
    };
  }

  /**
   * Start PKCE authorization for login or link.
   * Returns URL for the mobile browser / ASWebAuthenticationSession.
   */
  async startOAuth(
    provider: IdentityProvider,
    purpose: 'login' | 'link',
    userId?: string,
  ) {
    if (purpose === 'link' && !userId) {
      throw new UnauthorizedException('Link requires authentication');
    }
    if (provider === 'facebook' && !this.isFacebookConfigured()) {
      throw new BadRequestException(
        'Facebook login is not configured on this server',
      );
    }
    if (provider === 'microsoft' && !this.isMicrosoftConfigured()) {
      throw new BadRequestException(
        'Microsoft login is not configured on this server',
      );
    }

    const state = randomUrlSafe(24);
    const codeVerifier = randomUrlSafe(32);
    const redirectUri = this.config.get(
      'OAUTH_REDIRECT_URI',
      'ridewear://oauth/callback',
    );
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.prisma.oAuthState.create({
      data: {
        state,
        provider,
        purpose,
        codeVerifier,
        userId: userId ?? null,
        redirectUri,
        expiresAt,
      },
    });

    const challenge = pkceChallenge(codeVerifier);
    const url =
      provider === 'facebook'
        ? this.facebookAuthUrl(state, challenge, redirectUri)
        : this.microsoftAuthUrl(state, challenge, redirectUri);

    return { authorizationUrl: url, state, redirectUri };
  }

  async finishOAuth(dto: OAuthCallbackDto, mode: 'login' | 'link', userId?: string) {
    const row = await this.prisma.oAuthState.findUnique({
      where: { state: dto.state },
    });
    if (!row || row.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }
    if (row.purpose !== mode) {
      throw new BadRequestException('OAuth state purpose mismatch');
    }
    if (mode === 'link' && row.userId !== userId) {
      throw new UnauthorizedException('OAuth state does not match user');
    }

    await this.prisma.oAuthState.delete({ where: { id: row.id } });

    const provider = row.provider as IdentityProvider;
    const identity = await this.exchangeCode(provider, {
      code: dto.code,
      codeVerifier: row.codeVerifier ?? dto.codeVerifier,
      redirectUri: row.redirectUri ?? dto.redirectUri,
    });

    if (mode === 'link') {
      return this.linkIdentity(userId!, identity);
    }
    return this.loginWithIdentity(identity);
  }

  /**
   * Legacy/demo token path for non-production when providers are unset.
   * Does NOT merge accounts by email.
   */
  async oauthLegacy(dto: OAuthDto) {
    const identity = await this.resolveLegacyIdentity(dto);
    return this.loginWithIdentity(identity);
  }

  private async loginWithIdentity(identity: {
    provider: string;
    providerSubjectId: string;
    email?: string | null;
    displayName: string;
    avatarUrl?: string | null;
  }) {
    const linked = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerSubjectId: {
          provider: identity.provider,
          providerSubjectId: identity.providerSubjectId,
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

    // Never silent-merge by email. If email exists, require explicit link.
    if (identity.email) {
      const emailOwner = await this.prisma.user.findUnique({
        where: { email: identity.email.toLowerCase() },
      });
      if (emailOwner) {
        throw new ConflictException({
          code: 'EMAIL_IN_USE_LINK_REQUIRED',
          message:
            'An account with this email already exists. Sign in with email, then link this login method in Profile.',
        });
      }
    }

    const user = await this.users.createOAuthUser({
      email: identity.email?.toLowerCase() ?? null,
      displayName: identity.displayName,
      provider: identity.provider,
      providerSubjectId: identity.providerSubjectId,
      avatarUrl: identity.avatarUrl,
    });
    return this.tokenResponse(user.id, user.email, user.displayName);
  }

  private async linkIdentity(
    userId: string,
    identity: {
      provider: string;
      providerSubjectId: string;
      email?: string | null;
      displayName: string;
      avatarUrl?: string | null;
    },
  ) {
    const existing = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerSubjectId: {
          provider: identity.provider,
          providerSubjectId: identity.providerSubjectId,
        },
      },
    });
    if (existing && existing.userId !== userId) {
      throw new ConflictException(
        'This login method is already linked to another RideWear account',
      );
    }
    if (existing) {
      return this.users.getMe(userId);
    }
    await this.prisma.authIdentity.create({
      data: {
        userId,
        provider: identity.provider,
        providerSubjectId: identity.providerSubjectId,
        providerEmail: identity.email?.toLowerCase() ?? null,
        avatarUrl: identity.avatarUrl ?? null,
      },
    });
    return this.users.getMe(userId);
  }

  private async exchangeCode(
    provider: IdentityProvider,
    input: { code: string; codeVerifier?: string | null; redirectUri?: string | null },
  ) {
    if (provider === 'facebook') {
      return this.exchangeFacebook(input);
    }
    return this.exchangeMicrosoft(input);
  }

  private async exchangeFacebook(input: {
    code: string;
    codeVerifier?: string | null;
    redirectUri?: string | null;
  }) {
    const appId = this.config.get<string>('FACEBOOK_APP_ID');
    const secret = this.config.get<string>('FACEBOOK_APP_SECRET');
    const redirectUri =
      input.redirectUri ||
      this.config.get('OAUTH_REDIRECT_URI', 'ridewear://oauth/callback');
    const tokenUrl = 'https://graph.facebook.com/v19.0/oauth/access_token';
    const { data: token } = await axios.get(tokenUrl, {
      params: {
        client_id: appId,
        client_secret: secret,
        redirect_uri: redirectUri,
        code: input.code,
        code_verifier: input.codeVerifier || undefined,
      },
    });
    const { data: me } = await axios.get('https://graph.facebook.com/me', {
      params: {
        fields: 'id,name,email,picture.type(large)',
        access_token: token.access_token,
      },
    });
    return {
      provider: 'facebook',
      providerSubjectId: String(me.id),
      email: me.email ?? null,
      displayName: me.name ?? 'Facebook rider',
      avatarUrl: me.picture?.data?.url ?? null,
    };
  }

  private async exchangeMicrosoft(input: {
    code: string;
    codeVerifier?: string | null;
    redirectUri?: string | null;
  }) {
    const clientId = this.config.get<string>('MICROSOFT_CLIENT_ID')!;
    const tenant = this.config.get('MICROSOFT_TENANT_ID', 'common');
    const redirectUri =
      input.redirectUri ||
      this.config.get('OAUTH_REDIRECT_URI', 'ridewear://oauth/callback') ||
      'ridewear://oauth/callback';
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: redirectUri,
      code_verifier: input.codeVerifier || '',
      scope: 'openid profile email offline_access',
    });
    // Public client + PKCE: no client_secret required for native apps.
    const secret = this.config.get<string>('MICROSOFT_CLIENT_SECRET');
    if (secret) body.set('client_secret', secret);

    const { data: token } = await axios.post(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      body.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const jwks = createRemoteJWKSet(
      new URL(
        `https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`,
      ),
    );
    const { payload } = await jwtVerify(token.id_token, jwks, {
      audience: clientId,
    });
    return {
      provider: 'microsoft',
      providerSubjectId: String(payload.oid ?? payload.sub),
      email:
        (payload.preferred_username as string) ??
        (payload.email as string) ??
        null,
      displayName:
        (payload.name as string) ??
        (payload.preferred_username as string) ??
        'Microsoft rider',
      avatarUrl: null as string | null,
    };
  }

  private facebookAuthUrl(
    state: string,
    challenge: string,
    redirectUri: string,
  ) {
    const appId = this.config.get<string>('FACEBOOK_APP_ID');
    const params = new URLSearchParams({
      client_id: appId!,
      redirect_uri: redirectUri,
      state,
      response_type: 'code',
      scope: 'public_profile,email',
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
  }

  private microsoftAuthUrl(
    state: string,
    challenge: string,
    redirectUri: string,
  ) {
    const clientId = this.config.get<string>('MICROSOFT_CLIENT_ID');
    const tenant = this.config.get('MICROSOFT_TENANT_ID', 'common');
    const params = new URLSearchParams({
      client_id: clientId!,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope: 'openid profile email offline_access',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`;
  }

  private async resolveLegacyIdentity(dto: OAuthDto) {
    const allowDemo = this.allowDemoOAuth();
    if (dto.provider === 'facebook') {
      return this.verifyFacebookLegacy(dto.accessToken, allowDemo);
    }
    if (dto.provider === 'microsoft') {
      return this.verifyMicrosoftLegacy(dto.accessToken, allowDemo);
    }
    throw new UnauthorizedException('Unsupported provider');
  }

  private async verifyFacebookLegacy(accessToken: string, allowDemo: boolean) {
    if (!this.isFacebookConfigured()) {
      if (!allowDemo || !accessToken.startsWith('demo:')) {
        throw new UnauthorizedException(
          'Facebook OAuth not configured (use demo:userId in non-production)',
        );
      }
      const id = accessToken.slice('demo:'.length) || 'fb-demo';
      return {
        provider: 'facebook',
        providerSubjectId: id,
        email: null as string | null,
        displayName: `Facebook ${id}`,
        avatarUrl: null as string | null,
      };
    }
    const { data } = await axios.get('https://graph.facebook.com/me', {
      params: {
        fields: 'id,name,email,picture.type(large)',
        access_token: accessToken,
      },
    });
    return {
      provider: 'facebook',
      providerSubjectId: String(data.id),
      email: data.email ?? null,
      displayName: data.name ?? 'Facebook rider',
      avatarUrl: data.picture?.data?.url ?? null,
    };
  }

  private async verifyMicrosoftLegacy(accessToken: string, allowDemo: boolean) {
    if (!this.isMicrosoftConfigured()) {
      if (!allowDemo || !accessToken.startsWith('demo:')) {
        throw new UnauthorizedException(
          'Microsoft OAuth not configured (use demo:userId in non-production)',
        );
      }
      const id = accessToken.slice('demo:'.length) || 'ms-demo';
      return {
        provider: 'microsoft',
        providerSubjectId: id,
        email: null as string | null,
        displayName: `Microsoft ${id}`,
        avatarUrl: null as string | null,
      };
    }
    const tenant = this.config.get('MICROSOFT_TENANT_ID', 'common');
    const clientId = this.config.get<string>('MICROSOFT_CLIENT_ID')!;
    const jwks = createRemoteJWKSet(
      new URL(
        `https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`,
      ),
    );
    const { payload } = await jwtVerify(accessToken, jwks, {
      audience: clientId,
    });
    return {
      provider: 'microsoft',
      providerSubjectId: String(payload.oid ?? payload.sub),
      email:
        (payload.preferred_username as string) ??
        (payload.email as string) ??
        null,
      displayName:
        (payload.name as string) ??
        (payload.preferred_username as string) ??
        'Microsoft rider',
      avatarUrl: null as string | null,
    };
  }

  private isFacebookConfigured() {
    return Boolean(
      this.config.get('FACEBOOK_APP_ID') &&
        this.config.get('FACEBOOK_APP_SECRET'),
    );
  }

  private isMicrosoftConfigured() {
    return Boolean(this.config.get('MICROSOFT_CLIENT_ID'));
  }

  private allowDemoOAuth() {
    return (
      this.config.get('NODE_ENV') !== 'production' ||
      this.config.get('ALLOW_DEMO_OAUTH') === 'true'
    );
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
