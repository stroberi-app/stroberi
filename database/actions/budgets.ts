import { type Model, Q } from '@nozbe/watermelondb';
import type { BudgetCategoryModel } from '../budget-category-model';
import type { BudgetModel, BudgetPeriod } from '../budget-model';
import { database } from '../index';
import type { TransactionModel } from '../transaction-model';
import { findRecordOrThrow, logAndRethrow } from './shared';

export type CreateBudgetPayload = {
  name: string;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  rollover: boolean;
  alertThreshold: number;
  categoryIds?: string[];
};

const getBudgetTransactionConditions = (
  periodStart: Date,
  periodEnd: Date,
  categoryIds: string[]
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

const sumSpentTransactions = (transactions: TransactionModel[]) => {
  return transactions.reduce((sum, transaction) => {
    return sum + Math.abs(transaction.amountInBaseCurrency);
  }, 0);
};

export const createBudget = async ({
  name,
  amount,
  period,
  startDate,
  rollover,
  alertThreshold,
  categoryIds = [],
}: CreateBudgetPayload): Promise<BudgetModel> => {
  try {
    return await database.write(async () => {
      const budgetCollection = database.get<BudgetModel>('budgets');
      const budgetCategoryCollection =
        database.get<BudgetCategoryModel>('budget_categories');
      const preparedRecords: Model[] = [];

      const budget = budgetCollection.prepareCreate((record) => {
        record.name = name;
        record.amount = amount;
        record.period = period;
        record.startDate = startDate;
        record.rollover = rollover;
        record.isActive = true;
        record.alertThreshold = alertThreshold;
      });

      preparedRecords.push(budget);

      for (const categoryId of categoryIds) {
        preparedRecords.push(
          budgetCategoryCollection.prepareCreate((record) => {
            record._setRaw('budget_id', budget.id);
            record._setRaw('category_id', categoryId);
          })
        );
      }

      await database.batch(...preparedRecords);
      return budget;
    });
  } catch (error) {
    return logAndRethrow('Failed to create budget:', error, 'Failed to create budget');
  }
};

export const updateBudget = async ({
  id,
  name,
  amount,
  period,
  startDate,
  rollover,
  alertThreshold,
  categoryIds = [],
}: {
  id: string;
} & CreateBudgetPayload): Promise<BudgetModel> => {
  try {
    return await database.write(async () => {
      const budgetCollection = database.get<BudgetModel>('budgets');
      const budgetCategoryCollection =
        database.get<BudgetCategoryModel>('budget_categories');
      const budget = await findRecordOrThrow(budgetCollection, id, 'Budget');
      const existingBudgetCategories = await budget.budgetCategories.fetch();
      const preparedRecords: Model[] = [];

      preparedRecords.push(
        budget.prepareUpdate((record) => {
          record.name = name;
          record.amount = amount;
          record.period = period;
          record.startDate = startDate;
          record.rollover = rollover;
          record.alertThreshold = alertThreshold;
        })
      );

      for (const budgetCategory of existingBudgetCategories) {
        preparedRecords.push(budgetCategory.prepareMarkAsDeleted());
      }

      for (const categoryId of categoryIds) {
        preparedRecords.push(
          budgetCategoryCollection.prepareCreate((record) => {
            record._setRaw('budget_id', budget.id);
            record._setRaw('category_id', categoryId);
          })
        );
      }

      await database.batch(...preparedRecords);
      return budget;
    });
  } catch (error) {
    return logAndRethrow('Failed to update budget:', error, 'Failed to update budget');
  }
};

export const deleteBudget = async (budgetId: string): Promise<BudgetModel> => {
  try {
    return await database.write(async () => {
      const collection = database.get<BudgetModel>('budgets');
      const budget = await findRecordOrThrow(collection, budgetId, 'Budget');
      const budgetCategories = await budget.budgetCategories.fetch();
      const preparedRecords: Model[] = [budget.prepareMarkAsDeleted()];

      for (const budgetCategory of budgetCategories) {
        preparedRecords.push(budgetCategory.prepareMarkAsDeleted());
      }

      await database.batch(...preparedRecords);
      return budget;
    });
  } catch (error) {
    return logAndRethrow('Failed to delete budget:', error, 'Failed to delete budget');
  }
};

export const toggleBudget = async (budgetId: string): Promise<BudgetModel> => {
  try {
    return await database.write(async () => {
      const collection = database.get<BudgetModel>('budgets');
      const budget = await findRecordOrThrow(collection, budgetId, 'Budget');
      return budget.toggle();
    });
  } catch (error) {
    return logAndRethrow('Failed to toggle budget:', error, 'Failed to toggle budget');
  }
};

export const getBudgetStatus = async (
  budgetId: string,
  periodStart: Date,
  periodEnd: Date
) => {
  try {
    const budget = await database.get<BudgetModel>('budgets').find(budgetId);
    const budgetCategories = await budget.budgetCategories.fetch();
    const categoryIds = budgetCategories.map(
      (budgetCategory) => budgetCategory.categoryId
    );
    const transactions = await database
      .get<TransactionModel>('transactions')
      .query(...getBudgetTransactionConditions(periodStart, periodEnd, categoryIds))
      .fetch();
    const spent = sumSpentTransactions(transactions);
    let budgetLimit = budget.amount;

    if (budget.rollover) {
      const periodDurationMs = periodEnd.getTime() - periodStart.getTime() + 1;
      const previousPeriodEnd = new Date(periodStart.getTime() - 1);
      const previousPeriodStart = new Date(
        previousPeriodEnd.getTime() - periodDurationMs + 1
      );
      const previousTransactions = await database
        .get<TransactionModel>('transactions')
        .query(
          ...getBudgetTransactionConditions(
            previousPeriodStart,
            previousPeriodEnd,
            categoryIds
          )
        )
        .fetch();
      const previousSpent = sumSpentTransactions(previousTransactions);
      budgetLimit += Math.max(0, budget.amount - previousSpent);
    }

    const remaining = budgetLimit - spent;
    const percentage = budgetLimit > 0 ? (spent / budgetLimit) * 100 : 0;

    return {
      budget,
      spent,
      budgetLimit,
      remaining,
      percentage,
      status:
        percentage >= 100
          ? 'exceeded'
          : percentage >= budget.alertThreshold
            ? 'warning'
            : 'ok',
    };
  } catch (error) {
    return logAndRethrow(
      'Failed to get budget status:',
      error,
      'Failed to get budget status'
    );
  }
};

export const getAllActiveBudgets = async (): Promise<BudgetModel[]> => {
  try {
    return await database
      .get<BudgetModel>('budgets')
      .query(Q.where('isActive', true))
      .fetch();
  } catch (error) {
    return logAndRethrow(
      'Failed to get active budgets:',
      error,
      'Failed to get active budgets'
    );
  }
};
