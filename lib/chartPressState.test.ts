import { sanitizeChartPressNumber } from './chartPressState';

describe('sanitizeChartPressNumber', () => {
  it('returns fallback for undefined press values', () => {
    expect(sanitizeChartPressNumber(undefined, 0)).toBe(0);
  });

  it('returns fallback for NaN press values', () => {
    expect(sanitizeChartPressNumber(Number.NaN, 12)).toBe(12);
  });

  it('returns finite values unchanged', () => {
    expect(sanitizeChartPressNumber(24.5, 0)).toBe(24.5);
  });
});
