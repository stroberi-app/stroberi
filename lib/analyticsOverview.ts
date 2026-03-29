import dayjs from 'dayjs';
import { formatCurrency } from './format';
import type { SpendingForecast } from './forecasting';
import type { CategoryModel } from '../database/category-model';
import type { TransactionModel } from '../database/transaction-model';

export type DateFilter =
  | 'thisMonth'
  | 'lastMonth'
  | 'last3Months'
  | 'last6Months'
  | 'thisYear';

export type DateRange = {
  fromDate: Date;
  toDate: Date;
  label: string;
};

export type ActionPriority = 'high' | 'medium' | 'low';

export type ActionPlanItem = {
  id: string;
  title: string;
  description: string;
  impact: string;
  priority: ActionPriority;
};

export type CategoryHotspot = {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  currentSpend: number;
  previousSpend: number;
  changePercent: number;
  share: number;
  potentialSavings: number;
};

export type PeriodTotals = {
  income: number;
  expenses: number;
  net: number;
};

export const DATE_FILTER_OPTIONS: Array<{ value: DateFilter; label: string }> = [
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'last3Months', label: '3 Months' },
  { value: 'last6Months', label: '6 Months' },
  { value: 'thisYear', label: 'This Year' },
];

export const getDateRange = (filter: DateFilter): DateRange => {
  const today = dayjs();

  switch (filter) {
    case 'thisMonth':
      return {
        fromDate: today.startOf('month').toDate(),
        toDate: today.endOf('month').toDate(),
        label: 'This month',
      };
    case 'lastMonth':
      return {
        fromDate: today.subtract(1, 'month').startOf('month').toDate(),
        toDate: today.subtract(1, 'month').endOf('month').toDate(),
        label: 'Last month',
      };
    case 'last3Months':
      return {
        fromDate: today.subtract(3, 'month').startOf('month').toDate(),
        toDate: today.endOf('month').toDate(),
        label: 'Last 3 months',
      };
    case 'last6Months':
      return {
        fromDate: today.subtract(6, 'month').startOf('month').toDate(),
        toDate: today.endOf('month').toDate(),
        label: 'Last 6 months',
      };
    case 'thisYear':
      return {
        fromDate: today.startOf('year').toDate(),
        toDate: today.endOf('year').toDate(),
        label: 'This year',
      };
  }
};

export const getPreviousRange = (fromDate: Date, comparisonToDate: Date) => {
  const daysInRange = Math.max(
    1,
    dayjs(comparisonToDate).diff(dayjs(fromDate), 'day') + 1
  );

  return {
    previousFromDate: dayjs(fromDate).subtract(daysInRange, 'day').toDate(),
    previousToDate: dayjs(fromDate).subtract(1, 'day').toDate(),
    daysInRange,
  };
};

export const filterTransactionsByDateRange = (
  transactions: TransactionModel[],
  fromDate: Date,
  toDate: Date
) => {
  return transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.date).getTime();
    return transactionDate >= fromDate.getTime() && transactionDate <= toDate.getTime();
  });
};

export const calculatePeriodTotals = (transactions: TransactionModel[]): PeriodTotals => {
  let income = 0;
  let expenses = 0;

  for (const transaction of transactions) {
    const amount = transaction.amountInBaseCurrency;

    if (amount >= 0) {
      income += amount;
    } else {
      expenses += Math.abs(amount);
    }
  }

  return {
    income,
    expenses,
    net: income - expenses,
  };
};

export const calculatePercentChange = (current: number, previous: number) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
};

export const formatSignedCurrency = (value: number, currency: string) => {
  const formatted = formatCurrency(Math.abs(value), currency);

  if (value === 0) {
    return formatCurrency(0, currency);
  }

  return value > 0 ? `+${formatted}` : `-${formatted}`;
};

