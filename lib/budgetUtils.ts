import { Q } from '@nozbe/watermelondb';
import dayjs from 'dayjs';
import type { BudgetModel, BudgetPeriod } from '../database/budget-model';
import { type LedgerEntry, magnitude } from './ledger';
import { formatCadence, periodWindow } from './recurrence';

export type BudgetHealth = 'ok' | 'warning' | 'exceeded';

export type BudgetEvaluation = {
  spent: number;
  /** The budget amount plus any rollover carried in from the previous period. */
  budgetLimit: number;
  rolloverAmount: number;
  remaining: number;
  percentage: number;
  status: BudgetHealth;
};

type BudgetTerms = Pick<BudgetModel, 'amount' | 'rollover' | 'alertThreshold'>;

/** The budget's current period window, or one shifted by `periodOffset` periods. */
export const calculateBudgetPeriodDates = (
  budget: Pick<BudgetModel, 'period' | 'startDate'>,
  periodOffset = 0
) => periodWindow(budget.startDate, budget.period, { offset: periodOffset });

/** Unspent budget carried into the next period; never negative. */
export const calculateRollover = (
  budget: Pick<BudgetModel, 'amount' | 'rollover'>,
  previousSpent: number
): number => (budget.rollover ? Math.max(0, budget.amount - previousSpent) : 0);

/**
 * Evaluates spend against a budget. Rollover only applies when the previous
 * period's spend is known.
 */
export const evaluateBudget = (
  budget: BudgetTerms,
  spent: number,
  previousSpent?: number
): BudgetEvaluation => {
  const rolloverAmount =
    previousSpent === undefined ? 0 : calculateRollover(budget, previousSpent);
  const budgetLimit = budget.amount + rolloverAmount;
  const percentage = budgetLimit > 0 ? (spent / budgetLimit) * 100 : 0;
  const status: BudgetHealth =
    percentage >= 100
      ? 'exceeded'
      : percentage >= budget.alertThreshold
        ? 'warning'
        : 'ok';

  return {
    spent,
    budgetLimit,
    rolloverAmount,
    remaining: budgetLimit - spent,
    percentage,
    status,
  };
};

/** Query clauses for the expenses that count against a budget window. */
export const buildBudgetTransactionConditions = (
  periodStart: Date,
  periodEnd: Date,
  categoryIds: string[] = []
) => {
  const conditions = [
    Q.where('date', Q.gte(periodStart.getTime())),
    Q.where('date', Q.lte(periodEnd.getTime())),
    Q.where('amountInBaseCurrency', Q.lt(0)),
  ];

  if (categoryIds.length > 0) {
    conditions.push(Q.where('categoryId', Q.oneOf(categoryIds)));
  }

  return conditions;
};

/** Total spend of transactions already scoped to a budget (see conditions above). */
export const sumBudgetTransactions = (
  transactions: Array<Pick<LedgerEntry, 'amountInBaseCurrency'>>
) => transactions.reduce((sum, transaction) => sum + magnitude(transaction), 0);

export const getBudgetProgressColor = (percentage: number, threshold: number): string => {
  if (percentage >= 100) {
    return '$stroberi';
  }
  if (percentage >= threshold) {
    return '$yellow';
  }
  return '$green';
};

export const formatBudgetPeriod = (period: BudgetPeriod): string => formatCadence(period);

export const getBudgetDisplayName = (budget: Pick<BudgetModel, 'name' | 'period'>) =>
  budget.name || `${formatBudgetPeriod(budget.period)} Budget`;

export const getPeriodLabel = (budget: BudgetModel): string => {
  const { start, end } = calculateBudgetPeriodDates(budget);
  const format = budget.period === 'yearly' ? 'MMM D, YYYY' : 'MMM D';

  return `${dayjs(start).format(format)} - ${dayjs(end).format(format)}`;
};
