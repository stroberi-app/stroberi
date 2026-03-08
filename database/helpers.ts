import { type Model, Q } from '@nozbe/watermelondb';
import dayjs from 'dayjs';
import type { ConversionStatus } from '../lib/currencyConversion';
import '../lib/date';
import { getCurrencyConversion } from '../hooks/useCurrencyApi';
import { MissingCurrencyRateError } from '../lib/currencyConversion';
import type { BudgetCategoryModel } from './budget-category-model';
import type { BudgetModel, BudgetPeriod } from './budget-model';
import type { CategoryModel } from './category-model';
import { database } from './index';
import type {
  RecurringFrequency,
  RecurringTransactionModel,
} from './recurring-transaction-model';
import type { TransactionModel } from './transaction-model';
import type { TripModel } from './trip-model';

export type CreateTransactionPayload = {
  merchant: string;
  amount: number;
  categoryId: string | null;
  date: Date;
  currencyCode: string;
  note: string;
  baseCurrency: string;
  recurringTransactionId?: string;
  tripId?: string | null;
  allowMissingRate?: boolean;
  sourceRowNumber?: number;
};

type ResolvedConversion = {
  baseCurrencyCode: string;
  amountInBaseCurrency: number;
  exchangeRate: number;
  conversionStatus: ConversionStatus;
};

const resolveConversion = async ({
  amount,
  baseCurrency,
  currencyCode,
  allowMissingRate = false,
}: {
  amount: number;
  baseCurrency: string;
  currencyCode: string;
  allowMissingRate?: boolean;
}): Promise<ResolvedConversion> => {
  if (baseCurrency === currencyCode) {
    return {
      baseCurrencyCode: baseCurrency,
      amountInBaseCurrency: amount,
      exchangeRate: 1,
      conversionStatus: 'ok',
    };
  }

  const conversion = await getCurrencyConversion(baseCurrency, currencyCode);
  if (conversion.rate !== null) {
    return {
      baseCurrencyCode: baseCurrency,
      amountInBaseCurrency: amount * conversion.rate,
      exchangeRate: conversion.rate,
      conversionStatus: conversion.status,
    };
  }

  if (!allowMissingRate) {
    throw new MissingCurrencyRateError(baseCurrency, currencyCode);
  }

  return {
    baseCurrencyCode: baseCurrency,
    amountInBaseCurrency: amount,
    exchangeRate: 1,
    conversionStatus: 'missing_rate',
  };
};

export type CreateTransactionsBatchResult = {
  importedCount: number;
  failed: Array<{ row: number; reason: string }>;
};

