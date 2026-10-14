import dayjs from 'dayjs';
import {
  calculatePeriodTotals,
  filterByDateRange,
  groupTotalsByMonth,
  isExpense,
  type LedgerEntry,
  magnitude,
} from './ledger';

export interface SavingsRateAnalysis {
  savingsRate: number; // Percentage (0-100)
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  monthlyRates: Array<{
    month: string;
    rate: number;
    income: number;
    expenses: number;
  }>;
  consecutivePositiveMonths: number;
  trend: 'up' | 'down' | 'stable';
}

type HealthFactor = { score: number; weight: number; description: string };

export interface FinancialHealthScore {
  overallScore: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: {
    savingsRate: HealthFactor;
    budgetAdherence: HealthFactor;
    spendingStability: HealthFactor;
    incomeConsistency: HealthFactor;
  };
  recommendations: string[];
}

type SpendingTrend = 'accelerating' | 'decelerating' | 'stable';

const roundTo = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const mean = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

/** Standard deviation relative to the mean; 0 when the mean is not positive. */
const coefficientOfVariation = (values: number[]) => {
  const average = mean(values);
  if (average <= 0) {
    return 0;
  }

  const variance = mean(values.map((value) => (value - average) ** 2));
  return Math.sqrt(variance) / average;
};

const savingsRateOf = (income: number, expenses: number) =>
  income > 0 ? ((income - expenses) / income) * 100 : 0;

// ============================================================================
// Savings Rate Analysis
// ============================================================================

export function calculateSavingsRate(
  transactions: LedgerEntry[],
  fromDate: Date,
  toDate: Date
): SavingsRateAnalysis {
  const inRange = filterByDateRange(transactions, fromDate, toDate);
  const { income, expenses, net } = calculatePeriodTotals(inRange);
  const monthlyRates = groupTotalsByMonth(inRange).map((month) => ({
    ...month,
    rate: savingsRateOf(month.income, month.expenses),
  }));

  let consecutivePositiveMonths = 0;
  for (let i = monthlyRates.length - 1; i >= 0 && monthlyRates[i].rate > 0; i--) {
    consecutivePositiveMonths++;
  }

  let trend: SavingsRateAnalysis['trend'] = 'stable';
  const recent = monthlyRates.slice(-3);
  if (recent.length >= 2) {
    const diff = recent[recent.length - 1].rate - recent[0].rate;
    if (diff > 5) trend = 'up';
    else if (diff < -5) trend = 'down';
  }

  return {
    savingsRate: roundTo(savingsRateOf(income, expenses), 1),
    totalIncome: income,
    totalExpenses: expenses,
    netSavings: net,
    monthlyRates,
    consecutivePositiveMonths,
    trend,
  };
}

// ============================================================================
// Financial Health Score
// ============================================================================

/** Weekly expense totals in range (oldest first) and their recent direction. */
const analyzeSpendingPace = (
  transactions: LedgerEntry[],
  fromDate: Date,
  toDate: Date
): { weeklyTotals: number[]; trend: SpendingTrend } => {
  const weeks = new Map<string, number>();
  for (const entry of filterByDateRange(transactions, fromDate, toDate)) {
    if (isExpense(entry)) {
      const week = dayjs(entry.date).startOf('week').format('YYYY-MM-DD');
      weeks.set(week, (weeks.get(week) ?? 0) + magnitude(entry));
    }
  }

  const weeklyTotals = Array.from(weeks.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, total]) => total);

  let trend: SpendingTrend = 'stable';
  const recent = weeklyTotals.slice(-4);
  if (recent.length >= 2) {
    const half = Math.floor(recent.length / 2);
    const firstAverage = mean(recent.slice(0, half));
    const secondAverage = mean(recent.slice(half));
    const change = ((secondAverage - firstAverage) / (firstAverage || 1)) * 100;
    if (change > 10) trend = 'accelerating';
    else if (change < -10) trend = 'decelerating';
  }

  return { weeklyTotals, trend };
};

const scoreSavingsRate = (savingsRate: number) => {
  // 20%+ savings = 100, 10-20% = 80-100, 0-10% = 60-80, negative drops below 60.
  if (savingsRate >= 20) return 100;
  if (savingsRate >= 10) return 80 + ((savingsRate - 10) / 10) * 20;
  if (savingsRate >= 0) return 60 + (savingsRate / 10) * 20;
  return Math.max(0, 60 + savingsRate);
};

