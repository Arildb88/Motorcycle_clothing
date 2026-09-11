import { TokenVault } from './token-vault';

describe('TokenVault', () => {
  it('encrypts and decrypts round-trip', () => {
    const vault = TokenVault.fromEnv('unit-test-passphrase-ridewear');
    expect(vault).not.toBeNull();
    const enc = vault!.encrypt('secret-token');
    expect(enc.startsWith('v1:')).toBe(true);
    expect(vault!.decrypt(enc)).toBe('secret-token');
  });

  it('accepts 64-char hex keys', () => {
    const hex = 'a'.repeat(64);
    const vault = TokenVault.fromEnv(hex)!;
    expect(vault.decrypt(vault.encrypt('x'))).toBe('x');
  });

  it('returns null when env missing', () => {
    expect(TokenVault.fromEnv(undefined)).toBeNull();
    expect(TokenVault.fromEnv('')).toBeNull();
  });
});
