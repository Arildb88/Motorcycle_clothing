/**
 * Drop auth secrets that can no longer be used.
 * Password-reset rows store a hash. OAuth rows store a PKCE verifier.
 * Neither table is a product history, and neither has a background sweeper.
 */
export async function deleteExpiredAuthSecrets(
  prisma: {
    passwordResetToken: {
      deleteMany(args: {
        where: { expiresAt: { lt: Date } };
      }): Promise<unknown>;
    };
    oAuthState: {
      deleteMany(args: {
        where: { expiresAt: { lt: Date } };
      }): Promise<unknown>;
    };
  },
  now = new Date(),
): Promise<void> {
  const expired = { expiresAt: { lt: now } };
  await prisma.passwordResetToken.deleteMany({ where: expired });
  await prisma.oAuthState.deleteMany({ where: expired });
}