export const createTransactionsBatch = async (
  transactions: CreateTransactionPayload[]
): Promise<CreateTransactionsBatchResult> => {
  if (!transactions.length) {
    return { importedCount: 0, failed: [] };
  }

  const failed: Array<{ row: number; reason: string }> = [];

  const uniqueCategoryIds = Array.from(
    new Set(
      transactions
        .map((transaction) => transaction.categoryId)
        .filter((categoryId): categoryId is string => Boolean(categoryId))
    )
  );

  const categoryMap = new Map<string, CategoryModel>();
  if (uniqueCategoryIds.length > 0) {
    const categories = await database
      .get<CategoryModel>('categories')
      .query(Q.where('id', Q.oneOf(uniqueCategoryIds)))
      .fetch();

    for (const category of categories) {
      categoryMap.set(category.id, category);
    }
  }

  const normalizedTransactions: Array<
    Omit<CreateTransactionPayload, 'allowMissingRate'> & {
      resolvedConversion: ResolvedConversion;
      category: CategoryModel | null;
    }
  > = [];

  for (const transaction of transactions) {
    const row = transaction.sourceRowNumber ?? -1;

    const category =
      transaction.categoryId === null
        ? null
        : (categoryMap.get(transaction.categoryId) ?? null);

    if (transaction.categoryId && !category) {
      failed.push({
        row,
        reason: `Category not found: ${transaction.categoryId}`,
      });
      continue;
    }

    try {
      const resolvedConversion = await resolveConversion({
        amount: transaction.amount,
        baseCurrency: transaction.baseCurrency,
        currencyCode: transaction.currencyCode,
        allowMissingRate: transaction.allowMissingRate,
      });

      normalizedTransactions.push({
        ...transaction,
        category,
        resolvedConversion,
      });
    } catch (error) {
      failed.push({
        row,
        reason: error instanceof Error ? error.message : 'Failed currency conversion',
      });
    }
  }

  if (!normalizedTransactions.length) {
    return {
      importedCount: 0,
      failed,
    };
  }

  await database.write(async () => {
    const collection = database.get<TransactionModel>('transactions');
    const preparedRecords: Model[] = [];
    const categoryUsageIncrements = new Map<string, number>();

    for (const transaction of normalizedTransactions) {
      const preparedTransaction = collection.prepareCreate((tx) => {
        tx.merchant = transaction.merchant;
        tx.amount = transaction.amount;
        tx.date = transaction.date;
        tx.currencyCode = transaction.currencyCode;
        tx.note = transaction.note;
        tx.baseCurrencyCode = transaction.resolvedConversion.baseCurrencyCode;
        tx.amountInBaseCurrency = transaction.resolvedConversion.amountInBaseCurrency;
        tx.exchangeRate = transaction.resolvedConversion.exchangeRate;
        tx.conversionStatus = transaction.resolvedConversion.conversionStatus;
        tx.recurringTransactionId = transaction.recurringTransactionId || null;
        tx.tripId = transaction.tripId || null;

        if (transaction.category) {
          tx.category?.set(transaction.category);
        }
      });

      preparedRecords.push(preparedTransaction);

      if (transaction.category) {
        const previousCount = categoryUsageIncrements.get(transaction.category.id) ?? 0;
        categoryUsageIncrements.set(transaction.category.id, previousCount + 1);
      }
    }

    for (const [categoryId, increment] of categoryUsageIncrements.entries()) {
      const category = categoryMap.get(categoryId);
      if (!category) {
        continue;
      }

      preparedRecords.push(
        category.prepareUpdate((record) => {
          record.usageCount = (record.usageCount || 0) + increment;
        })
      );
    }

    await database.batch(...preparedRecords);
  });

  return {
    importedCount: normalizedTransactions.length,
    failed,
  };
};

export const createTransaction = async ({
  merchant,
  amount,
  categoryId,
  date,
  currencyCode,
  note,
  baseCurrency,
  recurringTransactionId,
  tripId,
  allowMissingRate = false,
}: CreateTransactionPayload) => {
  try {
    return await database.write(async () => {
      const collection = database.get<TransactionModel>('transactions');

      let categoryCollection: CategoryModel | null = null;
      if (categoryId) {
        try {
          categoryCollection = await database
            .get<CategoryModel>('categories')
            .find(categoryId);
        } catch {
          throw new Error(`Category not found: ${categoryId}`);
        }
      }

      const resolvedConversion = await resolveConversion({
        amount,
        baseCurrency,
        currencyCode,
        allowMissingRate,
      });

      const preparedRecords = [];

      const transaction = collection.prepareCreate((tx) => {
        tx.merchant = merchant;
        tx.amount = amount;
        tx.date = date;
        tx.currencyCode = currencyCode;
        tx.note = note;
        tx.baseCurrencyCode = resolvedConversion.baseCurrencyCode;
        tx.amountInBaseCurrency = resolvedConversion.amountInBaseCurrency;
        tx.exchangeRate = resolvedConversion.exchangeRate;
        tx.conversionStatus = resolvedConversion.conversionStatus;
        tx.recurringTransactionId = recurringTransactionId || null;
        tx.tripId = tripId || null;
        if (categoryCollection) {
          tx.category?.set(categoryCollection);
        }
      });
      preparedRecords.push(transaction);

      if (categoryCollection) {
        const updatedCategory = categoryCollection.prepareUpdate((category) => {
          category.usageCount = (category.usageCount || 0) + 1;
        });
        preparedRecords.push(updatedCategory);
      }

      await database.batch(...preparedRecords);
      return transaction;
    });
  } catch (error) {
    console.error('Failed to create transaction:', error);
    throw error instanceof Error ? error : new Error('Failed to create transaction');
  }
};

