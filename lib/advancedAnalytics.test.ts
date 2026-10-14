import type { TransactionModel } from '../database/transaction-model';
import { calculateFinancialHealthScore, calculateSavingsRate } from './advancedAnalytics';

const tx = (date: string, amountInBaseCurrency: number) =>
  ({ date: new Date(date), amountInBaseCurrency }) as TransactionModel;

// Three months of salary plus uneven weekly spending, and one out-of-range row.
const transactions = [
  tx('2026-01-01T09:00:00', 3000),
  tx('2026-01-05T12:00:00', -400),
  tx('2026-01-13T12:00:00', -350),
  tx('2026-01-21T12:00:00', -900),
  tx('2026-02-01T09:00:00', 3100),
  tx('2026-02-03T12:00:00', -1200),
  tx('2026-02-17T12:00:00', -300),
  tx('2026-03-01T09:00:00', 2500),
  tx('2026-03-02T12:00:00', -2000),
  tx('2026-03-09T12:00:00', -900),
  tx('2026-03-23T12:00:00', -150),
  tx('2025-12-15T12:00:00', -5000),
];
const from = new Date('2026-01-01T00:00:00');
const to = new Date('2026-03-31T23:59:59');

// Outputs recorded from the implementation before the ledger refactor.
const CHARACTERIZED_SAVINGS = {
  savingsRate: 27.9,
  totalIncome: 8600,
  totalExpenses: 6200,
  netSavings: 2400,
  monthlyRates: [
    {
      month: '2026-01',
      income: 3000,
      expenses: 1650,
      rate: 45,
    },
    {
      month: '2026-02',
      income: 3100,
      expenses: 1500,
      rate: 51.61290322580645,
    },
    {
      month: '2026-03',
      income: 2500,
      expenses: 3050,
      rate: -22,
    },
  ],
  consecutivePositiveMonths: 0,
  trend: 'down',
};

const CHARACTERIZED_HEALTH = {
  overallScore: 85,
  grade: 'B',
  factors: {
    savingsRate: {
      score: 100,
      weight: 30,
      description: '27.9% savings rate',
    },
    budgetAdherence: {
      score: 80,
      weight: 25,
      description: 'Based on spending patterns',
    },
    spendingStability: {
      score: 60,
      weight: 25,
      description: 'Spending is decelerating',
    },
    incomeConsistency: {
      score: 100,
      weight: 20,
      description: 'Based on income variation',
    },
  },
  recommendations: [
    'Your spending varies a lot - try to maintain consistent spending habits',
  ],
};

const CHARACTERIZED_HEALTH_WITH_BUDGET = {
  overallScore: 79,
  grade: 'C',
  factors: {
    savingsRate: {
      score: 100,
      weight: 30,
      description: '27.9% savings rate',
    },
    budgetAdherence: {
      score: 55,
      weight: 25,
      description: '55% within budget',
    },
    spendingStability: {
      score: 60,
      weight: 25,
      description: 'Spending is decelerating',
    },
    incomeConsistency: {
      score: 100,
      weight: 20,
      description: 'Based on income variation',
    },
  },
  recommendations: [
    'Consider setting stricter budgets for your top spending categories',
    'Your spending varies a lot - try to maintain consistent spending habits',
  ],
};

const CHARACTERIZED_EMPTY = {
  overallScore: 64,
  grade: 'D',
  factors: {
    savingsRate: {
      score: 60,
      weight: 30,
      description: '0.0% savings rate',
    },
    budgetAdherence: {
      score: 70,
      weight: 25,
      description: 'Based on spending patterns',
    },
    spendingStability: {
      score: 90,
      weight: 25,
      description: 'Spending is stable',
    },
    incomeConsistency: {
      score: 30,
      weight: 20,
      description: 'Based on income variation',
    },
  },
  recommendations: ['Look for ways to stabilize your income sources'],
};

describe('calculateSavingsRate', () => {
  it('summarises income, expenses and monthly rates in range', () => {
    expect(calculateSavingsRate(transactions, from, to)).toEqual(CHARACTERIZED_SAVINGS);
  });
});

describe('calculateFinancialHealthScore', () => {
  it('scores estimated budget adherence from the income/expense ratio', () => {
    expect(calculateFinancialHealthScore(transactions, from, to)).toEqual(
      CHARACTERIZED_HEALTH
    );
  });

  it('uses explicit budget adherence when provided', () => {
    expect(calculateFinancialHealthScore(transactions, from, to, 55)).toEqual(
      CHARACTERIZED_HEALTH_WITH_BUDGET
    );
  });

  it('handles an empty ledger', () => {
    expect(calculateFinancialHealthScore([], from, to)).toEqual(CHARACTERIZED_EMPTY);
  });
});