const scoreIncomeExpenseRatio = (income: number, expenses: number) => {
  const rawRatio = expenses > 0 ? income / expenses : income > 0 ? 999 : 1;
  const ratio = roundTo(rawRatio, 2);

  if (ratio >= 1.5) return 90;
  if (ratio >= 1.2) return 80;
  if (ratio >= 1.0) return 70;
  if (ratio >= 0.8) return 50;
  return 30;
};

const scoreSpendingStability = ({
  weeklyTotals,
  trend,
}: ReturnType<typeof analyzeSpendingPace>) => {
  const trendScore: Record<SpendingTrend, number> = {
    stable: 90,
    decelerating: 80,
    accelerating: 50,
  };
  let score = trendScore[trend];

  if (weeklyTotals.length >= 2) {
    const variation = coefficientOfVariation(weeklyTotals);
    if (variation < 0.2) score = Math.min(100, score + 10);
    else if (variation > 0.5) score = Math.max(0, score - 20);
  }

  return score;
};

const scoreIncomeConsistency = (monthlyIncome: number[], totalIncome: number) => {
  if (totalIncome === 0) return 30;
  if (monthlyIncome.length < 2) return 70;

  const variation = coefficientOfVariation(monthlyIncome);
  if (variation < 0.1) return 100;
  if (variation < 0.3) return 80;
  if (variation < 0.5) return 60;
  return 40;
};

const gradeFor = (score: number): FinancialHealthScore['grade'] => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

export function calculateFinancialHealthScore(
  transactions: LedgerEntry[],
  fromDate: Date,
  toDate: Date,
  budgetAdherencePercentage?: number // 0-100, optional
): FinancialHealthScore {
  const inRange = filterByDateRange(transactions, fromDate, toDate);
  const totals = calculatePeriodTotals(inRange);
  const { savingsRate } = calculateSavingsRate(transactions, fromDate, toDate);
  const pace = analyzeSpendingPace(transactions, fromDate, toDate);

  const savingsScore = scoreSavingsRate(savingsRate);
  // Without a budget, estimate adherence from how far income covers spending.
  const budgetScore =
    budgetAdherencePercentage ?? scoreIncomeExpenseRatio(totals.income, totals.expenses);
  const stabilityScore = scoreSpendingStability(pace);
  const incomeScore = scoreIncomeConsistency(
    groupTotalsByMonth(inRange).map((month) => month.income),
    totals.income
  );

  const overallScore = Math.round(
    savingsScore * 0.3 + budgetScore * 0.25 + stabilityScore * 0.25 + incomeScore * 0.2
  );

  const recommendations: string[] = [];
  if (savingsScore < 60) {
    recommendations.push(
      'Try to increase your savings rate by reducing discretionary spending'
    );
  }
  if (budgetScore < 70) {
    recommendations.push(
      'Consider setting stricter budgets for your top spending categories'
    );
  }
  if (stabilityScore < 70) {
    recommendations.push(
      'Your spending varies a lot - try to maintain consistent spending habits'
    );
  }
  if (incomeScore < 70) {
    recommendations.push('Look for ways to stabilize your income sources');
  }
  if (recommendations.length === 0 && overallScore >= 80) {
    recommendations.push('Great job! Keep up your healthy financial habits');
  }

  return {
    overallScore,
    grade: gradeFor(overallScore),
    factors: {
      savingsRate: {
        score: Math.round(savingsScore),
        weight: 30,
        description: `${savingsRate.toFixed(1)}% savings rate`,
      },
      budgetAdherence: {
        score: Math.round(budgetScore),
        weight: 25,
        description: budgetAdherencePercentage
          ? `${budgetAdherencePercentage}% within budget`
          : 'Based on spending patterns',
      },
      spendingStability: {
        score: Math.round(stabilityScore),
        weight: 25,
        description: `Spending is ${pace.trend}`,
      },
      incomeConsistency: {
        score: Math.round(incomeScore),
        weight: 20,
        description: 'Based on income variation',
      },
    },
    recommendations,
  };
}