export const createCategoryHotspots = (
  periodTransactions: TransactionModel[],
  previousPeriodTransactions: TransactionModel[],
  categories: CategoryModel[]
): CategoryHotspot[] => {
  const currentTotals: Record<string, number> = {};
  const previousTotals: Record<string, number> = {};
  const categoryMeta = new Map(
    categories.map((category) => [
      category.id,
      { name: category.name, icon: category.icon || '•' },
    ])
  );
  const expenseTransactions = periodTransactions.filter(
    (transaction) => transaction.amountInBaseCurrency < 0
  );
  const previousExpenseTransactions = previousPeriodTransactions.filter(
    (transaction) => transaction.amountInBaseCurrency < 0
  );

  for (const transaction of expenseTransactions) {
    const categoryId = transaction.category?.id || 'uncategorized';
    currentTotals[categoryId] =
      (currentTotals[categoryId] || 0) + Math.abs(transaction.amountInBaseCurrency);
  }

  for (const transaction of previousExpenseTransactions) {
    const categoryId = transaction.category?.id || 'uncategorized';
    previousTotals[categoryId] =
      (previousTotals[categoryId] || 0) + Math.abs(transaction.amountInBaseCurrency);
  }

  const totalCurrentSpend = Object.values(currentTotals).reduce(
    (sum, value) => sum + value,
    0
  );
  const allCategoryIds = new Set([
    ...Object.keys(currentTotals),
    ...Object.keys(previousTotals),
  ]);

  return Array.from(allCategoryIds)
    .map((categoryId) => {
      const currentSpend = currentTotals[categoryId] || 0;
      const previousSpend = previousTotals[categoryId] || 0;
      const changePercent = calculatePercentChange(currentSpend, previousSpend);
      const share = totalCurrentSpend > 0 ? (currentSpend / totalCurrentSpend) * 100 : 0;
      const potentialSavings =
        previousSpend > 0
          ? Math.max(0, (currentSpend - previousSpend) * 0.75)
          : currentSpend * 0.12;
      const category = categoryMeta.get(categoryId);

      return {
        categoryId,
        categoryName: category?.name || 'Uncategorized',
        categoryIcon: category?.icon || '•',
        currentSpend,
        previousSpend,
        changePercent,
        share,
        potentialSavings,
      };
    })
    .filter((item) => item.currentSpend > 0)
    .sort((left, right) => right.currentSpend - left.currentSpend);
};

export const calculateNoSpendStats = (
  periodTransactions: TransactionModel[],
  fromDate: Date,
  toDate: Date
) => {
  const expenseDaySet = new Set<string>();

  for (const transaction of periodTransactions) {
    if (transaction.amountInBaseCurrency < 0) {
      expenseDaySet.add(dayjs(transaction.date).format('YYYY-MM-DD'));
    }
  }

  const totalDays = Math.max(1, dayjs(toDate).diff(dayjs(fromDate), 'day') + 1);
  let noSpendDays = 0;
  let bestNoSpendStreak = 0;
  let currentStreak = 0;

  for (let index = 0; index < totalDays; index += 1) {
    const dayKey = dayjs(fromDate).add(index, 'day').format('YYYY-MM-DD');
    const spent = expenseDaySet.has(dayKey);

    if (spent) {
      currentStreak = 0;
      continue;
    }

    noSpendDays += 1;
    currentStreak += 1;
    bestNoSpendStreak = Math.max(bestNoSpendStreak, currentStreak);
  }

  return { noSpendDays, bestNoSpendStreak, totalDays };
};

