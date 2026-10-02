import { ServiceUnavailableException } from '@nestjs/common';
import {
  FNUGG_API_BASE_URL,
  FNUGG_NEARBY_RADIUS_KM,
  FnuggResortAdapter,
  fnuggResortPageUrl,
  mapFnuggHits,
} from './fnugg-resort.adapter';
import { ResortDirectoryUnavailableError } from './resort.types';
import { ResortsService } from './resorts.service';

const alFixture = {
  hits: {
    total: 1,
    hits: [
      {
        _id: '141',
        _source: {
          id: 141,
          name: 'Ål Skisenter',
          description: 'Do not copy this resort description.',
          location: { lat: 60.6301, lon: 8.5604 },
          site_path: '/al/',
          conditions: {
            combined: { top: { snow: { depth: 40 } } },
          },
        },
      },
      {
        _id: 'missing-coords',
        _source: { id: 9, name: 'No coordinates' },
      },
    ],
  },
};

const nearbyFixture = {
  hits: {
    total: 2,
    hits: [
      {
        _id: '5',
        _source: {
          id: 5,
          name: 'SkiStar Hemsedal',
          location: { lat: 60.86012746, lon: 8.51783752 },
          resort_open: true,
        },
        sort: [26689.958823631056],
      },
      {
        _id: '141',
        _source: {
          id: 141,
          name: 'Ål Skisenter',
          location: { lat: 60.6301, lon: 8.5604 },
        },
        sort: [18432.2],
      },
    ],
  },
};

describe('FnuggResortAdapter', () => {
  it('searches resort names with one UTF-8 encoding and only needed fields', async () => {
    const urls: string[] = [];
    const adapter = new FnuggResortAdapter({
      get: (url) => {
        urls.push(url);
        return Promise.resolve({ status: 200, data: alFixture });
      },
    });

    const hits = await adapter.searchByName('  Ål ');
    expect(urls).toHaveLength(1);
    expect(urls[0].startsWith(`${FNUGG_API_BASE_URL}/search?`)).toBe(true);
    expect(urls[0]).toContain('type=resort');
    expect(urls[0]).toContain('q=%C3%85l');
    expect(urls[0]).not.toContain('%25C3');
    expect(urls[0]).toContain(
      'sourceFields=id%2Cname%2Clocation.lat%2Clocation.lon%2Csite_path',
    );
    expect(urls[0]).not.toContain('conditions');
    expect(hits).toEqual([
      {
        id: '141',
        name: 'Ål Skisenter',
        lat: 60.6301,
        lon: 8.5604,
        straightLineDistanceM: null,
        sourceUrl: 'https://fnugg.no/al/',
      },
    ]);
    expect(JSON.stringify(hits)).not.toContain('description');
    expect(JSON.stringify(hits)).not.toContain('conditions');
  });

  it('loads nearby resorts inside a bounded straight-line radius', async () => {
    let url = '';
    const adapter = new FnuggResortAdapter({
      get: (requested) => {
        url = requested;
        return Promise.resolve({ status: 200, data: nearbyFixture });
      },
    });

    const hits = await adapter.nearby(61.1, 8.5);
    expect(url.startsWith(`${FNUGG_API_BASE_URL}/geodata/getnearest?`)).toBe(
      true,
    );
    expect(url).toContain('lat=61.1');
    expect(url).toContain('lon=8.5');
    expect(url).toContain(`distance=${FNUGG_NEARBY_RADIUS_KM}`);
    expect(hits).toEqual([
      {
        id: '5',
        name: 'SkiStar Hemsedal',
        lat: 60.86012746,
        lon: 8.51783752,
        straightLineDistanceM: 26690,
        sourceUrl: null,
      },
      {
        id: '141',
        name: 'Ål Skisenter',
        lat: 60.6301,
        lon: 8.5604,
        straightLineDistanceM: 18432,
        sourceUrl: null,
      },
    ]);
  });

  it('keeps only a documented Fnugg resort page for attribution', () => {
    expect(fnuggResortPageUrl('/trysil/')).toBe('https://fnugg.no/trysil/');
    expect(fnuggResortPageUrl('/oslo-vinterpark/')).toBe(
      'https://fnugg.no/oslo-vinterpark/',
    );
    expect(fnuggResortPageUrl('/al/')).toBe('https://fnugg.no/al/');
    expect(fnuggResortPageUrl(' /hemsedal/ ')).toBe(
      'https://fnugg.no/hemsedal/',
    );
    expect(fnuggResortPageUrl('https://fnugg.no/trysil/')).toBeNull();
    expect(fnuggResortPageUrl('//fnugg.no/trysil/')).toBeNull();
    expect(fnuggResortPageUrl('/trysil/extra/')).toBeNull();
    expect(fnuggResortPageUrl('/../')).toBeNull();
    expect(fnuggResortPageUrl('/Trysil/')).toBeNull();
    expect(fnuggResortPageUrl('')).toBeNull();
    expect(fnuggResortPageUrl(null)).toBeNull();

    const mapped = mapFnuggHits(
      {
        hits: {
          hits: [
            {
              _source: {
                id: 2,
                name: 'SkiStar Trysil',
                location: { lat: 61.3, lon: 12.2 },
                site_path: '/trysil/',
                conditions: { combined: { top: { temperature: -4 } } },
              },
            },
            {
              _source: {
                id: 9,
                name: 'Unsafe path',
                location: { lat: 60, lon: 8 },
                site_path: 'https://example.test/resort',
              },
            },
          ],
        },
      },
      false,
    );
    expect(mapped.map((hit) => hit.sourceUrl)).toEqual([
      'https://fnugg.no/trysil/',
      null,
    ]);
    expect(JSON.stringify(mapped)).not.toContain('temperature');
    expect(JSON.stringify(mapped)).not.toContain('conditions');
  });

  it('returns an empty list instead of inventing resorts', async () => {
    const adapter = new FnuggResortAdapter({
      get: () =>
        Promise.resolve({
          status: 200,
          data: { hits: { total: 0, hits: [] } },
        }),
    });
    await expect(adapter.searchByName('')).resolves.toEqual([]);
    await expect(adapter.searchByName('Ål')).resolves.toEqual([]);
    expect(mapFnuggHits({ hits: { hits: [] } }, true)).toEqual([]);
  });

  it('fails closed when Fnugg is unavailable', async () => {
    const down = new FnuggResortAdapter({
      get: () => Promise.resolve({ status: 503, data: { error: 'down' } }),
    });
    await expect(down.searchByName('Ål')).rejects.toBeInstanceOf(
      ResortDirectoryUnavailableError,
    );

    const broken = new FnuggResortAdapter({
      get: () =>
        Promise.resolve({
          status: 200,
          data: { error: 'Missing required parameter: q' },
        }),
    });
    await expect(broken.nearby(60, 8)).rejects.toBeInstanceOf(
      ResortDirectoryUnavailableError,
    );

    const network = new FnuggResortAdapter({
      get: () => {
        throw new Error('network');
      },
    });
    await expect(network.searchByName('Hemsedal')).rejects.toBeInstanceOf(
      ResortDirectoryUnavailableError,
    );
  });
});

