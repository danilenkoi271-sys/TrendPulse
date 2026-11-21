// @vitest-environment node
// Runs poll-views against a MOCKED YouTube response. When TEST_DATABASE_URL is set,
// record_snapshot runs for real against Postgres (the migrations must be applied),
// so we verify that snapshots and verified ticks are actually written.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { BATCH_SIZE, isAuthorized, pollViews, type ArtistRow } from './handler';

const DB = process.env.TEST_DATABASE_URL;

function ytResponse(items: { id: string; viewCount: string }[]) {
  return new Response(JSON.stringify({ items: items.map((i) => ({ id: i.id, statistics: { viewCount: i.viewCount } })) }), { status: 200 });
}

describe('pollViews (mocked YouTube)', () => {
  const artists: ArtistRow[] = [
    { id: 'a1', youtube_channel_id: 'UC1' },
    { id: 'a2', youtube_channel_id: 'UC2' },
  ];

  it('records a snapshot for matched channels and skips unmatched ones', async () => {
    const calls: [string, number][] = [];
    const out = await pollViews({
      youtubeApiKey: 'k',
      listArtists: async () => artists,
      recordSnapshot: async (id, v) => (calls.push([id, v]), 101.5),
      fetchImpl: (async () => ytResponse([{ id: 'UC1', viewCount: '12345' }, { id: 'UC-unknown', viewCount: '9' }])) as typeof fetch,
    });
    expect(calls).toEqual([['a1', 12345]]);
    expect(out.updated).toHaveLength(1);
    expect(out.skipped_unmatched).toEqual(['UC-unknown']);
    expect(out.errors).toEqual([]);
  });

  it('batches in groups of 50 and sends the key', async () => {
    const many = Array.from({ length: 120 }, (_, i) => ({ id: `a${i}`, youtube_channel_id: `UC${i}` }));
    const urls: string[] = [];
    await pollViews({
      youtubeApiKey: 'SECRET',
      listArtists: async () => many,
      recordSnapshot: async () => 100,
      fetchImpl: (async (u: string) => (urls.push(u), ytResponse([]))) as unknown as typeof fetch,
    });
    expect(BATCH_SIZE).toBe(50);
    expect(urls).toHaveLength(3);
    expect(urls[0]).toContain('part=statistics');
    expect(urls[0]).toContain('key=SECRET');
    expect(decodeURIComponent(urls[0]).split('id=')[1].split('&')[0].split(',')).toHaveLength(50);
    expect(decodeURIComponent(urls[2]).split('id=')[1].split('&')[0].split(',')).toHaveLength(20);
  });

  it('logs API errors without leaking the key, and continues with later batches', async () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ id: `a${i}`, youtube_channel_id: `UC${i}` }));
    let n = 0;
    const logs: string[] = [];
    const out = await pollViews({
      youtubeApiKey: 'SECRET',
      listArtists: async () => many,
      recordSnapshot: async () => 100,
      log: (m, x) => logs.push(m + JSON.stringify(x)),
      fetchImpl: (async () => (++n === 1 ? new Response('quota exceeded', { status: 403 }) : ytResponse([{ id: 'UC55', viewCount: '5' }]))) as typeof fetch,
    });
    expect(out.errors).toHaveLength(1);
    expect(out.errors[0].message).toContain('403');
    expect(out.updated).toHaveLength(1);
    expect(JSON.stringify(out) + logs.join('')).not.toContain('SECRET');
  });

  it('continues when one record_snapshot call fails', async () => {
    const out = await pollViews({
      youtubeApiKey: 'k',
      listArtists: async () => artists,
      recordSnapshot: async (id) => { if (id === 'a1') throw new Error('boom'); return 100; },
      fetchImpl: (async () => ytResponse([{ id: 'UC1', viewCount: '1' }, { id: 'UC2', viewCount: '2' }])) as typeof fetch,
    });
    expect(out.updated.map((u) => u.artist_id)).toEqual(['a2']);
    expect(out.errors).toEqual([{ scope: 'UC1', message: 'boom' }]);
  });

  it('rejects invalid view counts', async () => {
    const out = await pollViews({
      youtubeApiKey: 'k', listArtists: async () => artists, recordSnapshot: async () => 100,
      fetchImpl: (async () => ytResponse([{ id: 'UC1', viewCount: 'abc' }])) as typeof fetch,
    });
    expect(out.updated).toEqual([]);
    expect(out.errors[0].scope).toBe('UC1');
  });
});

describe('isAuthorized', () => {
  it('only accepts the exact service role key', () => {
    expect(isAuthorized('Bearer abc', 'abc')).toBe(true);
    expect(isAuthorized('Bearer abd', 'abc')).toBe(false);
    expect(isAuthorized('Bearer abcd', 'abc')).toBe(false);
    expect(isAuthorized(null, 'abc')).toBe(false);
    expect(isAuthorized('abc', 'abc')).toBe(false);
    expect(isAuthorized('Bearer ', '')).toBe(false);
  });
});

describe.skipIf(!DB)('pollViews against real Postgres functions', () => {
  let client: pg.Client;
  beforeAll(async () => { client = new pg.Client({ connectionString: DB }); await client.connect(); });
  afterAll(async () => { await client?.end(); });

  it('writes snapshots and real (non-simulated) ticks', async () => {
    await client.query('begin');
    try {
      await client.query(`delete from artists`);
      await client.query(`insert into artists (id, name, youtube_channel_id, expected_daily_views) values
        ('00000000-0000-0000-0000-0000000000aa','A','UCaaa',1000),('00000000-0000-0000-0000-0000000000bb','B','UCbbb',2000)`);
      const out = await pollViews({
        youtubeApiKey: 'k',
        fetchImpl: (async () => ytResponse([{ id: 'UCaaa', viewCount: '1000000' }, { id: 'UCbbb', viewCount: '2000000' }, { id: 'UCzzz', viewCount: '1' }])) as typeof fetch,
        listArtists: async () => (await client.query('select id, youtube_channel_id from artists')).rows,
        recordSnapshot: async (id, v) => Number((await client.query('select record_snapshot($1,$2) p', [id, v])).rows[0].p),
      });
      expect(out.updated).toHaveLength(2);
      expect(out.skipped_unmatched).toEqual(['UCzzz']);
      const snaps = await client.query('select count(*)::int c from view_snapshots');
      const ticks = await client.query('select count(*)::int c from price_ticks where not is_simulated');
      expect(snaps.rows[0].c).toBe(2);
      expect(ticks.rows[0].c).toBe(2);
    } finally {
      await client.query('rollback');
    }
  });
});
