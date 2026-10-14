import dayjs from 'dayjs';
import { filterByDateRange, isExpense, type LedgerEntry, magnitude } from './ledger';

export interface SpendingForecast {
  currentSpend: number;
  projectedSpend: number;
  daysRemaining: number;
  dailyAverage: number;
  status: 'on-track' | 'warning' | 'critical';
  confidence: 'high' | 'medium' | 'low'; // Based on how far into the month we are
}

export interface RecurringTransaction {
  merchant: string;
  amount: number;
  frequency: 'monthly';
  predictedDate: Date;
  confidence: number;
  lastDate: Date;
}

type MerchantEntry = LedgerEntry & { merchant: string };

/**
 * Projects end-of-month spending by extrapolating the month-to-date daily
 * average, and grades it against an optional monthly budget.
 */
export function calculateProjectedSpending(
  transactions: LedgerEntry[],
  budgetLimit?: number,
  today = dayjs()
): SpendingForecast {
  const startOfMonth = today.startOf('month');
  const endOfMonth = today.endOf('month');
  const totalDays = endOfMonth.diff(startOfMonth, 'day') + 1;
  const daysPassed = Math.max(1, today.diff(startOfMonth, 'day') + 1);
  const daysRemaining = totalDays - daysPassed;

  const currentSpend = filterByDateRange(
    transactions,
    startOfMonth.toDate(),
    endOfMonth.toDate()
  )
    .filter(isExpense)
    .reduce((sum, entry) => sum + magnitude(entry), 0);

  const dailyAverage = currentSpend / daysPassed;
  const projectedSpend = currentSpend + dailyAverage * daysRemaining;

  let status: SpendingForecast['status'] = 'on-track';
  if (budgetLimit) {
    if (projectedSpend > budgetLimit) status = 'critical';
    else if (projectedSpend > budgetLimit * 0.9) status = 'warning';
  }

  let confidence: SpendingForecast['confidence'] = 'low';
  if (daysPassed > 20) confidence = 'high';
  else if (daysPassed > 10) confidence = 'medium';

  return {
    currentSpend,
    projectedSpend,
    daysRemaining,
    dailyAverage,
    status,
    confidence,
  };
}

/**
 * Detects likely monthly bills: a merchant whose two most recent expenses in
 * the last three months are within 5% in amount and roughly 30 days apart.
 */
export function detectRecurringTransactions(
  transactions: MerchantEntry[],
  today = dayjs()
): RecurringTransaction[] {
  const threeMonthsAgo = today.subtract(3, 'month').toDate();
  const byMerchant = new Map<string, MerchantEntry[]>();

  for (const entry of transactions) {
    if (isExpense(entry) && new Date(entry.date) >= threeMonthsAgo) {
      const merchant = entry.merchant || 'Uncategorized';
      byMerchant.set(merchant, [...(byMerchant.get(merchant) ?? []), entry]);
    }
  }

  const recurring: RecurringTransaction[] = [];

  for (const [merchant, entries] of byMerchant) {
    if (entries.length < 2) continue;

    const [latest, previous] = entries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const latestAmount = magnitude(latest);
    const amountMatches =
      Math.abs(latestAmount - magnitude(previous)) / latestAmount < 0.05;
    const daysApart = dayjs(latest.date).diff(dayjs(previous.date), 'day');
    const isMonthly = Math.abs(daysApart - 30) < 5;

    if (amountMatches && isMonthly) {
      recurring.push({
        merchant,
        amount: latestAmount,
        frequency: 'monthly',
        predictedDate: dayjs(latest.date).add(1, 'month').toDate(),
        confidence: 0.8,
        lastDate: latest.date,
      });
    }
  }

  return recurring;
}
