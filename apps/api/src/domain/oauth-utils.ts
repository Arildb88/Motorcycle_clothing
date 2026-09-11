import { createHash, randomBytes } from 'crypto';

export function randomUrlSafe(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function pkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export const SELECTABLE_ACTIVITIES = [
  'motorcycle',
  'hiking',
  'cycling',
] as const;
export type SelectableActivity = (typeof SELECTABLE_ACTIVITIES)[number];

export function isSelectableActivity(
  value: string,
): value is SelectableActivity {
  return (SELECTABLE_ACTIVITIES as readonly string[]).includes(value);
}
