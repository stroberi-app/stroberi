import dayjs from 'dayjs';
import type { TransactionModel } from '../database/transaction-model';

// ============================================================================
// Types
// ============================================================================

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

export interface SpendingVelocityAnalysis {
  dailyBurnRate: number;
  weeklyBurnRate: number;
  daysInPeriod: number;
  averageTransactionAmount: number;
  transactionFrequency: number; // transactions per day
  velocityTrend: 'accelerating' | 'decelerating' | 'stable';
  weeklyComparison: Array<{
    week: string;
    total: number;
    dailyAverage: number;
  }>;
}

export interface IncomeExpenseRatioAnalysis {
  ratio: number; // > 1 means saving, < 1 means overspending
  status: 'saving' | 'balanced' | 'overspending';
  totalIncome: number;
  totalExpenses: number;
  monthlyComparison: Array<{
    month: string;
    income: number;
    expenses: number;
    ratio: number;
  }>;
}

export interface CategoryTrendAnalysis {
  trends: Array<{
    categoryId: string;
    categoryName: string;
    currentPeriod: number;
    previousPeriod: number;
    change: number; // percentage change
    trend: 'growing' | 'shrinking' | 'stable';
  }>;
  unusualSpending: Array<{
    categoryId: string;
    categoryName: string;
    currentAmount: number;
    averageAmount: number;
    percentageAbove: number;
  }>;
}

export interface FinancialHealthScore {
  overallScore: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: {
    savingsRate: { score: number; weight: number; description: string };
    budgetAdherence: { score: number; weight: number; description: string };
    spendingStability: { score: number; weight: number; description: string };
    incomeConsistency: { score: number; weight: number; description: string };
  };
  recommendations: string[];
}

// ============================================================================
// Savings Rate Analysis
// ============================================================================

export function calculateSavingsRate(
  transactions: TransactionModel[],
  fromDate: Date,
  toDate: Date
): SavingsRateAnalysis {
  const filteredTx = transactions.filter((tx) => {
    const txDate = new Date(tx.date).getTime();
    return txDate >= fromDate.getTime() && txDate <= toDate.getTime();
  });

  let totalIncome = 0;
  let totalExpenses = 0;

  // Group by month for trend analysis
  const monthlyData: Record<string, { income: number; expenses: number }> = {};

  for (const tx of filteredTx) {
    const amount = tx.amountInBaseCurrency;
    const monthKey = dayjs(tx.date).format('YYYY-MM');

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0 };
    }

    if (amount >= 0) {
      totalIncome += amount;
      monthlyData[monthKey].income += amount;
    } else {
      totalExpenses += Math.abs(amount);
      monthlyData[monthKey].expenses += Math.abs(amount);
    }
  }

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Calculate monthly rates
  const monthlyRates = Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      rate: data.income > 0 ? ((data.income - data.expenses) / data.income) * 100 : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Calculate consecutive positive months (from most recent)
  let consecutivePositiveMonths = 0;
  for (let i = monthlyRates.length - 1; i >= 0; i--) {
    if (monthlyRates[i].rate > 0) {
      consecutivePositiveMonths++;
    } else {
      break;
    }
  }

  // Calculate trend
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (monthlyRates.length >= 2) {
    const recent = monthlyRates.slice(-3);
    if (recent.length >= 2) {
      const diff = recent[recent.length - 1].rate - recent[0].rate;
      if (diff > 5) trend = 'up';
      else if (diff < -5) trend = 'down';
    }
  }

  return {
    savingsRate: Math.round(savingsRate * 10) / 10,
    totalIncome,
    totalExpenses,
    netSavings,
    monthlyRates,
    consecutivePositiveMonths,
    trend,
  };
}

// ============================================================================
// Spending Velocity Analysis
// ============================================================================

