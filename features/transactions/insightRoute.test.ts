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
