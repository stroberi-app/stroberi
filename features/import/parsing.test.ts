import { parseImportCsv } from './parsing';

describe('parseImportCsv', () => {
  it('returns rows keyed by header', () => {
    const parsed = parseImportCsv(
      'merchant,amount,date,currencyCode\nCafe,-4.5,2026-01-15,EUR\n'
    );

    expect(parsed).toEqual({
      ok: true,
      rows: [
        { merchant: 'Cafe', amount: '-4.5', date: '2026-01-15', currencyCode: 'EUR' },
      ],
    });
  });

  it('rejects files without data rows', () => {
    const parsed = parseImportCsv('merchant,amount,date,currencyCode\n');
    expect(parsed.ok || parsed.error.title).toBe('Empty File');
  });

  it('lists missing required columns', () => {
    const parsed = parseImportCsv('merchant,amount\nCafe,-4.5\n');
    expect(parsed.ok || parsed.error.errors).toEqual([
      'Missing columns: date, currencyCode',
    ]);
  });

  it('rejects malformed CSV', () => {
    const parsed = parseImportCsv('amount,date,currencyCode\n"-4.5,2026-01-15,EUR\n');
    expect(parsed.ok || parsed.error.type).toBe('parse');
  });
});