export const updateTransaction = async ({
  id,
  merchant,
  amount,
  categoryId,
  date,
  currencyCode,
  note,
  baseCurrency,
  tripId,
  allowMissingRate = false,
}: {
  id: string;
  merchant: string;
  amount: number;
  categoryId: string | null;
  date: Date;
  currencyCode: string;
  note: string;
  baseCurrency: string;
  tripId?: string | null;
  allowMissingRate?: boolean;
}) => {
  try {
    return await database.write(async () => {
      const collection = database.get<TransactionModel>('transactions');

      let transaction: TransactionModel;
      try {
        transaction = await collection.find(id);
      } catch {
        throw new Error(`Transaction not found: ${id}`);
      }

      const oldCategory = await transaction.category?.fetch();
      const oldCategoryId = oldCategory?.id || null;

      let categoryCollection: CategoryModel | null = null;
      if (categoryId) {
        try {
          categoryCollection = await database
            .get<CategoryModel>('categories')
            .find(categoryId);
        } catch {
          throw new Error(`Category not found: ${categoryId}`);
        }
      }

      const resolvedConversion = await resolveConversion({
        amount,
        baseCurrency,
        currencyCode,
        allowMissingRate,
      });

      const preparedRecords = [];

      const updated = transaction.prepareUpdate((tx) => {
        tx.merchant = merchant;
        tx.amount = amount;
        tx.date = date;
        tx.currencyCode = currencyCode;
        tx.note = note;
        tx.baseCurrencyCode = resolvedConversion.baseCurrencyCode;
        tx.amountInBaseCurrency = resolvedConversion.amountInBaseCurrency;
        tx.exchangeRate = resolvedConversion.exchangeRate;
        tx.conversionStatus = resolvedConversion.conversionStatus;
        tx.tripId = tripId !== undefined ? tripId : tx.tripId;
        if (categoryCollection) {
          tx.category?.set(categoryCollection);
        }
      });
      preparedRecords.push(updated);

      if (oldCategoryId !== categoryId) {
        if (oldCategory) {
          const decrementedCategory = oldCategory.prepareUpdate((category) => {
            category.usageCount = Math.max(0, (category.usageCount || 0) - 1);
          });
          preparedRecords.push(decrementedCategory);
        }

        if (categoryCollection) {
          const incrementedCategory = categoryCollection.prepareUpdate((category) => {
            category.usageCount = (category.usageCount || 0) + 1;
          });
          preparedRecords.push(incrementedCategory);
        }
      }

      await database.batch(...preparedRecords);
      return updated;
    });
  } catch (error) {
    console.error('Failed to update transaction:', error);
    throw error instanceof Error ? error : new Error('Failed to update transaction');
  }
};

export const createCategory = async ({ name, icon }: { name: string; icon: string }) => {
  try {
    return await database.write(async () => {
      const collection = database.get<CategoryModel>('categories');
      return collection.create((category) => {
        category.name = name;
        category.icon = icon;
        category.usageCount = 0;
      });
    });
  } catch (error) {
    console.error('Failed to create category:', error);
    throw error instanceof Error ? error : new Error('Failed to create category');
  }
};

export const updateCategory = async ({
  id,
  name,
  icon,
}: {
  id: string;
  name: string;
  icon: string;
}) => {
  try {
    return await database.write(async () => {
      const collection = database.get<CategoryModel>('categories');

      let category: CategoryModel;
      try {
        category = await collection.find(id);
      } catch {
        throw new Error(`Category not found: ${id}`);
      }

      return await category.update((tx) => {
        tx.name = name;
        tx.icon = icon;
      });
    });
  } catch (error) {
    console.error('Failed to update category:', error);
    throw error instanceof Error ? error : new Error('Failed to update category');
  }
};