export function calculateSpendingVelocity(
  transactions: TransactionModel[],
  fromDate: Date,
  toDate: Date
): SpendingVelocityAnalysis {
  const filteredTx = transactions.filter((tx) => {
    const txDate = new Date(tx.date).getTime();
    return (
      txDate >= fromDate.getTime() &&
      txDate <= toDate.getTime() &&
      tx.amountInBaseCurrency < 0
    );
  });

  const daysInPeriod = Math.max(1, dayjs(toDate).diff(dayjs(fromDate), 'day') + 1);
  const totalSpending = filteredTx.reduce(
    (sum, tx) => sum + Math.abs(tx.amountInBaseCurrency),
    0
  );

  const dailyBurnRate = totalSpending / daysInPeriod;
  const weeklyBurnRate = dailyBurnRate * 7;
  const averageTransactionAmount =
    filteredTx.length > 0 ? totalSpending / filteredTx.length : 0;
  const transactionFrequency = filteredTx.length / daysInPeriod;

  // Weekly breakdown
  const weeklyData: Record<string, number> = {};
  for (const tx of filteredTx) {
    const weekKey = dayjs(tx.date).startOf('week').format('YYYY-MM-DD');
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = 0;
    }
    weeklyData[weekKey] += Math.abs(tx.amountInBaseCurrency);
  }

  const weeklyComparison = Object.entries(weeklyData)
    .map(([week, total]) => ({
      week,
      total,
      dailyAverage: total / 7,
    }))
    .sort((a, b) => a.week.localeCompare(b.week));

  // Calculate velocity trend
  let velocityTrend: 'accelerating' | 'decelerating' | 'stable' = 'stable';
  if (weeklyComparison.length >= 2) {
    const recent = weeklyComparison.slice(-4);
    if (recent.length >= 2) {
      const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
      const secondHalf = recent.slice(Math.floor(recent.length / 2));
      const firstAvg = firstHalf.reduce((s, w) => s + w.total, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, w) => s + w.total, 0) / secondHalf.length;

      const change = ((secondAvg - firstAvg) / (firstAvg || 1)) * 100;
      if (change > 10) velocityTrend = 'accelerating';
      else if (change < -10) velocityTrend = 'decelerating';
    }
  }

  return {
    dailyBurnRate,
    weeklyBurnRate,
    daysInPeriod,
    averageTransactionAmount,
    transactionFrequency,
    velocityTrend,
    weeklyComparison,
  };
}

// ============================================================================
// Income vs Expense Ratio Analysis
// ============================================================================

export function calculateIncomeExpenseRatio(
  transactions: TransactionModel[],
  fromDate: Date,
  toDate: Date
): IncomeExpenseRatioAnalysis {
  const filteredTx = transactions.filter((tx) => {
    const txDate = new Date(tx.date).getTime();
    return txDate >= fromDate.getTime() && txDate <= toDate.getTime();
  });

  let totalIncome = 0;
  let totalExpenses = 0;
  const monthlyData: Record<string, { income: number; expenses: number }> = {};

  for (const tx of filteredTx) {
    const amount = tx.amountInBaseCurrency;
    const monthKey = dayjs(tx.date).format('YYYY-MM');

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0 };
    }

    if (amount >= 0) {
      totalIncome += amount;
      monthlyData[monthKey].income += amount;
    } else {
      totalExpenses += Math.abs(amount);
      monthlyData[monthKey].expenses += Math.abs(amount);
    }
  }

  const ratio =
    totalExpenses > 0 ? totalIncome / totalExpenses : totalIncome > 0 ? 999 : 1;

  let status: 'saving' | 'balanced' | 'overspending' = 'balanced';
  if (ratio > 1.1) status = 'saving';
  else if (ratio < 0.9) status = 'overspending';

  const monthlyComparison = Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      ratio: data.expenses > 0 ? data.income / data.expenses : data.income > 0 ? 999 : 1,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    ratio: Math.round(ratio * 100) / 100,
    status,
    totalIncome,
    totalExpenses,
    monthlyComparison,
  };
}

