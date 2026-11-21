// Edge Function: poll-views. Invoked every 15 minutes by pg_cron + pg_net (see migrations).
// Reads YouTube channel statistics and records verified snapshots/ticks via record_snapshot().
import { createClient } from 'npm:@supabase/supabase-js@2';
import { isAuthorized, pollViews } from './handler.ts';

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const ytKey = Deno.env.get('YOUTUBE_API_KEY') ?? '';

  // verify_jwt is off (config.toml); only the service role key may trigger a poll,
  // so the public anon key can't be used to burn YouTube quota.
  if (!isAuthorized(req.headers.get('Authorization'), serviceKey)) {
    return json({ error: 'unauthorized' }, 401);
  }
  if (!ytKey || !supabaseUrl) {
    return json({ error: 'server not configured: YOUTUBE_API_KEY / SUPABASE_URL missing' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const summary = await pollViews({
    youtubeApiKey: ytKey,
    fetchImpl: fetch,
    log: (m, x) => console.error(`[poll-views] ${m}`, x ?? ''),
    async listArtists() {
      const { data, error } = await supabase.from('artists').select('id, youtube_channel_id');
      if (error) throw error;
      return data ?? [];
    },
    async recordSnapshot(artistId, totalViews) {
      const { data, error } = await supabase.rpc('record_snapshot', { p_artist: artistId, p_total_views: totalViews });
      if (error) throw error;
      return Number(data);
    },
  });

  return json(summary, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
