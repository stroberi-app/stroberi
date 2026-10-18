import { formatCurrency } from './format';

describe('formatCurrency', () => {
  it('formats valid codes', () => {
    expect(formatCurrency(1234.5, 'USD')).toBe('$1,234.50');
  });

  it('falls back to a plain representation for malformed codes', () => {
    expect(formatCurrency(12, 'not-a-code')).toBe('not-a-code 12.00');
    expect(formatCurrency(12, '')).toBe('? 12.00');
  });
});
