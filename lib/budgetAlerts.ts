import type { BudgetCategoryModel } from '../database/budget-category-model';
import type { BudgetModel } from '../database/budget-model';
import type { TransactionModel } from '../database/transaction-model';
import { calculateBudgetPeriodDates } from './budgetUtils';

export type BudgetAlertData = {
  budget: BudgetModel;
  spent: number;
  percentage: number;
  budgetLimit: number;
};

type BudgetPeriodDates = {
  start: Date;
  end: Date;
};

type CalculateBudgetAlertArgs = {
  budget: BudgetModel;
  categoryIds: string[];
  transactions: TransactionModel[];
  periodDates: BudgetPeriodDates;
  previousPeriodDates?: BudgetPeriodDates;
};

const sumSpentTransactions = (transactions: TransactionModel[]) => {
  return transactions.reduce((sum, transaction) => {
    return sum + Math.abs(transaction.amountInBaseCurrency);
  }, 0);
};

const filterTransactionsForPeriod = (
  transactions: TransactionModel[],
  periodDates: BudgetPeriodDates,
  categoryIds: string[]
) => {
  return transactions.filter((transaction) => {
    const txDate = new Date(transaction.date).getTime();
    const inPeriod =
      txDate >= periodDates.start.getTime() && txDate <= periodDates.end.getTime();
    const transactionCategoryId = transaction.category?.id ?? '';
    const matchesCategory =
      categoryIds.length === 0 || categoryIds.includes(transactionCategoryId);

    return inPeriod && matchesCategory;
  });
};

export const calculateBudgetAlert = ({
  budget,
  categoryIds,
  transactions,
  periodDates,
  previousPeriodDates,
}: CalculateBudgetAlertArgs): BudgetAlertData | null => {
  const periodTransactions = filterTransactionsForPeriod(
    transactions,
    periodDates,
    categoryIds
  );
  const spent = sumSpentTransactions(periodTransactions);

  let budgetLimit = budget.amount;
  if (budget.rollover && previousPeriodDates) {
    const previousTransactions = filterTransactionsForPeriod(
      transactions,
      previousPeriodDates,
      categoryIds
    );
    const previousSpent = sumSpentTransactions(previousTransactions);
    budgetLimit += Math.max(0, budget.amount - previousSpent);
  }

  const percentage = budgetLimit > 0 ? (spent / budgetLimit) * 100 : 0;
  if (percentage < budget.alertThreshold) {
    return null;
  }

  return {
    budget,
    spent,
    percentage,
    budgetLimit,
  };
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
  const budgetCategoryMap = new Map<string, string[]>();

  for (const budgetCategory of budgetCategories) {
    const categoryIds = budgetCategoryMap.get(budgetCategory.budgetId) ?? [];
    categoryIds.push(budgetCategory.categoryId);
    budgetCategoryMap.set(budgetCategory.budgetId, categoryIds);
  }

  return budgets
    .map((budget) => {
      const categoryIds = budgetCategoryMap.get(budget.id) ?? [];
      const periodDates = calculateBudgetPeriodDates(budget);
      const previousPeriodDates = budget.rollover
        ? calculateBudgetPeriodDates(budget, -1)
        : undefined;

      return calculateBudgetAlert({
        budget,
        categoryIds,
        transactions,
        periodDates,
        previousPeriodDates,
      });
    })
    .filter((alert): alert is BudgetAlertData => alert !== null)
    .sort((left, right) => right.percentage - left.percentage);
};
