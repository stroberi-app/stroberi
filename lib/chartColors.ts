// Deterministic category colour palette for charts.
//
// Categories have no stored colour, so we derive a stable colour from the
// category identifier. The palette is tuned for the app's dark background and
// leads with the brand hue (`$stroberi`) so single-category views stay on brand.

export const CHART_PALETTE = [
  '#E54B4B', // stroberi (brand)
  '#FFA987', // peach (brandSecondary)
  '#4ECDC4', // teal
  '#FFD166', // amber
  '#A78BFA', // violet
  '#6BCB77', // green
  '#4D96FF', // blue
  '#F472B6', // pink
  '#FF9F1C', // orange
  '#22D3EE', // cyan
  '#C084FC', // purple
  '#94D82D', // lime
] as const;

// Neutral colour for "uncategorized" / fallback buckets.
export const CHART_NEUTRAL = '#9CA3AF';

// Small, stable string hash (djb2). Same input always maps to the same slot.
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Returns a stable palette colour for a given category key (id or name).
 * Empty / "uncategorized" keys resolve to the neutral colour.
 */
export function getCategoryColor(key: string | null | undefined): string {
  if (!key) return CHART_NEUTRAL;
  const normalized = key.trim().toLowerCase();
  if (!normalized || normalized === 'uncategorized') return CHART_NEUTRAL;
  return CHART_PALETTE[hashString(normalized) % CHART_PALETTE.length];
}

/**
 * Assigns palette colours to an ordered list of category keys, spreading
 * adjacent items across the palette so neighbouring bars/slices stay distinct
 * even when their hashes would otherwise collide.
 */
export function buildCategoryColorMap(keys: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const used = new Set<string>();
  let cursor = 0;

  for (const key of keys) {
    const preferred = getCategoryColor(key);
    if (preferred === CHART_NEUTRAL || !used.has(preferred)) {
      map[key] = preferred;
      used.add(preferred);
      continue;
    }
    // Collision: walk the palette to the next free colour.
    while (used.has(CHART_PALETTE[cursor % CHART_PALETTE.length])) {
      cursor++;
      if (cursor > CHART_PALETTE.length) break;
    }
    const fallback = CHART_PALETTE[cursor % CHART_PALETTE.length];
    map[key] = fallback;
    used.add(fallback);
    cursor++;
  }

  return map;
}
