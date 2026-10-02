import {
  BoundedElevationCache,
  KartverketElevationAdapter,
  elevationsFromKartverketBody,
  kartverketPunktUrl,
} from './kartverket-elevation.adapter';
import { lookupSampleAltitudes } from './lookup-sample-altitudes';
import type { ElevationHttpGet } from './kartverket-elevation.adapter';

describe('Kartverket elevation adapter', () => {
  const oslo = { lat: 59.91, lon: 10.75 };
  const inland = { lat: 60.5, lon: 8.0 };

  it('maps z values to rounded metres in request order', () => {
    expect(
      elevationsFromKartverketBody(2, {
        punkter: [
          { z: 2.74, x: 10.75, y: 59.91 },
          { z: 987.25, x: 8, y: 60.5 },
        ],
      }),
    ).toEqual([3, 987]);
  });

  it('returns nulls when the response length does not match the request', () => {
    expect(elevationsFromKartverketBody(2, { punkter: [{ z: 10 }] })).toEqual([
      null,
      null,
    ]);
  });

  it('batches above 50 points and caches successful heights', async () => {
    const calls: string[] = [];
    const get: ElevationHttpGet = async (url) => {
      calls.push(url);
      const punkter = JSON.parse(
        new URL(url).searchParams.get('punkter') ?? '[]',
      ) as number[][];
      return {
        status: 200,
        data: { punkter: punkter.map((_, index) => ({ z: 100 + index })) },
      };
    };
    const cache = new BoundedElevationCache();
    const adapter = new KartverketElevationAdapter({ get, cache });
    const points = Array.from({ length: 51 }, (_, index) => ({
      lat: 59 + index * 0.01,
      lon: 10,
    }));

    const first = await adapter.groundElevations(points);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain('koordsys=4258');
    expect(first.points[0].elevationM).toBe(100);
    expect(first.points[50].elevationM).toBe(100);
    expect(first.provider).toBe('kartverket');
    expect(first.attribution).toBe('© Kartverket');
    expect(cache.size).toBe(51);

    calls.length = 0;
    const second = await adapter.groundElevations([points[0], points[50]]);
    expect(calls).toHaveLength(0);
    expect(second.points.map((point) => point.elevationM)).toEqual([100, 100]);
  });

  it('does not cache a failed request and reports no provider', async () => {
    let calls = 0;
    const get: ElevationHttpGet = async () => {
      calls += 1;
      throw new Error('down');
    };
    const adapter = new KartverketElevationAdapter({ get });
    const first = await adapter.groundElevations([oslo, inland]);
    const second = await adapter.groundElevations([oslo]);
    expect(calls).toBe(2);
    expect(first.provider).toBe('none');
    expect(first.attribution).toBeNull();
    expect(first.points.map((point) => point.elevationM)).toEqual([null, null]);
    expect(second.points[0].elevationM).toBeNull();
  });

  it('treats a non-2xx response as unknown heights', async () => {
    const get: ElevationHttpGet = async () => ({ status: 503, data: null });
    const adapter = new KartverketElevationAdapter({ get });
    const lookup = await adapter.groundElevations([oslo]);
    expect(lookup.provider).toBe('none');
    expect(lookup.points[0].elevationM).toBeNull();
  });

  it('builds a geographic punkt URL', () => {
    const url = kartverketPunktUrl('https://ws.geonorge.no/hoydedata/v1/', [
      oslo,
    ]);
    expect(url.startsWith('https://ws.geonorge.no/hoydedata/v1/punkt?')).toBe(
      true,
    );
    const params = new URL(url).searchParams;
    expect(params.get('koordsys')).toBe('4258');
    expect(params.get('punkter')).toBe('[[10.75,59.91]]');
  });
});

describe('lookupSampleAltitudes', () => {
  it('propagates heights by sample index', async () => {
    const lookup = await lookupSampleAltitudes(
      {
        groundElevations: async (points) => ({
          provider: 'kartverket',
          attribution: '© Kartverket',
          points: points.map((point, index) => ({
            ...point,
            elevationM: index === 0 ? 12 : null,
          })),
        }),
      },
      [
        { lat: 1, lon: 2 },
        { lat: 3, lon: 4 },
      ],
    );
    expect(lookup.points.map((point) => point.elevationM)).toEqual([12, null]);
    expect(lookup.attribution).toBe('© Kartverket');
  });

  it('falls back to null heights when the port throws', async () => {
    const lookup = await lookupSampleAltitudes(
      {
        groundElevations: async () => {
          throw new Error('unavailable');
        },
      },
      [{ lat: 59.9, lon: 10.7 }],
    );
    expect(lookup).toEqual({
      provider: 'none',
      attribution: null,
      points: [{ lat: 59.9, lon: 10.7, elevationM: null }],
    });
  });
});
