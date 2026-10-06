import { deleteExpiredAuthSecrets } from './ephemeral-secret-cleanup';

describe('deleteExpiredAuthSecrets', () => {
  it('deletes only expired reset hashes and OAuth verifiers', async () => {
    const now = new Date('2026-10-06T09:00:00Z');
    const passwordResetToken = { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) };
    const oAuthState = { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) };

    await deleteExpiredAuthSecrets({ passwordResetToken, oAuthState }, now);

    expect(passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: now } },
    });
    expect(oAuthState.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: now } },
    });
  });
});
