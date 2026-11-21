import '@testing-library/jest-dom/vitest';

// jsdom lacks these browser APIs.
if (typeof window !== 'undefined') {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia;
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = (() => {}) as typeof window.scrollTo;
}
