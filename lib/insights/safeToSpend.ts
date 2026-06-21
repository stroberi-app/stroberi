import dayjs from 'dayjs';
import type {
  InsightConfidence,
  InsightTransaction,
  MonthForecast,
  SafeToSpendStatus,
  SafeToSpendSummary,
} from './types';

type CalculateSafeToSpendArgs = {
  transactions: InsightTransaction[];
  fromDate: Date;
  toDate: Date;
  today: Date;
  budgetLimit?: number;
  expectedRecurring: number;
  historicalMonthlyAverage?: number;
};

type CalculateMonthForecastArgs = {
  currentSpend: number;
  budgetLimit?: number;
  fromDate: Date;
  toDate: Date;
  today: Date;
  dataConfidence: InsightConfidence;
};

const clampMoney = (value: number) => Math.round(value * 100) / 100;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const utcDayNumber = (date: Date) =>
  Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / MS_PER_DAY
  );

const sumExpenses = (transactions: InsightTransaction[]) =>
  transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + Math.abs(transaction.amountInBaseCurrency), 0);

const sumIncome = (transactions: InsightTransaction[]) =>
  transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + Math.abs(transaction.amountInBaseCurrency), 0);

const getTransactionsInRange = (
  transactions: InsightTransaction[],
  fromDate: Date,
  toDate: Date
) =>
  transactions.filter((transaction) => {
    const time = transaction.date.getTime();
    return time >= fromDate.getTime() && time <= toDate.getTime();
  });

export const getHistoricalMonthlyAverage = (
  transactions: InsightTransaction[],
  today: Date
) => {
  const currentMonthKey = dayjs(today).format('YYYY-MM');
  const monthlyTotals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') {
      continue;
    }

    const monthKey = dayjs(transaction.date).format('YYYY-MM');
    if (monthKey === currentMonthKey) {
      continue;
    }

    monthlyTotals.set(
      monthKey,
      (monthlyTotals.get(monthKey) ?? 0) + Math.abs(transaction.amountInBaseCurrency)
    );
  }

  if (monthlyTotals.size === 0) {
    return undefined;
  }

  const total = Array.from(monthlyTotals.values()).reduce(
    (sum, amount) => sum + amount,
    0
  );
  return clampMoney(total / monthlyTotals.size);
};

const getSafeStatus = (
  dailyAmount: number,
  remainingAmount: number
): SafeToSpendStatus => {
  if (remainingAmount < 0) {
    return 'danger';
  }

  if (dailyAmount < 10) {
    return 'caution';
  }

  return 'safe';
};

export const calculateSafeToSpend = ({
  transactions,
  fromDate,
  toDate,
  today,
  budgetLimit,
  expectedRecurring,
  historicalMonthlyAverage,
}: CalculateSafeToSpendArgs): SafeToSpendSummary => {
  const periodTransactions = getTransactionsInRange(transactions, fromDate, toDate);
  const spentSoFar = clampMoney(sumExpenses(periodTransactions));
  const incomeSoFar = clampMoney(sumIncome(periodTransactions));
  const baseline =
    historicalMonthlyAverage ?? getHistoricalMonthlyAverage(transactions, today);
  const daysLeft = Math.max(1, utcDayNumber(toDate) - utcDayNumber(today) + 1);

  let availableMonthlyAmount: number | undefined;
  let confidence: InsightConfidence = 'low';
  let explanation = 'Add a monthly budget or more history to unlock safe-to-spend.';

  if (budgetLimit && budgetLimit > 0) {
    availableMonthlyAmount = budgetLimit;
    confidence = 'high';
    explanation =
      'Based on your monthly budget, spending so far, and expected recurring expenses.';
  } else if (incomeSoFar > 0) {
    availableMonthlyAmount = incomeSoFar;
    confidence = 'medium';
    explanation =
      'Based on income recorded this month, spending so far, and expected recurring expenses.';
  } else if (baseline && baseline > 0) {
    availableMonthlyAmount = baseline;
    confidence = 'medium';
    explanation =
      'Based on your recent monthly spending average and expected recurring expenses.';
  }

  if (!availableMonthlyAmount) {
    return {
      dailyAmount: 0,
      remainingAmount: 0,
      periodStart: fromDate,
      periodEnd: toDate,
      daysLeft,
      status: 'unknown',
      confidence: 'low',
      explanation,
      inputs: {
        incomeSoFar,
        spentSoFar,
        expectedRecurring,
        budgetLimit,
        historicalMonthlyAverage: baseline,
      },
    };
  }

  const remainingAmount = clampMoney(
    availableMonthlyAmount - spentSoFar - expectedRecurring
  );
  const dailyAmount = clampMoney(Math.max(0, remainingAmount) / daysLeft);

  return {
    dailyAmount,
    remainingAmount,
    periodStart: fromDate,
    periodEnd: toDate,
    daysLeft,
    status: getSafeStatus(dailyAmount, remainingAmount),
    confidence,
    explanation,
    inputs: {
      incomeSoFar,
      spentSoFar,
      expectedRecurring,
      budgetLimit,
      historicalMonthlyAverage: baseline,
      availableMonthlyAmount,
    },
  };
};

export const calculateMonthForecast = ({
  currentSpend,
  budgetLimit,
  fromDate,
  toDate,
  today,
  dataConfidence,
}: CalculateMonthForecastArgs): MonthForecast => {
  const daysInPeriod = Math.max(1, utcDayNumber(toDate) - utcDayNumber(fromDate) + 1);
  const boundedToday = today.getTime() > toDate.getTime() ? toDate : today;
  const daysElapsed = Math.max(
    1,
    utcDayNumber(boundedToday) - utcDayNumber(fromDate) + 1
  );
  const projectedSpend = clampMoney((currentSpend / daysElapsed) * daysInPeriod);
  const status: SafeToSpendStatus = !budgetLimit
    ? 'unknown'
    : projectedSpend > budgetLimit
      ? 'danger'
      : projectedSpend > budgetLimit * 0.9
        ? 'caution'
        : 'safe';

  return {
    currentSpend: clampMoney(currentSpend),
    projectedSpend,
    budgetLimit,
    daysElapsed,
    daysInPeriod,
    status,
    confidence: dataConfidence,
    explanation: budgetLimit
      ? 'Projected from your current spending pace and monthly budget.'
      : 'Projected from your current spending pace. Add a budget for a clearer status.',
  };
};