// ============================================================================
// Category Trend Analysis
// ============================================================================

export function calculateCategoryTrends(
  transactions: TransactionModel[],
  fromDate: Date,
  toDate: Date,
  categories: Array<{ id: string; name: string }>
): CategoryTrendAnalysis {
  const periodDays = dayjs(toDate).diff(dayjs(fromDate), 'day') + 1;
  const previousFromDate = dayjs(fromDate).subtract(periodDays, 'day').toDate();
  const previousToDate = dayjs(fromDate).subtract(1, 'day').toDate();

  const currentTx = transactions.filter((tx) => {
    const txDate = new Date(tx.date).getTime();
    return (
      txDate >= fromDate.getTime() &&
      txDate <= toDate.getTime() &&
      tx.amountInBaseCurrency < 0
    );
  });

  const previousTx = transactions.filter((tx) => {
    const txDate = new Date(tx.date).getTime();
    return (
      txDate >= previousFromDate.getTime() &&
      txDate <= previousToDate.getTime() &&
      tx.amountInBaseCurrency < 0
    );
  });

  // Calculate totals by category for both periods
  const currentByCategory: Record<string, number> = {};
  const previousByCategory: Record<string, number> = {};

  for (const tx of currentTx) {
    const catId = tx.category?.id || 'uncategorized';
    currentByCategory[catId] =
      (currentByCategory[catId] || 0) + Math.abs(tx.amountInBaseCurrency);
  }

  for (const tx of previousTx) {
    const catId = tx.category?.id || 'uncategorized';
    previousByCategory[catId] =
      (previousByCategory[catId] || 0) + Math.abs(tx.amountInBaseCurrency);
  }

  // Build trends array
  const allCategoryIds = new Set([
    ...Object.keys(currentByCategory),
    ...Object.keys(previousByCategory),
  ]);

  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name || 'Uncategorized';

  const trends = Array.from(allCategoryIds)
    .map((categoryId) => {
      const currentPeriod = currentByCategory[categoryId] || 0;
      const previousPeriod = previousByCategory[categoryId] || 0;
      const change =
        previousPeriod > 0
          ? ((currentPeriod - previousPeriod) / previousPeriod) * 100
          : currentPeriod > 0
            ? 100
            : 0;

      let trend: 'growing' | 'shrinking' | 'stable' = 'stable';
      if (change > 15) trend = 'growing';
      else if (change < -15) trend = 'shrinking';

      return {
        categoryId,
        categoryName: getCategoryName(categoryId),
        currentPeriod,
        previousPeriod,
        change: Math.round(change),
        trend,
      };
    })
    .filter((t) => t.currentPeriod > 0 || t.previousPeriod > 0)
    .sort((a, b) => b.currentPeriod - a.currentPeriod);

  // Detect unusual spending (50%+ above average)
  const unusualSpending = trends
    .filter((t) => t.previousPeriod > 0 && t.change > 50)
    .map((t) => ({
      categoryId: t.categoryId,
      categoryName: t.categoryName,
      currentAmount: t.currentPeriod,
      averageAmount: t.previousPeriod,
      percentageAbove: t.change,
    }));

  return { trends, unusualSpending };
}

// ============================================================================
// Financial Health Score
// ============================================================================

