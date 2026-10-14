import type { BudgetCategoryModel } from '../database/budget-category-model';
import type { BudgetModel } from '../database/budget-model';
import type { TransactionModel } from '../database/transaction-model';
import {
  type BudgetHealth,
  calculateBudgetPeriodDates,
  evaluateBudget,
  sumBudgetTransactions,
} from './budgetUtils';
import { filterByDateRange } from './ledger';

export type BudgetAlertData = {
  budget: BudgetModel;
  spent: number;
  percentage: number;
  budgetLimit: number;
  status: BudgetHealth;
};

type BudgetPeriodDates = {
  start: Date;
  end: Date;
};

type CalculateBudgetAlertArgs = {
  budget: BudgetModel;
  categoryIds: string[];
  /** Expense transactions; budgets only count spend. */
  transactions: TransactionModel[];
  periodDates: BudgetPeriodDates;
  previousPeriodDates?: BudgetPeriodDates;
};

const spentDuring = (
  transactions: TransactionModel[],
  { start, end }: BudgetPeriodDates,
  categoryIds: string[]
) =>
  sumBudgetTransactions(
    filterByDateRange(transactions, start, end).filter(
      (transaction) =>
        categoryIds.length === 0 || categoryIds.includes(transaction.categoryId ?? '')
    )
  );

export const calculateBudgetAlert = ({
  budget,
  categoryIds,
  transactions,
  periodDates,
  previousPeriodDates,
}: CalculateBudgetAlertArgs): BudgetAlertData | null => {
  const previousSpent =
    budget.rollover && previousPeriodDates
      ? spentDuring(transactions, previousPeriodDates, categoryIds)
      : undefined;
  const { spent, percentage, budgetLimit, status } = evaluateBudget(
    budget,
    spentDuring(transactions, periodDates, categoryIds),
    previousSpent
  );

  if (percentage < budget.alertThreshold) {
    return null;
  }

  return { budget, spent, percentage, budgetLimit, status };
};

export const calculateBudgetAlerts = ({
  budgets,
  budgetCategories,
  transactions,
}: {
  budgets: BudgetModel[];
  budgetCategories: BudgetCategoryModel[];
  transactions: TransactionModel[];
}): BudgetAlertData[] => {
  const categoryIdsByBudget = new Map<string, string[]>();

  for (const { budgetId, categoryId } of budgetCategories) {
    categoryIdsByBudget.set(budgetId, [
      ...(categoryIdsByBudget.get(budgetId) ?? []),
      categoryId,
    ]);
  }

  return budgets
    .map((budget) =>
      calculateBudgetAlert({
        budget,
        categoryIds: categoryIdsByBudget.get(budget.id) ?? [],
        transactions,
        periodDates: calculateBudgetPeriodDates(budget),
        previousPeriodDates: budget.rollover
          ? calculateBudgetPeriodDates(budget, -1)
          : undefined,
      })
    )
    .filter((alert): alert is BudgetAlertData => alert !== null)
    .sort((left, right) => right.percentage - left.percentage);
};
