/** Small deterministic helpers (used for bots, loot and ids). */

export function hash(...parts: (string | number)[]): number {
  let h = 2166136261 >>> 0;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // final avalanche
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
}

/** deterministic float in [0, 1) */
export function rand01(...parts: (string | number)[]): number {
  return hash(...parts) / 4294967296;
}

export function uid(prefix = ''): string {
  return (
    prefix +
    Date.now().toString(36) +
    Math.floor(Math.random() * 1e9)
      .toString(36)
      .padStart(6, '0')
  );
}

export function pick<T>(arr: readonly T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length];
}