export function calculateFinancialHealthScore(
  transactions: TransactionModel[],
  fromDate: Date,
  toDate: Date,
  budgetAdherencePercentage?: number // 0-100, optional
): FinancialHealthScore {
  const savingsAnalysis = calculateSavingsRate(transactions, fromDate, toDate);
  const velocityAnalysis = calculateSpendingVelocity(transactions, fromDate, toDate);
  const ratioAnalysis = calculateIncomeExpenseRatio(transactions, fromDate, toDate);

  // 1. Savings Rate Score (30% weight)
  // 20%+ savings = 100, 10-20% = 80, 0-10% = 60, negative = proportionally lower
  let savingsScore = 0;
  if (savingsAnalysis.savingsRate >= 20) savingsScore = 100;
  else if (savingsAnalysis.savingsRate >= 10)
    savingsScore = 80 + ((savingsAnalysis.savingsRate - 10) / 10) * 20;
  else if (savingsAnalysis.savingsRate >= 0)
    savingsScore = 60 + (savingsAnalysis.savingsRate / 10) * 20;
  else savingsScore = Math.max(0, 60 + savingsAnalysis.savingsRate);

  // 2. Budget Adherence Score (25% weight)
  // If not provided, calculate based on whether user has income surplus
  let budgetScore = 70;
  if (budgetAdherencePercentage !== undefined) {
    budgetScore = budgetAdherencePercentage;
  } else {
    // No budget set - estimate based on I/E ratio
    if (ratioAnalysis.ratio >= 1.5) budgetScore = 90;
    else if (ratioAnalysis.ratio >= 1.2) budgetScore = 80;
    else if (ratioAnalysis.ratio >= 1.0) budgetScore = 70;
    else if (ratioAnalysis.ratio >= 0.8) budgetScore = 50;
    else budgetScore = 30;
  }

  // 3. Spending Stability Score (25% weight)
  // Based on velocity trend - stable is best
  let stabilityScore = 70;
  if (velocityAnalysis.velocityTrend === 'stable') stabilityScore = 90;
  else if (velocityAnalysis.velocityTrend === 'decelerating') stabilityScore = 80;
  else if (velocityAnalysis.velocityTrend === 'accelerating') stabilityScore = 50;

  // Add variance check from weekly data
  if (velocityAnalysis.weeklyComparison.length >= 2) {
    const values = velocityAnalysis.weeklyComparison.map((w) => w.total);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
    // High coefficient of variation = lower stability
    if (cv < 0.2) stabilityScore = Math.min(100, stabilityScore + 10);
    else if (cv > 0.5) stabilityScore = Math.max(0, stabilityScore - 20);
  }

  // 4. Income Consistency Score (20% weight)
  let incomeScore = 70;
  if (ratioAnalysis.monthlyComparison.length >= 2) {
    const incomes = ratioAnalysis.monthlyComparison.map((m) => m.income);
    const totalIncome = incomes.reduce((a, b) => a + b, 0);

    // Handle case where there's no income at all
    if (totalIncome === 0) {
      incomeScore = 30; // No income is concerning
    } else {
      const avgIncome = totalIncome / incomes.length;
      const incomeVariance =
        incomes.reduce((sum, val) => sum + (val - avgIncome) ** 2, 0) / incomes.length;
      const incomeCv = avgIncome > 0 ? Math.sqrt(incomeVariance) / avgIncome : 0;

      if (incomeCv < 0.1) incomeScore = 100;
      else if (incomeCv < 0.3) incomeScore = 80;
      else if (incomeCv < 0.5) incomeScore = 60;
      else incomeScore = 40;
    }
  } else if (ratioAnalysis.totalIncome === 0) {
    // Only one month of data and no income
    incomeScore = 30;
  }

  // Calculate overall score
  const overallScore = Math.round(
    savingsScore * 0.3 + budgetScore * 0.25 + stabilityScore * 0.25 + incomeScore * 0.2
  );

  // Determine grade
  let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
  if (overallScore >= 90) grade = 'A';
  else if (overallScore >= 80) grade = 'B';
  else if (overallScore >= 70) grade = 'C';
  else if (overallScore >= 60) grade = 'D';

  // Generate recommendations
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
    grade,
    factors: {
      savingsRate: {
        score: Math.round(savingsScore),
        weight: 30,
        description: `${savingsAnalysis.savingsRate.toFixed(1)}% savings rate`,
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
        description: `Spending is ${velocityAnalysis.velocityTrend}`,
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

// ============================================================================
// Utility: Get Month Name
// ============================================================================

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short' });
}

export function formatMonthLabelFull(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}
