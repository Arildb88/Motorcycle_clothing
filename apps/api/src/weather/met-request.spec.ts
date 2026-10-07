import { metLocationForecastUrl, weatherCacheKey } from './met-request';

describe('MET altitude request', () => {
  it('keeps the lat/lon URL when altitude is omitted', () => {
    expect(metLocationForecastUrl(59.91, 10.75)).toBe(
      'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.91&lon=10.75',
    );
    expect(metLocationForecastUrl(59.91, 10.75, null)).toBe(
      'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.91&lon=10.75',
    );
  });

  it('sends altitude as whole metres', () => {
    expect(metLocationForecastUrl(60.5, 8, 987.25)).toBe(
      'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=60.5&lon=8&altitude=987',
    );
  });

  it('keeps the previous cache key when altitude is omitted', () => {
    const at = new Date('2026-10-02T12:40:00Z');
    expect(
      weatherCacheKey({ provider: 'met', lat: 59.9139, lon: 10.7522 }),
    ).toBe('wx2:met:59.914,10.752');
    expect(
      weatherCacheKey({ provider: 'met', lat: 59.9139, lon: 10.7522, at }),
    ).toBe('wx2:met:59.914,10.752@2026-10-02T12');
    expect(
      weatherCacheKey({ provider: 'met', lat: 59.9139, lon: 10.7522 }),
    ).not.toBe('met:59.914,10.752');
  });

  it('includes rounded altitude and the ETA hour together', () => {
    expect(
      weatherCacheKey({
        provider: 'met',
        lat: 60.5,
        lon: 8,
        at: new Date('2026-10-02T15:10:00Z'),
        altitudeM: 987.25,
      }),
    ).toBe('wx2:met:60.500,8.000@987m@2026-10-02T15');
  });
});