export const deleteTransaction = async (transactionId: string) => {
  try {
    return await database.write(async () => {
      const collection = database.get<TransactionModel>('transactions');

      let transaction: TransactionModel;
      try {
        transaction = await collection.find(transactionId);
      } catch {
        throw new Error(`Transaction not found: ${transactionId}`);
      }

      const category = await transaction.category?.fetch();

      const preparedRecords: Model[] = [transaction.prepareMarkAsDeleted()];

      if (category) {
        const decrementedCategory = category.prepareUpdate((c) => {
          c.usageCount = Math.max(0, (c.usageCount || 0) - 1);
        });
        preparedRecords.push(decrementedCategory);
      }

      await database.batch(...preparedRecords);
      return transaction;
    });
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    throw error instanceof Error ? error : new Error('Failed to delete transaction');
  }
};

export const calculateNextDueDate = (
  frequency: RecurringFrequency,
  fromDate: Date = new Date()
): Date => {
  const current = dayjs(fromDate);

  switch (frequency) {
    case 'daily':
      return current.add(1, 'day').toDate();
    case 'weekly':
      return current.add(1, 'week').toDate();
    case 'monthly':
      return current.add(1, 'month').toDate();
    case 'yearly':
      return current.add(1, 'year').toDate();
    default:
      return current.add(1, 'month').toDate();
  }
};

export const calculateNextDueDateFromStart = (
  frequency: RecurringFrequency,
  startDate: Date
): Date => {
  let current = dayjs(startDate);
  const today = dayjs().startOf('day');

  while (current.isBefore(today)) {
    switch (frequency) {
      case 'daily':
        current = current.add(1, 'day');
        break;
      case 'weekly':
        current = current.add(1, 'week');
        break;
      case 'monthly':
        current = current.add(1, 'month');
        break;
      case 'yearly':
        current = current.add(1, 'year');
        break;
    }
  }

  return current.toDate();
};

export type CreateRecurringTransactionPayload = {
  merchant: string;
  amount: number;
  categoryId: string | null;
  currencyCode: string;
  note: string;
  frequency: RecurringFrequency;
  startDate: Date;
  endDate?: Date;
};

export const createRecurringTransaction = async ({
  merchant,
  amount,
  categoryId,
  currencyCode,
  note,
  frequency,
  startDate,
  endDate,
}: CreateRecurringTransactionPayload) => {
  try {
    return await database.write(async () => {
      const collection = database.get<RecurringTransactionModel>(
        'recurring_transactions'
      );

      let categoryCollection: CategoryModel | null = null;
      if (categoryId) {
        try {
          categoryCollection = await database
            .get<CategoryModel>('categories')
            .find(categoryId);
        } catch {
          throw new Error(`Category not found: ${categoryId}`);
        }
      }

      const nextDueDate = calculateNextDueDateFromStart(frequency, startDate);

      return collection.create((recurring) => {
        recurring.merchant = merchant;
        recurring.amount = amount;
        recurring.currencyCode = currencyCode;
        recurring.note = note;
        recurring.frequency = frequency;
        recurring.startDate = startDate;
        recurring.endDate = endDate || null;
        recurring.nextDueDate = nextDueDate;
        recurring.lastCreatedDate = null;
        recurring.isActive = true;
        if (categoryCollection) {
          recurring.category?.set(categoryCollection);
        }
      });
    });
  } catch (error) {
    console.error('Failed to create recurring transaction:', error);
    throw error instanceof Error
      ? error
      : new Error('Failed to create recurring transaction');
  }
};

