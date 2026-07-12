import {
  buildCategoryColorMap,
  CHART_NEUTRAL,
  CHART_PALETTE,
  getCategoryColor,
} from './chartColors';

describe('getCategoryColor', () => {
  it('returns a stable colour for the same key', () => {
    expect(getCategoryColor('groceries')).toBe(getCategoryColor('groceries'));
  });

  it('is case- and whitespace-insensitive', () => {
    expect(getCategoryColor('  Groceries ')).toBe(getCategoryColor('groceries'));
  });

  it('returns the neutral colour for empty / uncategorized keys', () => {
    expect(getCategoryColor('')).toBe(CHART_NEUTRAL);
    expect(getCategoryColor(null)).toBe(CHART_NEUTRAL);
    expect(getCategoryColor('Uncategorized')).toBe(CHART_NEUTRAL);
  });

  it('only ever returns palette colours', () => {
    const colour = getCategoryColor('transport');
    expect([...CHART_PALETTE, CHART_NEUTRAL]).toContain(colour);
  });
});

describe('buildCategoryColorMap', () => {
  it('assigns a colour to every key', () => {
    const keys = ['a', 'b', 'c', 'd'];
    const map = buildCategoryColorMap(keys);
    for (const key of keys) {
      expect(typeof map[key]).toBe('string');
    }
  });

  it('keeps adjacent non-neutral colours distinct when the palette has room', () => {
    const keys = Array.from({ length: CHART_PALETTE.length }, (_, i) => `cat-${i}`);
    const map = buildCategoryColorMap(keys);
    const colours = keys.map((k) => map[k]);
    expect(new Set(colours).size).toBe(CHART_PALETTE.length);
  });
});
