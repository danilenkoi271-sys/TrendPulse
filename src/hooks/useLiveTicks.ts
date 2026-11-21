import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchTicksAfter } from '../lib/api';
import { mergeTicks } from '../lib/ticks';
import type { Tick } from '../lib/types';

export type FeedMode = 'connecting' | 'realtime' | 'polling';
export const POLL_MS = 30_000;
const REALTIME_GRACE_MS = 5_000;

/**
 * Keeps `ticks` current for one artist: Supabase Realtime inserts when available,
 * otherwise a 30-second poll for newer ticks.
 */
export function useLiveTicks(artistId: string | undefined, seed: Tick[]) {
  const [ticks, setTicks] = useState<Tick[]>(seed);
  const [mode, setMode] = useState<FeedMode>('connecting');
  const lastId = useRef(0);

  useEffect(() => { setTicks(seed); }, [seed]);
  useEffect(() => { lastId.current = ticks.length ? ticks[ticks.length - 1].id : 0; }, [ticks]);

  useEffect(() => {
    if (!artistId) return;
    let alive = true;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let graceTimer: ReturnType<typeof setTimeout> | undefined;
    setMode('connecting');

    const startPolling = () => {
      if (pollTimer) return;
      setMode('polling');
      pollTimer = setInterval(async () => {
        try {
          const fresh = await fetchTicksAfter(artistId, lastId.current);
          if (alive && fresh.length) setTicks((prev) => mergeTicks(prev, fresh));
        } catch { /* try again next interval */ }
      }, POLL_MS);
    };

    const channel = supabase
      .channel(`price_ticks:${artistId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'price_ticks', filter: `artist_id=eq.${artistId}` },
        (payload) => { if (alive) setTicks((prev) => mergeTicks(prev, [payload.new as Tick])); })
      .subscribe((status) => {
        if (!alive) return;
        if (status === 'SUBSCRIBED') {
          clearTimeout(graceTimer);
          if (pollTimer) { clearInterval(pollTimer); pollTimer = undefined; }
          setMode('realtime');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          startPolling();
        }
      });
    graceTimer = setTimeout(() => { if (alive) startPolling(); }, REALTIME_GRACE_MS);

    return () => {
      alive = false;
      clearTimeout(graceTimer);
      if (pollTimer) clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [artistId]);

  return { ticks, mode };
}
