import { buildInsightsOverview } from './index';
import {
  buildDataQualitySummary,
  generateCategoryPaceInsights,
  generateDataQualityInsights,
  generateSmallPurchaseInsights,
  rankInsights,
} from './generators';
import type { InsightCategory, InsightTransaction } from './types';

const categories: InsightCategory[] = [
  { id: 'food', name: 'Food' },
  { id: 'shopping', name: 'Shopping' },
];

const tx = (
  id: string,
  amount: number,
  date: string,
  categoryId: string | null = 'food'
): InsightTransaction => ({
  id,
  amountInBaseCurrency: amount,
  date: new Date(date),
  categoryId,
  merchant: id,
  type: 'expense',
});

describe('insight generators', () => {
  it('creates a warning when category spend is above previous pace', () => {
    const insights = generateCategoryPaceInsights({
      currentTransactions: [
        tx('food-now-1', 80, '2026-06-10'),
        tx('food-now-2', 70, '2026-06-11'),
      ],
      previousTransactions: [tx('food-prev', 60, '2026-05-10')],
      categories,
      currency: 'EUR',
    });

    expect(insights[0].type).toBe('categorySpike');
    expect(insights[0].categoryId).toBe('food');
    expect(insights[0].severity).toBe('warning');
  });

  it('creates a small purchase insight when tiny transactions add up', () => {
    const insights = generateSmallPurchaseInsights({
      currentTransactions: [
        tx('a', 6, '2026-06-01'),
        tx('b', 7, '2026-06-02'),
        tx('c', 5, '2026-06-03'),
        tx('d', 6, '2026-06-04'),
        tx('e', 7, '2026-06-05'),
      ],
      currency: 'EUR',
      fromDate: new Date('2026-06-01T00:00:00.000Z'),
      toDate: new Date('2026-06-30T23:59:59.999Z'),
    });

    expect(insights.length).toBe(1);
    expect(insights[0].amount).toBe(31);
    expect(insights[0].evidence.transactionIds).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(insights[0].actions).toEqual([
      {
        type: 'viewTransactions',
        label: 'Review small purchases',
        maxExpenseAmount: 8,
        fromDate: new Date('2026-06-01T00:00:00.000Z'),
        toDate: new Date('2026-06-30T23:59:59.999Z'),
      },
    ]);
  });

  it('creates a data quality insight for uncategorized spending', () => {
    const quality = buildDataQualitySummary([tx('uncat', 22, '2026-06-01', null)]);
    const insights = generateDataQualityInsights(quality, 'EUR');

    expect(quality.uncategorizedCount).toBe(1);
    expect(quality.uncategorizedAmount).toBe(22);
    expect(insights[0].type).toBe('dataQuality');
  });

  it('ranks by priority while keeping insight type variety', () => {
    const ranked = rankInsights(
      [
        {
          id: 'a',
          type: 'categorySpike',
          title: 'A',
          body: 'A',
          severity: 'warning',
          confidence: 'high',
          priority: 90,
          evidence: {},
          actions: [],
        },
        {
          id: 'b',
          type: 'categorySpike',
          title: 'B',
          body: 'B',
          severity: 'warning',
          confidence: 'high',
          priority: 80,
          evidence: {},
          actions: [],
        },
        {
          id: 'c',
          type: 'dataQuality',
          title: 'C',
          body: 'C',
          severity: 'neutral',
          confidence: 'medium',
          priority: 70,
          evidence: {},
          actions: [],
        },
      ],
      2
    );

    expect(ranked.map((item) => item.id)).toEqual(['a', 'c']);
  });
});

describe('buildInsightsOverview', () => {
  it('builds the complete overview object', () => {
    const overview = buildInsightsOverview({
      transactions: [
        { ...tx('salary', 2000, '2026-06-01', 'food'), id: 'income', type: 'income' },
        tx('food-now', 120, '2026-06-10', 'food'),
        tx('food-prev', 50, '2026-05-10', 'food'),
      ],
      categories,
      fromDate: new Date('2026-06-01T00:00:00.000Z'),
      toDate: new Date('2026-06-30T23:59:59.999Z'),
      comparisonToDate: new Date('2026-06-15T12:00:00.000Z'),
      previousFromDate: new Date('2026-05-01T00:00:00.000Z'),
      previousToDate: new Date('2026-05-15T12:00:00.000Z'),
      today: new Date('2026-06-15T12:00:00.000Z'),
      currency: 'EUR',
      budgetLimit: 900,
      expectedRecurring: 0,
    });

    expect(overview.safeToSpend.status).toBe('safe');
    expect(overview.forecast.projectedSpend > 0).toBe(true);
    expect(overview.weeklyRecap.summary).toContain('spent');
    expect(overview.insights.length > 0).toBe(true);
  });
});
