import { TrailDirectoryUnavailableError } from './trail.types';
import {
  CachingTrailDirectory,
  TRAIL_CELL_FETCH_RADIUS_M,
  TRAIL_SOURCE_REFRESH_MS,
  TrailCollectionCache,
  trailCacheCell,
} from './trail-cache';

const oslo = { lat: 59.98, lon: 10.7 };
const hour = 60 * 60 * 1000;

function feature(options: {
  id: string;
  name: string;
  posList: string;
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
      </app:Skiløype>
    </wfs:member>`;
}

const nearCollection = `<wfs:FeatureCollection>
  ${feature({
    id: 'try-1',
    name: 'TRY-løypa',
    posList: '59.981809 10.653763 59.982000 10.654000',
  })}
  ${feature({
    id: 'al-1',
    name: '&#197;l-løypa',
    posList: '59.990000 10.700000 59.991000 10.701000',
  })}
  ${feature({
    id: 'far-1',
    name: 'Langt unna',
    posList: '60.630100 8.560400 60.631000 8.561000',
  })}
</wfs:FeatureCollection>`;

const updatedCollection = `<wfs:FeatureCollection>
  ${feature({
    id: 'new-1',
    name: 'Ny løype',
    posList: '59.981000 10.701000 59.982000 10.702000',
  })}
</wfs:FeatureCollection>`;

function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('CachingTrailDirectory', () => {
  const silent = { warn: () => undefined };

  it('serves a second nearby search from the cell cache', async () => {
    const fetchFeatureCollection = jest.fn(() =>
      Promise.resolve(nearCollection),
    );
    const directory = new CachingTrailDirectory(
      { fetchFeatureCollection },
      new TrailCollectionCache(),
      { now: () => Date.parse('2026-10-02T12:00:00Z'), logger: silent },
    );

    const first = await directory.nearby(oslo.lat, oslo.lon);
    const second = await directory.nearby(oslo.lat, oslo.lon);

    expect(fetchFeatureCollection).toHaveBeenCalledTimes(1);
    expect(fetchFeatureCollection).toHaveBeenCalledWith(
      trailCacheCell(oslo.lat, oslo.lon).lat,
      trailCacheCell(oslo.lat, oslo.lon).lon,
      TRAIL_CELL_FETCH_RADIUS_M,
    );
    expect(second.map((hit) => hit.name)).toEqual(['Ål-løypa', 'TRY-løypa']);
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).not.toContain('Langt unna');
  });

  it('filters a stored collection by the requested origin', async () => {
    const fetchFeatureCollection = jest.fn(() =>
      Promise.resolve(nearCollection),
    );
    const directory = new CachingTrailDirectory(
      { fetchFeatureCollection },
      new TrailCollectionCache(),
      { now: () => 0, logger: silent },
    );

    const fromOslo = await directory.nearby(oslo.lat, oslo.lon);
    const sameCell = await directory.nearby(59.984, 10.704);
    const fromAal = await directory.nearby(60.6301, 8.5604);
    const distance = (
      hits: { id: string; straightLineDistanceM: number }[],
      id: string,
    ) => hits.find((hit) => hit.id === id)?.straightLineDistanceM;

    expect(fetchFeatureCollection).toHaveBeenCalledTimes(2);
    expect(trailCacheCell(oslo.lat, oslo.lon).key).toBe(
      trailCacheCell(59.984, 10.704).key,
    );
    expect(fromOslo.map((hit) => hit.id)).toEqual(['al-1', 'try-1']);
    expect(sameCell.map((hit) => hit.id)).toEqual(['al-1', 'try-1']);
    expect(distance(fromOslo, 'al-1')).not.toBe(distance(sameCell, 'al-1'));
    expect(fromAal.map((hit) => hit.name)).toEqual(['Langt unna']);
    expect(fromOslo.every((hit) => hit.name !== 'Langt unna')).toBe(true);
    expect(fromAal.every((hit) => hit.straightLineDistanceM <= 8_000)).toBe(
      true,
    );
  });

  it('returns a stale cell without waiting for the refresh', async () => {
    let now = Date.parse('2026-10-02T12:00:00Z');
    let calls = 0;
    let releaseRefresh: (xml: string) => void = () => undefined;
    const fetchFeatureCollection = jest.fn(() => {
      calls += 1;
      if (calls === 1) return Promise.resolve(nearCollection);
      return new Promise<string>((resolve) => {
        releaseRefresh = resolve;
      });
    });
    const directory = new CachingTrailDirectory(
      { fetchFeatureCollection },
      new TrailCollectionCache(),
      { now: () => now, logger: silent },
    );

    const first = await directory.nearby(oslo.lat, oslo.lon);
    now += TRAIL_SOURCE_REFRESH_MS + hour;
    const stale = await Promise.race([
      directory.nearby(oslo.lat, oslo.lon),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('nearby waited for refresh')), 200),
      ),
    ]);
    expect(stale).toEqual(first);
    expect(fetchFeatureCollection).toHaveBeenCalledTimes(2);

    releaseRefresh(updatedCollection);
    await flush();
    const refreshed = await directory.nearby(oslo.lat, oslo.lon);
    expect(refreshed.map((hit) => hit.name)).toEqual(['Ny løype']);
    expect(fetchFeatureCollection).toHaveBeenCalledTimes(2);
  });

  it('keeps the last collection when refresh fails and logs its age', async () => {
    let now = Date.parse('2026-10-02T12:00:00Z');
    const warnings: string[] = [];
    let calls = 0;
    const fetchFeatureCollection = jest.fn(() => {
      calls += 1;
      if (calls === 1) return Promise.resolve(nearCollection);
      return Promise.reject(new TrailDirectoryUnavailableError());
    });
    const directory = new CachingTrailDirectory(
      { fetchFeatureCollection },
      new TrailCollectionCache(),
      {
        now: () => now,
        logger: { warn: (message) => warnings.push(message) },
      },
    );

    const first = await directory.nearby(oslo.lat, oslo.lon);
    now += TRAIL_SOURCE_REFRESH_MS + hour;
    const stale = await directory.nearby(oslo.lat, oslo.lon);
    await flush();
    const again = await directory.nearby(oslo.lat, oslo.lon);

    expect(stale).toEqual(first);
    expect(again).toEqual(first);
    expect(fetchFeatureCollection).toHaveBeenCalledTimes(2);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('serving last known good');
    expect(warnings[0]).toContain('2026-10-02T12:00:00.000Z');
    expect(warnings[0]).toContain(`${TRAIL_SOURCE_REFRESH_MS + hour}ms old`);
    expect(warnings[0]).not.toContain(trailCacheCell(oslo.lat, oslo.lon).key);
    expect(warnings[0]).not.toContain(String(oslo.lat));
    expect(again).not.toEqual([]);
  });

  it('starts one refresh when several stale requests arrive together', async () => {
    let now = Date.parse('2026-10-02T12:00:00Z');
    let calls = 0;
    let releaseRefresh: (xml: string) => void = () => undefined;
    const fetchFeatureCollection = jest.fn(() => {
      calls += 1;
      if (calls === 1) return Promise.resolve(nearCollection);
      return new Promise<string>((resolve) => {
        releaseRefresh = resolve;
      });
    });
    const directory = new CachingTrailDirectory(
      { fetchFeatureCollection },
      new TrailCollectionCache(),
      { now: () => now, logger: silent },
    );

    await directory.nearby(oslo.lat, oslo.lon);
    now += TRAIL_SOURCE_REFRESH_MS + 1;
    const first = directory.nearby(oslo.lat, oslo.lon);
    const second = directory.nearby(oslo.lat, oslo.lon);
    const [left, right] = await Promise.all([first, second]);
    expect(left.map((hit) => hit.id)).toEqual(right.map((hit) => hit.id));
    expect(fetchFeatureCollection).toHaveBeenCalledTimes(2);

    releaseRefresh(updatedCollection);
    await flush();
    expect(fetchFeatureCollection).toHaveBeenCalledTimes(2);
  });

  it('shares one cold fetch across concurrent requests', async () => {
    let release: (xml: string) => void = () => undefined;
    const fetchFeatureCollection = jest.fn(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    );
    const directory = new CachingTrailDirectory(
      { fetchFeatureCollection },
      new TrailCollectionCache(),
      { now: () => 0, logger: silent },
    );

    const pending = Promise.all([
      directory.nearby(oslo.lat, oslo.lon),
      directory.nearby(oslo.lat, oslo.lon),
    ]);
    await flush();
    expect(fetchFeatureCollection).toHaveBeenCalledTimes(1);
    release(nearCollection);
    const [left, right] = await pending;
    expect(left.map((hit) => hit.name)).toEqual(['Ål-løypa', 'TRY-løypa']);
    expect(right).toEqual(left);
  });

  it('does not cache a cold outage as an empty trail list', async () => {
    let fail = true;
    const fetchFeatureCollection = jest.fn(() => {
      if (fail) return Promise.reject(new TrailDirectoryUnavailableError());
      return Promise.resolve(nearCollection);
    });
    const directory = new CachingTrailDirectory(
      { fetchFeatureCollection },
      new TrailCollectionCache(),
      { now: () => 0, logger: silent },
    );

    await expect(directory.nearby(oslo.lat, oslo.lon)).rejects.toBeInstanceOf(
      TrailDirectoryUnavailableError,
    );
    fail = false;
    const hits = await directory.nearby(oslo.lat, oslo.lon);
    expect(hits.map((hit) => hit.name)).toEqual(['Ål-løypa', 'TRY-løypa']);
    expect(fetchFeatureCollection).toHaveBeenCalledTimes(2);
    await expect(directory.nearby(Number.NaN, 10)).resolves.toEqual([]);
    expect(fetchFeatureCollection).toHaveBeenCalledTimes(2);
  });

  it('drops the oldest cell when the cache is full', () => {
    const cache = new TrailCollectionCache(2);
    cache.set('a', { xml: 'a', fetchedAt: 1, checkedAt: 1 });
    cache.set('b', { xml: 'b', fetchedAt: 2, checkedAt: 2 });
    cache.get('a');
    cache.set('c', { xml: 'c', fetchedAt: 3, checkedAt: 3 });
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')?.xml).toBe('a');
    expect(cache.size).toBe(2);
  });
});
