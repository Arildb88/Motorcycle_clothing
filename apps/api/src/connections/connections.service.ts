import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { TokenVault } from '../security/token-vault';
import { pkceChallenge, randomUrlSafe } from '../domain/oauth-utils';

@Injectable()
export class ConnectionsService {
  private readonly vault: TokenVault | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.vault = TokenVault.fromEnv(this.config.get('TOKEN_ENCRYPTION_KEY'));
  }

  status() {
    return {
      strava: {
        enabled: this.isStravaConfigured() && Boolean(this.vault),
        configured: this.isStravaConfigured(),
        encryptionReady: Boolean(this.vault),
      },
    };
  }

  async list(userId: string) {
    const rows = await this.prisma.connectedAccount.findMany({
      where: { userId },
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
    });
    return rows.map((r) => ({
      provider: r.provider,
      providerAccountId: r.providerAccountId,
      displayName: r.displayName,
      status: r.status,
      scopes: r.scopes,
      updatedAt: r.updatedAt,
      metadata: JSON.parse(r.metadataJson || '{}'),
    }));
  }

  async startStrava(userId: string) {
    this.requireStravaReady();
    const state = randomUrlSafe(24);
    const codeVerifier = randomUrlSafe(32);
    const redirectUri = this.config.get(
      'STRAVA_REDIRECT_URI',
      this.config.get('OAUTH_REDIRECT_URI', 'ridewear://oauth/callback'),
    );
    await this.prisma.oAuthState.create({
      data: {
        state,
        provider: 'strava',
        purpose: 'connect',
        codeVerifier,
        userId,
        redirectUri,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    const clientId = this.config.get<string>('STRAVA_CLIENT_ID')!;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri!,
      response_type: 'code',
      approval_prompt: 'auto',
      scope: 'read,activity:read_all',
      state,
      // Strava does not fully standardize PKCE; we still store verifier for future-safe flows.
    });
    return {
      authorizationUrl: `https://www.strava.com/oauth/authorize?${params}`,
      state,
      redirectUri,
      codeChallenge: pkceChallenge(codeVerifier),
    };
  }

  async finishStrava(
    userId: string,
    input: { code: string; state: string },
  ) {
    this.requireStravaReady();
    const row = await this.prisma.oAuthState.findUnique({
      where: { state: input.state },
    });
    if (!row || row.expiresAt < new Date() || row.userId !== userId) {
      throw new UnauthorizedException('Invalid or expired Strava state');
    }
    if (row.provider !== 'strava' || row.purpose !== 'connect') {
      throw new BadRequestException('OAuth state mismatch');
    }
    await this.prisma.oAuthState.delete({ where: { id: row.id } });

    const body = new URLSearchParams({
      client_id: this.config.get<string>('STRAVA_CLIENT_ID')!,
      client_secret: this.config.get<string>('STRAVA_CLIENT_SECRET')!,
      code: input.code,
      grant_type: 'authorization_code',
    });
    const { data } = await axios.post(
      'https://www.strava.com/oauth/token',
      body.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const athlete = data.athlete ?? {};
    const displayName =
      [athlete.firstname, athlete.lastname].filter(Boolean).join(' ') ||
      athlete.username ||
      'Strava athlete';

    await this.prisma.connectedAccount.upsert({
      where: {
        userId_provider: { userId, provider: 'strava' },
      },
      create: {
        userId,
        provider: 'strava',
        providerAccountId: String(athlete.id ?? data.athlete?.id ?? 'unknown'),
        displayName,
        scopes: String(data.scope ?? 'read'),
        accessTokenEnc: this.vault!.encrypt(data.access_token),
        refreshTokenEnc: data.refresh_token
          ? this.vault!.encrypt(data.refresh_token)
          : null,
        accessTokenExpiresAt: data.expires_at
          ? new Date(data.expires_at * 1000)
          : null,
        status: 'connected',
        metadataJson: JSON.stringify({
          username: athlete.username,
          city: athlete.city,
          country: athlete.country,
        }),
      },
      update: {
        providerAccountId: String(athlete.id ?? 'unknown'),
        displayName,
        scopes: String(data.scope ?? 'read'),
        accessTokenEnc: this.vault!.encrypt(data.access_token),
        refreshTokenEnc: data.refresh_token
          ? this.vault!.encrypt(data.refresh_token)
          : null,
        accessTokenExpiresAt: data.expires_at
          ? new Date(data.expires_at * 1000)
          : null,
        status: 'connected',
        metadataJson: JSON.stringify({
          username: athlete.username,
          city: athlete.city,
          country: athlete.country,
        }),
      },
    });

    return this.list(userId);
  }

  async disconnect(userId: string, provider: string) {
    const row = await this.prisma.connectedAccount.findUnique({
      where: { userId_provider: { userId, provider } },
    });
    if (!row) throw new NotFoundException('Connection not found');
    // Best-effort Strava deauthorize
    if (provider === 'strava' && this.vault) {
      try {
        const token = this.vault.decrypt(row.accessTokenEnc);
        await axios.post('https://www.strava.com/oauth/deauthorize', null, {
          params: { access_token: token },
        });
      } catch {
        /* ignore revocation errors */
      }
    }
    await this.prisma.connectedAccount.delete({ where: { id: row.id } });
    return { ok: true };
  }

  /** Minimal authenticated call confirming the connection. */
  async syncStrava(userId: string) {
    this.requireStravaReady();
    const row = await this.prisma.connectedAccount.findUnique({
      where: { userId_provider: { userId, provider: 'strava' } },
    });
    if (!row || row.status !== 'connected') {
      throw new NotFoundException('Strava is not connected');
    }
    const access = this.vault!.decrypt(row.accessTokenEnc);
    const { data: athlete } = await axios.get(
      'https://www.strava.com/api/v3/athlete',
      { headers: { Authorization: `Bearer ${access}` } },
    );
    const displayName =
      [athlete.firstname, athlete.lastname].filter(Boolean).join(' ') ||
      athlete.username ||
      row.displayName;
    await this.prisma.connectedAccount.update({
      where: { id: row.id },
      data: {
        displayName,
        metadataJson: JSON.stringify({
          username: athlete.username,
          city: athlete.city,
          country: athlete.country,
          syncedAt: new Date().toISOString(),
        }),
      },
    });
    return {
      ok: true,
      displayName,
      athleteId: athlete.id,
    };
  }

  private requireStravaReady() {
    if (!this.isStravaConfigured()) {
      throw new ServiceUnavailableException(
        'Strava is not configured (STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET)',
      );
    }
    if (!this.vault) {
      throw new ServiceUnavailableException(
        'TOKEN_ENCRYPTION_KEY is required to store Strava tokens',
      );
    }
  }

  private isStravaConfigured() {
    return Boolean(
      this.config.get('STRAVA_CLIENT_ID') &&
        this.config.get('STRAVA_CLIENT_SECRET'),
    );
  }
}
