import { parseBudgetInsightRoute } from './insightRoute';

describe('parseBudgetInsightRoute', () => {
  it('returns null without the one-shot create marker', () => {
    expect(parseBudgetInsightRoute({ categoryId: 'food' })).toBe(null);
  });

  it('normalizes an optional category id', () => {
    expect(
      parseBudgetInsightRoute({ openCreate: '1', categoryId: [' food '] })
    ).toEqual({ categoryId: 'food' });
    expect(parseBudgetInsightRoute({ openCreate: '1', categoryId: ' ' })).toEqual({});
  });
});
