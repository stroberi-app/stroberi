import { parseTransactionInsightRoute } from './insightRoute';

describe('parseTransactionInsightRoute', () => {
  it('returns null when navigation is not an insight action', () => {
    expect(parseTransactionInsightRoute({ categoryId: 'food' })).toBe(null);
  });

  it('normalizes category and merchant parameters', () => {
    expect(
      parseTransactionInsightRoute({
        insightAction: '1',
        categoryId: [' food ', 'ignored'],
        merchant: ' Corner Shop ',
      })
    ).toEqual({
      categoryId: 'food',
      merchant: 'Corner Shop',
      uncategorized: false,
    });
  });

  it('parses small-purchase amount and date context', () => {
    expect(
      parseTransactionInsightRoute({
        insightAction: '1',
        maxExpenseAmount: '8',
        fromDate: '1780272000000',
        toDate: '1782863999999',
      })
    ).toEqual({
      maxExpenseAmount: 8,
      dateRange: [
        new Date('2026-06-01T00:00:00.000Z'),
        new Date('2026-06-30T23:59:59.999Z'),
      ],
      uncategorized: false,
    });
  });

  it('ignores invalid amount and date context', () => {
    expect(
      parseTransactionInsightRoute({
        insightAction: '1',
        maxExpenseAmount: '-1',
        fromDate: 'invalid',
        toDate: '1782863999999',
      })
    ).toEqual({ uncategorized: false });
  });

  it('gives uncategorized actions precedence over other filters', () => {
    expect(
      parseTransactionInsightRoute({
        insightAction: '1',
        categoryId: 'food',
        merchant: 'Corner Shop',
        uncategorized: '1',
      })
    ).toEqual({ uncategorized: true });
  });
});
