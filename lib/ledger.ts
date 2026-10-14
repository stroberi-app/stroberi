import dayjs from 'dayjs';

/**
 * Minimal view of a transaction for aggregate math. Amounts are signed and in
 * the base currency: expenses are negative, income is zero or positive.
 */
export type LedgerEntry = {
  amountInBaseCurrency: number;
  date: Date;
};

export type PeriodTotals = {
  income: number;
  expenses: number;
  net: number;
};

export type MonthlyTotals = {
  /** `YYYY-MM` in local time. */
  month: string;
  income: number;
  expenses: number;
};

export const isExpense = (entry: Pick<LedgerEntry, 'amountInBaseCurrency'>) =>
  entry.amountInBaseCurrency < 0;

/** Unsigned magnitude of an entry, e.g. how much an expense cost. */
export const magnitude = (entry: Pick<LedgerEntry, 'amountInBaseCurrency'>) =>
  Math.abs(entry.amountInBaseCurrency);

/** Keeps entries dated within `[fromDate, toDate]`, inclusive. */
export const filterByDateRange = <T extends Pick<LedgerEntry, 'date'>>(
  entries: T[],
  fromDate: Date,
  toDate: Date
): T[] => {
  const from = fromDate.getTime();
  const to = toDate.getTime();

  return entries.filter((entry) => {
    const time = new Date(entry.date).getTime();
    return time >= from && time <= to;
  });
};

const addEntry = (totals: Omit<PeriodTotals, 'net'>, entry: LedgerEntry) => {
  if (isExpense(entry)) {
    totals.expenses += magnitude(entry);
  } else {
    totals.income += entry.amountInBaseCurrency;
  }
};

export const calculatePeriodTotals = (entries: LedgerEntry[]): PeriodTotals => {
  const totals = { income: 0, expenses: 0 };
  for (const entry of entries) {
    addEntry(totals, entry);
  }

  return { ...totals, net: totals.income - totals.expenses };
};

const monthKey = (date: Date) => dayjs(date).format('YYYY-MM');

/** Income and expense totals per calendar month, oldest first. */
export const groupTotalsByMonth = (entries: LedgerEntry[]): MonthlyTotals[] => {
  const months = new Map<string, MonthlyTotals>();

  for (const entry of entries) {
    const month = monthKey(entry.date);
    const totals = months.get(month) ?? { month, income: 0, expenses: 0 };
    addEntry(totals, entry);
    months.set(month, totals);
  }

  return Array.from(months.values()).sort((a, b) => a.month.localeCompare(b.month));
};

/** Sums entry magnitudes per key, e.g. to bucket pre-filtered spend by day. */
export const sumMagnitudesBy = <T extends Pick<LedgerEntry, 'amountInBaseCurrency'>>(
  entries: T[],
  keyOf: (entry: T) => string
): Map<string, number> => {
  const totals = new Map<string, number>();

  for (const entry of entries) {
    const key = keyOf(entry);
    totals.set(key, (totals.get(key) ?? 0) + magnitude(entry));
  }

  return totals;
};

/** Sums expense magnitudes per key; income entries are ignored. */
export const sumExpensesBy = <T extends LedgerEntry>(
  entries: T[],
  keyOf: (entry: T) => string
): Map<string, number> => sumMagnitudesBy(entries.filter(isExpense), keyOf);