export const buildActionPlan = ({
  currency,
  periodNet,
  daysInPeriod,
  daysRemainingInPeriod,
  isCurrentPeriod,
  forecast,
  budgetLimit,
  categoryHotspots,
  noSpendDays,
  savingsRate,
  upcomingBillsCount,
}: {
  currency: string;
  periodNet: number;
  daysInPeriod: number;
  daysRemainingInPeriod: number;
  isCurrentPeriod: boolean;
  forecast: SpendingForecast;
  budgetLimit?: number;
  categoryHotspots: CategoryHotspot[];
  noSpendDays: number;
  savingsRate: number;
  upcomingBillsCount: number;
}): ActionPlanItem[] => {
  const actions: ActionPlanItem[] = [];

  if (
    isCurrentPeriod &&
    budgetLimit &&
    budgetLimit > 0 &&
    (forecast.status === 'warning' || forecast.status === 'critical')
  ) {
    const overrun = Math.max(0, forecast.projectedSpend - budgetLimit);
    actions.push({
      id: 'budget-runway',
      title: 'Protect this month budget',
      description:
        forecast.status === 'critical'
          ? `At current pace you may overshoot by ${formatCurrency(overrun, currency)}.`
          : 'You are nearing the monthly budget ceiling.',
      impact:
        forecast.daysRemaining > 0
          ? `Cap daily spend near ${formatCurrency(
              Math.max(0, (budgetLimit - forecast.currentSpend) / forecast.daysRemaining),
              currency
            )}`
          : 'Review month-end spend',
      priority: forecast.status === 'critical' ? 'high' : 'medium',
    });
  }

  if (isCurrentPeriod && periodNet < 0 && daysRemainingInPeriod > 0) {
    const neededDailyShift = Math.abs(periodNet) / daysRemainingInPeriod;
    actions.push({
      id: 'cashflow-shift',
      title: 'Restore positive cashflow',
      description: `You are negative ${formatCurrency(Math.abs(periodNet), currency)} in this period.`,
      impact: `Reduce daily spend by ${formatCurrency(neededDailyShift, currency)}`,
      priority: 'high',
    });
  }

  const topOpportunity = categoryHotspots.find(
    (item) => item.potentialSavings > 0 && item.currentSpend > 0
  );
  if (topOpportunity) {
    actions.push({
      id: 'category-focus',
      title: `Trim ${topOpportunity.categoryName}`,
      description: `${topOpportunity.categoryName} rose ${Math.round(
        topOpportunity.changePercent
      )}% vs previous period.`,
      impact: `Potential savings: ${formatCurrency(topOpportunity.potentialSavings, currency)}`,
      priority: topOpportunity.changePercent > 25 ? 'high' : 'medium',
    });
  }

  const targetNoSpendDays = Math.max(2, Math.round(daysInPeriod * 0.25));
  if (noSpendDays < targetNoSpendDays) {
    actions.push({
      id: 'no-spend-days',
      title: 'Add no-spend days',
      description: `You logged ${noSpendDays} no-spend days out of ${daysInPeriod}.`,
      impact: `Aim for ${targetNoSpendDays} no-spend days this period`,
      priority: 'medium',
    });
  }

  if (upcomingBillsCount > 0) {
    actions.push({
      id: 'upcoming-bills',
      title: 'Prepare for recurring bills',
      description: `${upcomingBillsCount} expected recurring charge(s) in the next 30 days.`,
      impact: 'Set aside cash before due dates',
      priority: 'medium',
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: 'steady',
      title: 'Maintain your momentum',
      description:
        savingsRate >= 15
          ? 'Savings rate is strong. Keep your current habits consistent.'
          : 'Spending and income are balanced right now.',
      impact:
        savingsRate >= 15
          ? 'Keep saving at the current pace'
          : 'Try to lift savings rate by 2-3%',
      priority: 'low',
    });
  }

  return actions.slice(0, 4);
};

export const getPriorityStyles = (priority: ActionPriority) => {
  switch (priority) {
    case 'high':
      return {
        backgroundColor: 'rgba(229, 75, 75, 0.18)',
        borderColor: '$stroberi',
        textColor: '$stroberi',
        label: 'High impact',
      };
    case 'medium':
      return {
        backgroundColor: 'rgba(234, 179, 8, 0.18)',
        borderColor: '$yellow',
        textColor: '$yellow',
        label: 'Worth doing',
      };
    default:
      return {
        backgroundColor: 'rgba(34, 197, 94, 0.16)',
        borderColor: '$green',
        textColor: '$green',
        label: 'Keep it up',
      };
  }
};

export const derivePulseState = ({
  overallScore,
  savingsRate,
  periodNet,
}: {
  overallScore: number;
  savingsRate: number;
  periodNet: number;
}) => {
  if (overallScore >= 80 && savingsRate >= 10 && periodNet >= 0) {
    return {
      label: 'Strong',
      description: 'Your money habits are working in your favor.',
      color: '$green',
      bg: 'rgba(34, 197, 94, 0.16)',
    };
  }

  if (periodNet >= 0 && overallScore >= 65) {
    return {
      label: 'Stable',
      description: 'You are on track, but there is room to optimize.',
      color: '$yellow',
      bg: 'rgba(234, 179, 8, 0.16)',
    };
  }

  return {
    label: 'Needs Attention',
    description: 'Spending pressure is increasing in this period.',
    color: '$stroberi',
    bg: 'rgba(229, 75, 75, 0.16)',
  };
};

export const calculatePotentialMonthlySavings = (categoryHotspots: CategoryHotspot[]) => {
  return categoryHotspots
    .slice(0, 3)
    .reduce((sum, hotspot) => sum + hotspot.potentialSavings, 0);
};

export const getForecastState = (forecast: SpendingForecast, budgetLimit?: number) => {
  if (!budgetLimit || budgetLimit <= 0) {
    return {
      label: 'No budget baseline set',
      color: '$gray11',
    };
  }

  if (forecast.status === 'critical') {
    return {
      label: 'Projected to exceed budget',
      color: '$stroberi',
    };
  }

  if (forecast.status === 'warning') {
    return {
      label: 'Close to monthly limit',
      color: '$yellow',
    };
  }

  return {
    label: 'On pace with budget',
    color: '$green',
  };
};
