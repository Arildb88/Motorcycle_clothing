import { Logger } from '@nestjs/common';
import { HEIGIT_PELIAS_BASE_URL } from './ors.constants';
import {
  GeocodingUnavailableError,
  OrsGeocodingService,
  placeSearchHit,
} from './ors-geocoding.service';

const pelias = {
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [7.9956, 58.1467] },
      properties: {
        gid: 'whosonfirst:locality:101752863',
        name: 'Kristiansand',
        label: 'Kristiansand, Agder, Norway',
      },
    },
  ],
};

describe('OrsGeocodingService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps autocomplete hits and calls Pelias on HeiGIT', async () => {
    let url = '';
    let auth = '';
    const service = new OrsGeocodingService({
      apiKey: 'pelias-key',
      baseUrl: 'https://api.openrouteservice.org/geocode',
      get: async (requested, headers) => {
        url = requested;
        auth = headers.Authorization;
        return { status: 200, data: pelias };
      },
    });

    const hits = await service.autocomplete('Kristiansand');
    expect(url.startsWith(`${HEIGIT_PELIAS_BASE_URL}/autocomplete?`)).toBe(true);
    expect(url.includes('api.openrouteservice.org')).toBe(false);
    expect(auth).toBe('pelias-key');
    expect(hits).toEqual([
      expect.objectContaining({
        providerPlaceId: 'whosonfirst:locality:101752863',
        primaryText: 'Kristiansand',
        secondaryText: 'Agder, Norway',
        lat: 58.1467,
        lon: 7.9956,
        address: 'Kristiansand, Agder, Norway',
      }),
    ]);
  });

  it('resolves a place id without putting the key in the URL', async () => {
    let url = '';
    const service = new OrsGeocodingService({
      apiKey: 'pelias-key',
      get: async (requested) => {
        url = requested;
        return { status: 200, data: pelias };
      },
    });
    const place = await service.resolve('whosonfirst:locality:101752863');
    expect(url).toContain('/place?ids=whosonfirst%3Alocality%3A101752863');
    expect(url.includes('pelias-key')).toBe(false);
    expect(place?.label).toBe('Kristiansand, Agder, Norway');
  });

  it('keeps a concrete place label instead of the short locality name', async () => {
    const service = new OrsGeocodingService({
      apiKey: 'pelias-key',
      get: async () => ({
        status: 200,
        data: {
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [8.0852, 58.2042] },
              properties: {
                gid: 'whosonfirst:venue:airport',
                name: 'Kristiansand',
                label: 'Kristiansand lufthavn, Kjevik',
              },
            },
          ],
        },
      }),
    });
    const [hit] = await service.autocomplete('Kristiansand');
    expect(hit.primaryText).toBe('Kristiansand lufthavn, Kjevik');
    expect(hit.label).toBe('Kristiansand lufthavn, Kjevik');
    expect(hit.label).not.toBe('Kristiansand');
    expect(hit.lat).toBeCloseTo(58.2042);
    expect(hit.lon).toBeCloseTo(8.0852);
  });

  it('percent-encodes Norwegian place names without ASCII folding', async () => {
    let url = '';
    const service = new OrsGeocodingService({
      apiKey: 'pelias-key',
      get: async (requested) => {
        url = requested;
        return {
          status: 200,
          data: {
            features: [
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [6.15, 62.47] },
                properties: {
                  gid: 'whosonfirst:locality:alesund',
                  name: 'Ålesund',
                  label: 'Ålesund, Møre og Romsdal, Norway',
                },
              },
            ],
          },
        };
      },
    });

    const hits = await service.autocomplete('Ålesund');
    expect(url).toContain('text=%C3%85lesund');
    expect(url).not.toContain('Alesund');
    expect(hits[0].label).toBe('Ålesund, Møre og Romsdal, Norway');

    await service.autocomplete('Tromsø');
    expect(url).toContain('text=Troms%C3%B8');
    expect(url).not.toContain('Tromso');
  });

  it('surfaces provider failures without throwing the raw HTTP error', async () => {
    const service = new OrsGeocodingService({
      apiKey: 'pelias-key',
      get: async () => ({ status: 500, data: { error: 'down' } }),
    });
    await expect(service.autocomplete('Kristiansand')).rejects.toBeInstanceOf(
      GeocodingUnavailableError,
    );
  });

  it('is unavailable when the key is missing', async () => {
    const warnings = captureWarnings();
    const service = new OrsGeocodingService({ apiKey: '' });
    await expect(service.autocomplete('Kristiansand')).rejects.toMatchObject({
      reason: 'not_configured',
    });
    expect(warnings).toEqual(['autocomplete failed (status not_configured)']);
  });

  it('keeps autocomplete coordinates on the API hit', () => {
    const [hit] = [
      {
        providerPlaceId: 'whosonfirst:locality:arendal',
        primaryText: 'Arendal',
        secondaryText: 'Agder, Norway',
        label: 'Arendal, Agder, Norway',
        lat: 58.461,
        lon: 8.766,
        address: 'Arendal, Agder, Norway',
      },
    ];
    expect(placeSearchHit(hit)).toEqual(hit);
  });

  it('classifies resolve 404, auth, timeout, and an empty body without secrets', async () => {
    const warnings = captureWarnings();
    const missing = new OrsGeocodingService({
      apiKey: 'pelias-key',
      get: async () => ({ status: 404, data: '<html>404</html>' }),
    });
    await expect(missing.resolve('whosonfirst:locality:arendal')).rejects.toMatchObject({
      reason: 'not_found',
    });

    const denied = new OrsGeocodingService({
      apiKey: 'pelias-key',
      get: async () => ({ status: 401, data: { error: 'Authorization field missing' } }),
    });
    await expect(denied.autocomplete('Kristiansand')).rejects.toMatchObject({
      reason: 'authentication',
    });

    const empty = new OrsGeocodingService({
      apiKey: 'pelias-key',
      get: async () => ({ status: 200, data: { features: [] } }),
    });
    await expect(empty.resolve('whosonfirst:locality:arendal')).resolves.toBeNull();

    const timedOut = new OrsGeocodingService({
      apiKey: 'pelias-key',
      get: async () => {
        const error = new Error('timeout') as Error & { code?: string };
        error.code = 'ECONNABORTED';
        throw error;
      },
    });
    await expect(timedOut.autocomplete('Kristiansand')).rejects.toMatchObject({
      reason: 'provider',
    });

    const text = warnings.join('\n');
    expect(text).toContain('resolve failed (status 404)');
    expect(text).toContain('autocomplete failed (status 401 authentication)');
    expect(text).toContain('resolve failed (status 200 empty)');
    expect(text).toContain('autocomplete failed (status timeout)');
    expect(text).not.toContain('pelias-key');
    expect(text).not.toContain('Kristiansand');
    expect(text).not.toContain('whosonfirst');
    expect(text).not.toContain('58.');
    expect(text).not.toContain('8.766');
  });
});

function captureWarnings(): string[] {
  const warnings: string[] = [];
  jest.spyOn(Logger.prototype, 'warn').mockImplementation((message: unknown) => {
    warnings.push(String(message));
  });
  return warnings;
}
