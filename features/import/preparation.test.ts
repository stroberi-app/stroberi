import { buildImportTransactionPayloads, prepareImportRows } from './preparation';
import type { CSVRow } from './validation';

describe('import preparation', () => {
  const supportedCurrencyCodes = ['USD', 'EUR', 'GBP'];

  it('keeps row numbers absolute across chunked validation', () => {
    const rows: CSVRow[] = [
      {
        merchant: 'Coffee Shop',
        amount: '-4.50',
        date: '2024-01-10',
        currencyCode: 'usd',
      },
      {
        merchant: '',
        amount: '',
        date: '2024-01-11',
        currencyCode: 'usd',
      },
    ];

    const result = prepareImportRows({
      rows,
      supportedCurrencyCodes,
      existingCategoryNames: new Set<string>(),
      baseCurrency: 'USD',
      startIndex: 100,
    });

    expect(result.preparedTransactions.length).toBe(1);
    expect(result.preparedTransactions[0]?.sourceRowNumber).toBe(101);
    expect(result.errors).toContain('Row 102: Missing required fields: amount');
  });

  it('collects new categories from valid rows and maps ids when building payloads', () => {
    const rows: CSVRow[] = [
      {
        merchant: 'Groceries',
        amount: '-42.15',
        date: '2024-01-10',
        currencyCode: 'usd',
        category: 'Food & Drink',
        categoryIcon: '🍔',
      },
      {
        merchant: 'Paycheck',
        amount: '3000.00',
        date: '2024-01-01',
        currencyCode: 'USD',
        category: 'Income',
        categoryIcon: '💰',
      },
      {
        merchant: 'Bookstore',
        amount: '-18.25',
        date: '2024-01-09',
        currencyCode: 'USD',
        category: 'Existing',
      },
    ];

    const prepared = prepareImportRows({
      rows,
      supportedCurrencyCodes,
      existingCategoryNames: new Set(['existing']),
      baseCurrency: 'USD',
    });

    expect(Array.from(prepared.categoriesToCreate.keys())).toEqual([
      'food & drink',
      'income',
    ]);

    const payloads = buildImportTransactionPayloads({
      preparedTransactions: prepared.preparedTransactions,
      categoryIdsByName: new Map([
        ['food & drink', 'category-food'],
        ['income', 'category-income'],
        ['existing', 'category-existing'],
      ]),
    });

    expect(payloads.length).toBe(3);
    expect(payloads[0]?.categoryId).toBe('category-food');
    expect(payloads[1]?.categoryId).toBe('category-income');
    expect(payloads[2]?.categoryId).toBe('category-existing');
  });
});
