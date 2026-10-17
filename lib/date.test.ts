import { formatMonthLabel } from './date';

describe('formatMonthLabel', () => {
  it('renders the short month name for a YYYY-MM key', () => {
    expect(formatMonthLabel('2026-01')).toBe('Jan');
    expect(formatMonthLabel('2025-12')).toBe('Dec');
  });
});