export const updateRecurringTransaction = async ({
  id,
  merchant,
  amount,
  categoryId,
  currencyCode,
  note,
  frequency,
  startDate,
  endDate,
}: {
  id: string;
} & CreateRecurringTransactionPayload) => {
  try {
    return await database.write(async () => {
      const collection = database.get<RecurringTransactionModel>(
        'recurring_transactions'
      );

      let recurring: RecurringTransactionModel;
      try {
        recurring = await collection.find(id);
      } catch {
        throw new Error(`Recurring transaction not found: ${id}`);
      }

      let categoryCollection: CategoryModel | null = null;
      if (categoryId) {
        try {
          categoryCollection = await database
            .get<CategoryModel>('categories')
            .find(categoryId);
        } catch {
          throw new Error(`Category not found: ${categoryId}`);
        }
      }

      const nextDueDate = calculateNextDueDateFromStart(frequency, startDate);

      return recurring.update((rec) => {
        rec.merchant = merchant;
        rec.amount = amount;
        rec.currencyCode = currencyCode;
        rec.note = note;
        rec.frequency = frequency;
        rec.startDate = startDate;
        rec.endDate = endDate || null;
        rec.nextDueDate = nextDueDate;
        if (categoryCollection) {
          rec.category?.set(categoryCollection);
        }
      });
    });
  } catch (error) {
    console.error('Failed to update recurring transaction:', error);
    throw error instanceof Error
      ? error
      : new Error('Failed to update recurring transaction');
  }
};

export const deleteRecurringTransaction = async (recurringId: string) => {
  try {
    return await database.write(async () => {
      const collection = database.get<RecurringTransactionModel>(
        'recurring_transactions'
      );

      let recurring: RecurringTransactionModel;
      try {
        recurring = await collection.find(recurringId);
      } catch {
        throw new Error(`Recurring transaction not found: ${recurringId}`);
      }

      await recurring.markAsDeleted();
      return recurring;
    });
  } catch (error) {
    console.error('Failed to delete recurring transaction:', error);
    throw error instanceof Error
      ? error
      : new Error('Failed to delete recurring transaction');
  }
};

export const toggleRecurringTransaction = async (recurringId: string) => {
  try {
    return await database.write(async () => {
      const collection = database.get<RecurringTransactionModel>(
        'recurring_transactions'
      );

      let recurring: RecurringTransactionModel;
      try {
        recurring = await collection.find(recurringId);
      } catch {
        throw new Error(`Recurring transaction not found: ${recurringId}`);
      }

      return recurring.toggle();
    });
  } catch (error) {
    console.error('Failed to toggle recurring transaction:', error);
    throw error instanceof Error
      ? error
      : new Error('Failed to toggle recurring transaction');
  }
};

export const checkAndCreateDueTransactions = async (baseCurrency: string) => {
  try {
    const recurringCollection = database.get<RecurringTransactionModel>(
      'recurring_transactions'
    );

    const activeRecurring = await recurringCollection
      .query(Q.where('isActive', true))
      .fetch();

    const now = dayjs();
    const dueTransactions = activeRecurring.filter((recurring) => {
      if (recurring.endDate && now.isAfter(dayjs(recurring.endDate))) {
        return false;
      }
      return now.isSameOrAfter(dayjs(recurring.nextDueDate), 'day');
    });

    if (dueTransactions.length === 0) {
      return [];
    }

    const createdTransactions: TransactionModel[] = [];

    for (const recurring of dueTransactions) {
      try {
        const transactionDate = dayjs()
          .hour(dayjs(recurring.startDate).hour())
          .minute(dayjs(recurring.startDate).minute())
          .second(0)
          .millisecond(0)
          .toDate();

        const transaction = await createTransaction({
          merchant: recurring.merchant,
          amount: recurring.amount,
          categoryId: recurring.category?.id ?? null,
          date: transactionDate,
          currencyCode: recurring.currencyCode,
          note: recurring.note,
          baseCurrency,
          recurringTransactionId: recurring.id,
        });

        const previousDue = recurring.nextDueDate ?? recurring.startDate;
        const nextDue = calculateNextDueDate(recurring.frequency, previousDue);

        await database.write(async () => {
          await recurring.update((rec) => {
            rec.nextDueDate = nextDue;
            rec.lastCreatedDate = new Date();
          });
        });

        createdTransactions.push(transaction);
      } catch (error) {
        console.error(
          `Failed to create transaction from recurring ${recurring.id}:`,
          error
        );
      }
    }

    return createdTransactions;
  } catch (error) {
    console.error('Failed to check and create due transactions:', error);
    throw error instanceof Error
      ? error
      : new Error('Failed to check and create due transactions');
  }
};

