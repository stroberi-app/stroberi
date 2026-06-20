import { buildSavingsRateSummary } from './savingsRate';
import type { SavingsRateAnalysis } from './advancedAnalytics';

const makeAnalysis = (
  monthlyRates: SavingsRateAnalysis['monthlyRates']
): SavingsRateAnalysis => ({
  savingsRate: 0,
  totalIncome: monthlyRates.reduce((s, m) => s + m.income, 0),
  totalExpenses: monthlyRates.reduce((s, m) => s + m.expenses, 0),
  netSavings: 0,
  monthlyRates,
  consecutivePositiveMonths: 0,
  trend: 'stable',
});

describe('buildSavingsRateSummary', () => {
  it('marks status onTrack when current month meets target', () => {
    const analysis = makeAnalysis([
      { month: '2026-05', rate: 10, income: 1000, expenses: 900 },
      { month: '2026-06', rate: 25, income: 2000, expenses: 1500 },
    ]);
    const summary = buildSavingsRateSummary({ analysis, target: 20 });
    expect(summary.currentRate).toBe(25);
    expect(summary.status).toBe('onTrack');
    expect(summary.gap).toBe(5);
  });

  it('marks status behind and computes a positive tip amount when under target', () => {
    const analysis = makeAnalysis([
      { month: '2026-06', rate: 10, income: 2000, expenses: 1800 },
    ]);
    const summary = buildSavingsRateSummary({ analysis, target: 20 });
    expect(summary.status).toBe('behind');
    expect(summary.gap).toBe(-10);
    // need 20% of 2000 = 400 saved, currently saving 200 -> 200 more
    expect(summary.tip).toContain('200');
  });

  it('returns unknown status when current month has no income', () => {
    const analysis = makeAnalysis([
      { month: '2026-06', rate: 0, income: 0, expenses: 500 },
    ]);
    const summary = buildSavingsRateSummary({ analysis, target: 20 });
    expect(summary.status).toBe('unknown');
  });

  it('handles empty history', () => {
    const summary = buildSavingsRateSummary({ analysis: makeAnalysis([]), target: 20 });
    expect(summary.currentRate).toBe(0);
    expect(summary.status).toBe('unknown');
    expect(summary.chartData).toEqual([]);
    expect(summary.bestMonth).toBeNull();
    expect(summary.averageRate).toBe(0);
    expect(summary.monthsMet).toBe(0);
    expect(summary.streak).toBe(0);
  });

  it('counts months met, average, best month and current streak', () => {
    const analysis = makeAnalysis([
      { month: '2026-03', rate: 5, income: 1000, expenses: 950 },
      { month: '2026-04', rate: 30, income: 1000, expenses: 700 },
      { month: '2026-05', rate: 22, income: 1000, expenses: 780 },
      { month: '2026-06', rate: 25, income: 1000, expenses: 750 },
    ]);
    const summary = buildSavingsRateSummary({ analysis, target: 20 });
    expect(summary.monthsMet).toBe(3);
    expect(summary.averageRate).toBe(20.5);
    expect(summary.bestMonth).toEqual({ month: '2026-04', rate: 30 });
    expect(summary.streak).toBe(3); // 04,05,06 all >= 20
  });
});
