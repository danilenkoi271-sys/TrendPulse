const KEY = 'hl-led-board.v1';

export const DEFAULT_SELECTION = ['perp:BTC', 'perp:ETH', 'perp:SOL', 'perp:HYPE'];

/** Which markets to cycle through, in cycle order. Falls back to the defaults if storage is empty or unavailable. */
export function loadSelection(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { selected?: unknown };
      if (Array.isArray(parsed.selected) && parsed.selected.every((k) => typeof k === 'string')) return parsed.selected as string[];
    }
  } catch { /* storage blocked or corrupt */ }
  return [...DEFAULT_SELECTION];
}

export function saveSelection(selected: string[]): void {
  try { localStorage.setItem(KEY, JSON.stringify({ selected })); } catch { /* storage blocked */ }
}
