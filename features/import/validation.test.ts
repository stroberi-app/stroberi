import { normalizeCurrencyCode, validateCSVRow, type CSVRow } from './validation';

const supportedCurrencyCodes = ['USD', 'EUR', 'GBP'];

describe('import validation', () => {
  it('normalizes currency code to uppercase', () => {
    expect(normalizeCurrencyCode(' usd ')).toBe('USD');
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
