import { stravaAthleteMetadata } from './connections.service';

describe('stravaAthleteMetadata', () => {
  it('keeps the public handle and country and drops city', () => {
    expect(
      stravaAthleteMetadata(
        { username: 'ase', country: 'Norway', city: 'Oslo' } as {
          username: string;
          country: string;
        },
        { syncedAt: '2026-10-06T09:00:00.000Z' },
      ),
    ).toEqual({
      username: 'ase',
      country: 'Norway',
      syncedAt: '2026-10-06T09:00:00.000Z',
    });
    expect(
      JSON.stringify(stravaAthleteMetadata({ username: 'ase', country: null })),
    ).not.toContain('city');
  });
});