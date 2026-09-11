import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * AES-256-GCM token vault for ConnectedAccount secrets.
 * Key from TOKEN_ENCRYPTION_KEY (32-byte hex or passphrase).
 */
export class TokenVault {
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) {
      throw new Error('TOKEN_ENCRYPTION_KEY must resolve to 32 bytes');
    }
  }

  static fromEnv(raw: string | undefined): TokenVault | null {
    if (!raw || raw.trim() === '') return null;
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      return new TokenVault(Buffer.from(raw, 'hex'));
    }
    const key = scryptSync(raw, 'ridewear-token-vault', 32);
    return new TokenVault(key);
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${enc.toString('base64url')}`;
  }

  decrypt(payload: string): string {
    const [version, ivB64, tagB64, dataB64] = payload.split(':');
    if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) {
      throw new Error('Invalid encrypted token payload');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(ivB64, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}
