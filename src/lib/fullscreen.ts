import { useEffect, useState } from 'react';

export const fullscreenSupported = (): boolean => typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;

/** Must be called from a user gesture (a click). Resolves false if the browser refuses or doesn't support it. */
export async function enterFullscreen(): Promise<boolean> {
  try {
    if (!document.documentElement.requestFullscreen) return false;
    await document.documentElement.requestFullscreen();
    return true;
  } catch {
    return false;
  }
}

export function useIsFullscreen(): boolean {
  const [on, setOn] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
  useEffect(() => {
    const h = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);
  return on;
}

interface WakeLockSentinelLike { release(): Promise<void> }
interface WakeLockNav { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } }

/** Keeps the screen awake while mounted (where supported), re-acquiring after the tab becomes visible again. */
export function useWakeLock(): void {
  useEffect(() => {
    const nav = navigator as unknown as WakeLockNav;
    if (!nav.wakeLock) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let alive = true;
    const acquire = () => { nav.wakeLock!.request('screen').then((s) => { if (alive) sentinel = s; else void s.release(); }).catch(() => {}); };
    const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };
    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; document.removeEventListener('visibilitychange', onVisible); void sentinel?.release(); };
  }, []);
}