export type CreateBudgetPayload = {
  name: string;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  rollover: boolean;
  alertThreshold: number;
  categoryIds?: string[];
};

export const createBudget = async ({
  name,
  amount,
  period,
  startDate,
  rollover,
  alertThreshold,
  categoryIds = [],
}: CreateBudgetPayload) => {
  try {
    return await database.write(async () => {
      const budgetCollection = database.get<BudgetModel>('budgets');
      const budgetCategoryCollection =
        database.get<BudgetCategoryModel>('budget_categories');

      const preparedRecords: Model[] = [];

      const budget = budgetCollection.prepareCreate((b) => {
        b.name = name;
        b.amount = amount;
        b.period = period;
        b.startDate = startDate;
        b.rollover = rollover;
        b.isActive = true;
        b.alertThreshold = alertThreshold;
      });
      preparedRecords.push(budget);

      for (const categoryId of categoryIds) {
        const budgetCategory = budgetCategoryCollection.prepareCreate((bc) => {
          bc._setRaw('budget_id', budget.id);
          bc._setRaw('category_id', categoryId);
        });
        preparedRecords.push(budgetCategory);
      }

      await database.batch(...preparedRecords);
      return budget;
    });
  } catch (error) {
    console.error('Failed to create budget:', error);
    throw error instanceof Error ? error : new Error('Failed to create budget');
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
} & CreateBudgetPayload) => {
  try {
    return await database.write(async () => {
      const budgetCollection = database.get<BudgetModel>('budgets');
      const budgetCategoryCollection =
        database.get<BudgetCategoryModel>('budget_categories');

      let budget: BudgetModel;
      try {
        budget = await budgetCollection.find(id);
      } catch {
        throw new Error(`Budget not found: ${id}`);
      }

      const existingBudgetCategories = await budget.budgetCategories.fetch();

      const preparedRecords: Model[] = [];

      const updatedBudget = budget.prepareUpdate((b) => {
        b.name = name;
        b.amount = amount;
        b.period = period;
        b.startDate = startDate;
        b.rollover = rollover;
        b.alertThreshold = alertThreshold;
      });
      preparedRecords.push(updatedBudget);

      for (const bc of existingBudgetCategories) {
        preparedRecords.push(bc.prepareMarkAsDeleted());
      }

      for (const categoryId of categoryIds) {
        const budgetCategory = budgetCategoryCollection.prepareCreate((bc) => {
          bc._setRaw('budget_id', budget.id);
          bc._setRaw('category_id', categoryId);
        });
        preparedRecords.push(budgetCategory);
      }

      await database.batch(...preparedRecords);
      return updatedBudget;
    });
  } catch (error) {
    console.error('Failed to update budget:', error);
    throw error instanceof Error ? error : new Error('Failed to update budget');
  }
};

export const deleteBudget = async (budgetId: string) => {
  try {
    return await database.write(async () => {
      const budgetCollection = database.get<BudgetModel>('budgets');

      let budget: BudgetModel;
      try {
        budget = await budgetCollection.find(budgetId);
      } catch {
        throw new Error(`Budget not found: ${budgetId}`);
      }

      const budgetCategories = await budget.budgetCategories.fetch();

      const preparedRecords: Model[] = [budget.prepareMarkAsDeleted()];

      for (const bc of budgetCategories) {
        preparedRecords.push(bc.prepareMarkAsDeleted());
      }

      await database.batch(...preparedRecords);
      return budget;
    });
  } catch (error) {
    console.error('Failed to delete budget:', error);
    throw error instanceof Error ? error : new Error('Failed to delete budget');
  }
};

