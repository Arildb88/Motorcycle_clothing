import { ServiceUnavailableException } from '@nestjs/common';
import {
  GEONORGE_TRAIL_WFS_URL,
  GeonorgeTrailAdapter,
  TRAIL_NEARBY_RADIUS_M,
  mapGeonorgeSkiTrails,
} from './geonorge-trail.adapter';
import { TrailDirectoryUnavailableError } from './trail.types';
import { TrailsService } from './trails.service';

const oslo = { lat: 59.98, lon: 10.7 };

function feature(options: {
  id: string;
  name: string;
  posList: string;
  preparering?: string;
}): string {
  return `
    <wfs:member>
      <app:Skiløype gml:id="skiloype.${options.id}">
        <app:identifikasjon>
          <app:Identifikasjon>
            <app:lokalId>${options.id}</app:lokalId>
          </app:Identifikasjon>
        </app:identifikasjon>
        <app:senterlinje>
          <gml:LineString srsName="urn:ogc:def:crs:EPSG::4326">
            <gml:posList>${options.posList}</gml:posList>
          </gml:LineString>
        </app:senterlinje>
        <app:skiløypeInfo>
          <app:SkiløypeInfo>
            <app:rutenavn>${options.name}</app:rutenavn>
          </app:SkiløypeInfo>
        </app:skiløypeInfo>
        <app:preparering>${options.preparering ?? 'PM'}</app:preparering>
      </app:Skiløype>
    </wfs:member>`;
}

const longLine = Array.from({ length: 20 }, (_, index) => {
  const lat = (59.99 + index * 0.0001).toFixed(6);
  return `${lat} 10.700000`;
}).join(' ');

const collection = `<?xml version="1.0"?>
<wfs:FeatureCollection>
  ${feature({
    id: 'try-1',
    name: 'TRY-løypa',
    posList: '59.981809 10.653763 59.982000 10.654000',
  })}
  ${feature({
    id: 'al-1',
    name: '&#197;l-løypa',
    posList: longLine,
  })}
  ${feature({
    id: 'far-1',
    name: 'Langt unna',
    posList: '60.630100 8.560400 60.631000 8.561000',
  })}
  ${feature({
    id: 'blank-1',
    name: '   ',
    posList: '59.980000 10.700000 59.981000 10.701000',
  })}
</wfs:FeatureCollection>`;

