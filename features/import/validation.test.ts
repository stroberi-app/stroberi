import {
  type CSVRow,
  normalizeCurrencyCode,
  parseImportDate,
  validateCSVRow,
} from './validation';

const supportedCurrencyCodes = ['USD', 'EUR', 'GBP'];

describe('import validation', () => {
  it('normalizes currency code to uppercase', () => {
    expect(normalizeCurrencyCode(' usd ')).toBe('USD');
  });

  it('parses date-only values as local midnight', () => {
    const date = parseImportDate('2024-01-15');
    expect([date?.getFullYear(), date?.getMonth(), date?.getDate()]).toEqual([
      2024, 0, 15,
    ]);
    expect(date?.getHours()).toBe(0);
    expect(parseImportDate(' 2024-01-15 10:30:00 ')?.getHours()).toBe(10);
    expect(parseImportDate('not a date')).toBeNull();
  });

  it('does not require merchant', () => {
    const row: CSVRow = {
      merchant: ' ',
      amount: '-12.50',
      date: '2024-01-10',
      currencyCode: 'usd',
    };

    const errors = validateCSVRow(row, 0, supportedCurrencyCodes);
    expect(errors.includes('Row 1: Missing required fields: merchant')).toBe(false);
  });

  it('lists all missing required fields precisely', () => {
    const row: CSVRow = {
      merchant: 'Coffee Shop',
      amount: ' ',
      date: '',
      currencyCode: ' ',
    };

    const errors = validateCSVRow(row, 4, supportedCurrencyCodes);
    expect(errors).toContain('Row 5: Missing required fields: amount, date, currency');
  });

  it('validates unsupported currency code', () => {
    const row: CSVRow = {
      merchant: 'Coffee Shop',
      amount: '-12.50',
      date: '2024-01-10',
      currencyCode: 'cad',
    };

    const errors = validateCSVRow(row, 2, supportedCurrencyCodes);
    expect(errors).toContain("Row 3: Currency code 'CAD' is not supported");
  });
});
