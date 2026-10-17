import { formatCurrency, formatCurrencyWorklet } from './format';

describe('formatCurrency', () => {
  it.each([formatCurrency, formatCurrencyWorklet])('formats valid codes', (format) => {
    expect(format(1234.5, 'USD')).toBe('$1,234.50');
  });

  it.each([
    formatCurrency,
    formatCurrencyWorklet,
  ])('falls back to a plain representation for malformed codes', (format) => {
    expect(format(12, 'not-a-code')).toBe('not-a-code 12.00');
    expect(format(12, '')).toBe('? 12.00');
  });
});
