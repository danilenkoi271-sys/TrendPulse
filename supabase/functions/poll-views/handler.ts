// Pure, dependency-injected core of poll-views so it can be tested without Deno or network.

export interface ArtistRow { id: string; youtube_channel_id: string }

export interface PollDeps {
  /** Verified-tick writer: calls the record_snapshot SQL function (service role only). */
  listArtists(): Promise<ArtistRow[]>;
  recordSnapshot(artistId: string, totalViews: number): Promise<number>;
  fetchImpl: typeof fetch;
  youtubeApiKey: string;
  log?: (msg: string, extra?: unknown) => void;
}

export interface PollSummary {
  updated: { artist_id: string; channel_id: string; total_views: number; price: number }[];
  skipped_unmatched: string[];
  errors: { scope: string; message: string }[];
}

export const BATCH_SIZE = 50;

const YT_URL = 'https://www.googleapis.com/youtube/v3/channels';

export async function pollViews(deps: PollDeps): Promise<PollSummary> {
  const log = deps.log ?? (() => {});
  const summary: PollSummary = { updated: [], skipped_unmatched: [], errors: [] };

  let artists: ArtistRow[];
  try {
    artists = await deps.listArtists();
  } catch (e) {
    summary.errors.push({ scope: 'load-artists', message: errMsg(e) });
    log('failed to load artists', errMsg(e));
    return summary;
  }

  const byChannel = new Map(artists.map((a) => [a.youtube_channel_id, a]));
  const channelIds = [...byChannel.keys()];

  for (let i = 0; i < channelIds.length; i += BATCH_SIZE) {
    const batch = channelIds.slice(i, i + BATCH_SIZE);
    const scope = `batch ${i / BATCH_SIZE + 1}`;
    try {
      const url = `${YT_URL}?part=statistics&id=${batch.map(encodeURIComponent).join(',')}&key=${encodeURIComponent(deps.youtubeApiKey)}`;
      const res = await deps.fetchImpl(url);
      if (!res.ok) {
        // Never log the URL: it contains the API key.
        const body = await res.text().catch(() => '');
        throw new Error(`YouTube API responded ${res.status}${body ? `: ${body.slice(0, 300)}` : ''}`);
      }
      const json = (await res.json()) as { items?: { id: string; statistics?: { viewCount?: string } }[] };
      for (const item of json.items ?? []) {
        const artist = byChannel.get(item.id);
        if (!artist) {
          summary.skipped_unmatched.push(item.id);
          continue;
        }
        const views = Number(item.statistics?.viewCount);
        if (!Number.isFinite(views) || views < 0) {
          summary.errors.push({ scope: item.id, message: 'missing or invalid viewCount' });
          continue;
        }
        try {
          const price = await deps.recordSnapshot(artist.id, views);
          summary.updated.push({ artist_id: artist.id, channel_id: item.id, total_views: views, price });
        } catch (e) {
          summary.errors.push({ scope: item.id, message: errMsg(e) });
          log('record_snapshot failed', { channel: item.id, error: errMsg(e) });
        }
      }
    } catch (e) {
      summary.errors.push({ scope, message: errMsg(e) });
      log('batch failed', { scope, error: errMsg(e) });
    }
  }
  return summary;
}

/** Constant-time-ish comparison of the bearer token against the service role key. */
export function isAuthorized(authHeader: string | null, serviceKey: string): boolean {
  if (!serviceKey || !authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  if (token.length !== serviceKey.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ serviceKey.charCodeAt(i);
  return diff === 0;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
}