describe('GeonorgeTrailAdapter', () => {
  it('queries only Skiløype fields around the requested coordinates', async () => {
    const urls: string[] = [];
    const adapter = new GeonorgeTrailAdapter({
      get: (url) => {
        urls.push(url);
        return Promise.resolve({ status: 200, data: collection });
      },
    });

    const hits = await adapter.nearby(oslo.lat, oslo.lon);
    expect(urls).toHaveLength(1);
    expect(urls[0].startsWith(`${GEONORGE_TRAIL_WFS_URL}?`)).toBe(true);
    const params = new URL(urls[0]).searchParams;
    expect(params.get('typeNames')).toBe('app:Skiløype');
    expect(params.get('request')).toBe('GetFeature');
    expect(params.get('srsName')).toContain('4326');
    expect(params.get('preparering')).toBeNull();
    expect(urls[0]).not.toContain('skisporet');
    expect(urls[0]).not.toContain('ut.no');
    const bbox = params.get('BBOX')?.split(',') ?? [];
    const minLat = Number(bbox[0]);
    const minLon = Number(bbox[1]);
    const maxLat = Number(bbox[2]);
    const maxLon = Number(bbox[3]);
    expect((minLat + maxLat) / 2).toBeCloseTo(oslo.lat, 4);
    expect((minLon + maxLon) / 2).toBeCloseTo(oslo.lon, 4);

    expect(hits.map((hit) => hit.name)).toEqual(['Ål-løypa', 'TRY-løypa']);
    const al = hits[0];
    expect(al.id).toBe('al-1');
    expect(al.name).toBe('Ål-løypa');
    expect(al.line.length).toBeLessThanOrEqual(8);
    expect(al.line.length).toBeGreaterThanOrEqual(2);
    expect(al.line[0]).toEqual({ lat: 59.99, lon: 10.7 });
    expect(al.line[al.line.length - 1]?.lat).toBeCloseTo(59.9919, 4);
    expect(
      al.line.every((point) => longLine.includes(point.lat.toFixed(6))),
    ).toBe(true);
    expect(al.straightLineDistanceM).toBeGreaterThan(0);
    expect(al.straightLineDistanceM).toBeLessThan(TRAIL_NEARBY_RADIUS_M);
    expect(JSON.stringify(hits)).not.toContain('preparering');
    expect(JSON.stringify(hits)).not.toContain('PM');
    expect(JSON.stringify(hits)).not.toContain('grooming');
  });

  it('returns an empty list instead of inventing trails', async () => {
    const adapter = new GeonorgeTrailAdapter({
      get: () =>
        Promise.resolve({
          status: 200,
          data: '<wfs:FeatureCollection numberReturned="0"></wfs:FeatureCollection>',
        }),
    });
    await expect(adapter.nearby(oslo.lat, oslo.lon)).resolves.toEqual([]);
    expect(
      mapGeonorgeSkiTrails(
        '<wfs:FeatureCollection></wfs:FeatureCollection>',
        oslo,
        TRAIL_NEARBY_RADIUS_M,
      ),
    ).toEqual([]);
    await expect(adapter.nearby(Number.NaN, 10)).resolves.toEqual([]);
  });

  it('fails closed when Turrutebasen is unavailable', async () => {
    const down = new GeonorgeTrailAdapter({
      get: () => Promise.resolve({ status: 503, data: 'down' }),
    });
    await expect(down.nearby(oslo.lat, oslo.lon)).rejects.toBeInstanceOf(
      TrailDirectoryUnavailableError,
    );

    const broken = new GeonorgeTrailAdapter({
      get: () =>
        Promise.resolve({
          status: 200,
          data: '<ows:ExceptionReport><ows:Exception>missing</ows:Exception></ows:ExceptionReport>',
        }),
    });
    await expect(broken.nearby(oslo.lat, oslo.lon)).rejects.toBeInstanceOf(
      TrailDirectoryUnavailableError,
    );

    const network = new GeonorgeTrailAdapter({
      get: () => {
        throw new Error('network');
      },
    });
    await expect(network.nearby(oslo.lat, oslo.lon)).rejects.toBeInstanceOf(
      TrailDirectoryUnavailableError,
    );
  });
});

describe('TrailsService', () => {
  it('exposes Kartverket attribution and straight-line distance', async () => {
    const directory = {
      nearby: jest.fn(() =>
        Promise.resolve([
          {
            id: 'al-1',
            name: 'Ål-løypa',
            lat: 59.99,
            lon: 10.7,
            straightLineDistanceM: 1112,
            line: [
              { lat: 59.99, lon: 10.7 },
              { lat: 59.991, lon: 10.701 },
            ],
          },
        ]),
      ),
    };
    const service = new TrailsService(directory);
    const nearby = await service.nearby(oslo.lat, oslo.lon);
    expect(nearby).toEqual({
      attribution: 'Kartverket',
      distanceKind: 'straight_line',
      trails: [
        {
          id: 'al-1',
          name: 'Ål-løypa',
          lat: 59.99,
          lon: 10.7,
          straightLineDistanceM: 1112,
          line: [
            { lat: 59.99, lon: 10.7 },
            { lat: 59.991, lon: 10.701 },
          ],
        },
      ],
    });
    expect(directory.nearby).toHaveBeenCalledWith(oslo.lat, oslo.lon);
    expect(JSON.stringify(nearby)).not.toContain('preparering');
  });

  it('does not replace an outage with an empty trail list', async () => {
    const service = new TrailsService({
      nearby: () => {
        throw new TrailDirectoryUnavailableError();
      },
    });
    await expect(service.nearby(oslo.lat, oslo.lon)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('keeps a real empty response empty', async () => {
    const service = new TrailsService({
      nearby: () => Promise.resolve([]),
    });
    const nearby = await service.nearby(oslo.lat, oslo.lon);
    expect(nearby.trails).toEqual([]);
    expect(nearby.attribution).toBe('Kartverket');
  });
});