describe('ResortsService', () => {
  const directory = {
    searchByName: jest.fn(() =>
      Promise.resolve([
        {
          id: '141',
          name: 'Ål Skisenter',
          lat: 60.6301,
          lon: 8.5604,
          straightLineDistanceM: null,
          sourceUrl: 'https://fnugg.no/al/',
        },
      ]),
    ),
    nearby: jest.fn(() => Promise.resolve([])),
  };

  it('exposes attribution and straight-line distance without Fnugg weather', async () => {
    const service = new ResortsService(directory);
    const named = await service.search('Ål');
    expect(named).toEqual({
      attribution: 'Fnugg.no',
      distanceKind: 'straight_line',
      resorts: [
        {
          id: '141',
          name: 'Ål Skisenter',
          lat: 60.6301,
          lon: 8.5604,
          straightLineDistanceM: null,
          sourceUrl: 'https://fnugg.no/al/',
        },
      ],
    });
    expect(JSON.stringify(named)).not.toContain('conditions');

    const nearby = await service.nearby(61.1, 8.5);
    expect(nearby.resorts).toEqual([]);
    expect(directory.nearby).toHaveBeenCalledWith(61.1, 8.5);
  });

  it('does not replace an outage with an empty resort list', async () => {
    const service = new ResortsService({
      searchByName: () => {
        throw new ResortDirectoryUnavailableError();
      },
      nearby: () => {
        throw new ResortDirectoryUnavailableError();
      },
    });
    await expect(service.search('Ål')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(service.nearby(60, 10)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
