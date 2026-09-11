import { isSelectableActivity, SELECTABLE_ACTIVITIES } from './oauth-utils';

describe('selectable activities', () => {
  it('allows motorcycle hiking cycling only for startup UX', () => {
    expect(SELECTABLE_ACTIVITIES).toEqual([
      'motorcycle',
      'hiking',
      'cycling',
    ]);
    expect(isSelectableActivity('motorcycle')).toBe(true);
    expect(isSelectableActivity('xc_skiing')).toBe(false);
  });
});
