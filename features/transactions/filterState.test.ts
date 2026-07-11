import { countActiveTransactionFilters } from './filterState';

describe('countActiveTransactionFilters', () => {
  it('counts contextual filters so the filter sheet exposes a clear action', () => {
    expect(
      countActiveTransactionFilters({
        categoryCount: 0,
        transactionType: 'all',
        merchant: 'Corner Shop',
        uncategorized: true,
      })
    ).toBe(2);
  });

  it('returns zero when every filter is cleared', () => {
    expect(
      countActiveTransactionFilters({
        categoryCount: 0,
        transactionType: 'all',
      })
    ).toBe(0);
  });
});