export const toggleBudget = async (budgetId: string) => {
  try {
    return await database.write(async () => {
      const collection = database.get<BudgetModel>('budgets');

      let budget: BudgetModel;
      try {
        budget = await collection.find(budgetId);
      } catch {
        throw new Error(`Budget not found: ${budgetId}`);
      }

      return budget.toggle();
    });
  } catch (error) {
    console.error('Failed to toggle budget:', error);
    throw error instanceof Error ? error : new Error('Failed to toggle budget');
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
    const categoryIds = budgetCategories.map((bc) => bc.categoryId);

    const baseConditions = [
      Q.where('date', Q.gte(periodStart.getTime())),
      Q.where('date', Q.lte(periodEnd.getTime())),
      Q.where('amountInBaseCurrency', Q.lt(0)),
    ];

    if (categoryIds.length > 0) {
      baseConditions.push(Q.where('categoryId', Q.oneOf(categoryIds)));
    }

    const transactions = await database
      .get<TransactionModel>('transactions')
      .query(...baseConditions)
      .fetch();

    const spent = transactions.reduce(
      (sum, tx) => sum + Math.abs(tx.amountInBaseCurrency),
      0
    );
    let budgetLimit = budget.amount;

    if (budget.rollover) {
      const periodDurationMs = periodEnd.getTime() - periodStart.getTime() + 1;
      const previousPeriodEnd = new Date(periodStart.getTime() - 1);
      const previousPeriodStart = new Date(
        previousPeriodEnd.getTime() - periodDurationMs + 1
      );

      const previousPeriodConditions = [
        Q.where('date', Q.gte(previousPeriodStart.getTime())),
        Q.where('date', Q.lte(previousPeriodEnd.getTime())),
        Q.where('amountInBaseCurrency', Q.lt(0)),
      ];

      if (categoryIds.length > 0) {
        previousPeriodConditions.push(Q.where('categoryId', Q.oneOf(categoryIds)));
      }

      const previousTransactions = await database
        .get<TransactionModel>('transactions')
        .query(...previousPeriodConditions)
        .fetch();

      const previousSpent = previousTransactions.reduce(
        (sum, tx) => sum + Math.abs(tx.amountInBaseCurrency),
        0
      );
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
    console.error('Failed to get budget status:', error);
    throw error instanceof Error ? error : new Error('Failed to get budget status');
  }
};

export const getAllActiveBudgets = async () => {
  try {
    return await database
      .get<BudgetModel>('budgets')
      .query(Q.where('isActive', true))
      .fetch();
  } catch (error) {
    console.error('Failed to get active budgets:', error);
    throw error instanceof Error ? error : new Error('Failed to get active budgets');
  }
};

// ============================================
// TRIP FUNCTIONS
// ============================================

export type CreateTripPayload = {
  name: string;
  icon: string;
  currencyCode?: string | null;
  startDate: Date;
  endDate?: Date | null;
};

export const createTrip = async ({
  name,
  icon,
  currencyCode,
  startDate,
  endDate,
}: CreateTripPayload) => {
  try {
    return await database.write(async () => {
      const collection = database.get<TripModel>('trips');
      return collection.create((trip) => {
        trip.name = name;
        trip.icon = icon;
        trip.currencyCode = currencyCode || null;
        trip.startDate = startDate;
        trip.endDate = endDate || null;
        trip.isArchived = false;
      });
    });
  } catch (error) {
    console.error('Failed to create trip:', error);
    throw error instanceof Error ? error : new Error('Failed to create trip');
  }
};

export const updateTrip = async ({
  id,
  name,
  icon,
  currencyCode,
  startDate,
  endDate,
}: {
  id: string;
} & CreateTripPayload) => {
  try {
    return await database.write(async () => {
      const collection = database.get<TripModel>('trips');

      let trip: TripModel;
      try {
        trip = await collection.find(id);
      } catch {
        throw new Error(`Trip not found: ${id}`);
      }

      return trip.update((t) => {
        t.name = name;
        t.icon = icon;
        t.currencyCode = currencyCode || null;
        t.startDate = startDate;
        t.endDate = endDate || null;
      });
    });
  } catch (error) {
    console.error('Failed to update trip:', error);
    throw error instanceof Error ? error : new Error('Failed to update trip');
  }
};

export const deleteTrip = async (tripId: string) => {
  try {
    return await database.write(async () => {
      const collection = database.get<TripModel>('trips');

      let trip: TripModel;
      try {
        trip = await collection.find(tripId);
      } catch {
        throw new Error(`Trip not found: ${tripId}`);
      }

      await trip.markAsDeleted();
      return trip;
    });
  } catch (error) {
    console.error('Failed to delete trip:', error);
    throw error instanceof Error ? error : new Error('Failed to delete trip');
  }
};

export const toggleTripArchive = async (tripId: string) => {
  try {
    return await database.write(async () => {
      const collection = database.get<TripModel>('trips');

      let trip: TripModel;
      try {
        trip = await collection.find(tripId);
      } catch {
        throw new Error(`Trip not found: ${tripId}`);
      }

      return trip.toggleArchive();
    });
  } catch (error) {
    console.error('Failed to toggle trip archive:', error);
    throw error instanceof Error ? error : new Error('Failed to toggle trip archive');
  }
};

export const getTripSpending = async (tripId: string) => {
  try {
    const trip = await database.get<TripModel>('trips').find(tripId);
    const useTripCurrency = Boolean(trip.currencyCode);

    const aggregateSql = useTripCurrency
      ? `select 
            count(*) as transactionCount,
            coalesce(sum(case when amount < 0 and currencyCode = ? then abs(amount) else 0 end), 0) as totalSpent,
            coalesce(sum(case when amount > 0 and currencyCode = ? then amount else 0 end), 0) as totalIncome
         from transactions
         where tripId = ? and _status != 'deleted'`
      : `select 
            count(*) as transactionCount,
            coalesce(sum(case when amountInBaseCurrency < 0 then abs(amountInBaseCurrency) else 0 end), 0) as totalSpent,
            coalesce(sum(case when amountInBaseCurrency > 0 then amountInBaseCurrency else 0 end), 0) as totalIncome
         from transactions
         where tripId = ? and _status != 'deleted'`;

    const params = useTripCurrency
      ? [trip.currencyCode, trip.currencyCode, tripId]
      : [tripId];

    const [rawTotals] = (await database
      .get<TransactionModel>('transactions')
      .query(Q.unsafeSqlQuery(aggregateSql, params))
      .unsafeFetchRaw()) as Array<{
      transactionCount: number | string | null;
      totalSpent: number | string | null;
      totalIncome: number | string | null;
    }>;

    const totalSpent = Number(rawTotals?.totalSpent ?? 0);
    const totalIncome = Number(rawTotals?.totalIncome ?? 0);
    const transactionCount = Number(rawTotals?.transactionCount ?? 0);

    return {
      trip,
      totalSpent,
      totalIncome,
      netAmount: totalIncome - totalSpent,
      transactionCount,
      currencyCode: trip.currencyCode, // Return the currency used for display
    };
  } catch (error) {
    console.error('Failed to get trip spending:', error);
    throw error instanceof Error ? error : new Error('Failed to get trip spending');
  }
};

export const getActiveTrips = async () => {
  try {
    return await database
      .get<TripModel>('trips')
      .query(Q.where('isArchived', false))
      .fetch();
  } catch (error) {
    console.error('Failed to get active trips:', error);
    throw error instanceof Error ? error : new Error('Failed to get active trips');
  }
};

export const getMostRecentActiveTrip = async (): Promise<TripModel | null> => {
  try {
    const now = Date.now() + 60000;
    const [trip] = await database
      .get<TripModel>('trips')
      .query(
        Q.where('isArchived', false),
        Q.or(Q.where('endDate', Q.eq(null)), Q.where('endDate', Q.gt(now))),
        Q.sortBy('startDate', Q.desc),
        Q.take(1)
      )
      .fetch();

    return trip ?? null;
  } catch (error) {
    console.error('Failed to get most recent active trip:', error);
    throw error instanceof Error
      ? error
      : new Error('Failed to get most recent active trip');
  }
};
