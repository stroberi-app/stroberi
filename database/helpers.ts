import { type Model, Q } from '@nozbe/watermelondb';
import dayjs from 'dayjs';
import '../lib/date';
import { getCurrencyConversion } from '../hooks/useCurrencyApi';
import type { BudgetModel, BudgetPeriod } from './budget-model';
import type { CategoryModel } from './category-model';
import { database } from './index';
import type {
  RecurringFrequency,
  RecurringTransactionModel,
} from './recurring-transaction-model';
import type { TransactionModel } from './transaction-model';

export type CreateTransactionPayload = {
  merchant: string;
  amount: number;
  categoryId: string | null;
  date: Date;
  currencyCode: string;
  note: string;
  baseCurrency: string;
  recurringTransactionId?: string;
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

      let baseCurrencyCode = baseCurrency;
      let amountInBaseCurrency = amount;
      let exchangeRate = 1;

      if (baseCurrency !== currencyCode) {
        try {
          const rate = await getCurrencyConversion(baseCurrency, currencyCode);
          if (rate) {
            baseCurrencyCode = baseCurrency;
            amountInBaseCurrency = amount * rate;
            exchangeRate = rate;
          }
        } catch (error) {
          console.error('Currency conversion failed:', error);
        }
      }

      const preparedRecords = [];

      const transaction = collection.prepareCreate((tx) => {
        tx.merchant = merchant;
        tx.amount = amount;
        tx.date = date;
        tx.currencyCode = currencyCode;
        tx.note = note;
        tx.baseCurrencyCode = baseCurrencyCode;
        tx.amountInBaseCurrency = amountInBaseCurrency;
        tx.exchangeRate = exchangeRate;
        tx.recurringTransactionId = recurringTransactionId || null;
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
}: {
  id: string;
  merchant: string;
  amount: number;
  categoryId: string | null;
  date: Date;
  currencyCode: string;
  note: string;
  baseCurrency: string;
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

      let baseCurrencyCode = baseCurrency;
      let amountInBaseCurrency = amount;
      let exchangeRate = 1;

      if (baseCurrency !== currencyCode) {
        try {
          const rate = await getCurrencyConversion(baseCurrency, currencyCode);
          if (rate) {
            baseCurrencyCode = baseCurrency;
            amountInBaseCurrency = amount * rate;
            exchangeRate = rate;
          }
        } catch (error) {
          console.error('Currency conversion failed:', error);
        }
      }

      const preparedRecords = [];

      const updated = transaction.prepareUpdate((tx) => {
        tx.merchant = merchant;
        tx.amount = amount;
        tx.date = date;
        tx.currencyCode = currencyCode;
        tx.note = note;
        tx.baseCurrencyCode = baseCurrencyCode;
        tx.amountInBaseCurrency = amountInBaseCurrency;
        tx.exchangeRate = exchangeRate;
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
};

export const createBudget = async ({
  name,
  amount,
  period,
  startDate,
  rollover,
  alertThreshold,
}: CreateBudgetPayload) => {
  try {
    return await database.write(async () => {
      const collection = database.get<BudgetModel>('budgets');
      return collection.create((budget) => {
        budget.name = name;
        budget.amount = amount;
        budget.period = period;
        budget.startDate = startDate;
        budget.rollover = rollover;
        budget.isActive = true;
        budget.alertThreshold = alertThreshold;
      });
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
}: {
  id: string;
} & CreateBudgetPayload) => {
  try {
    return await database.write(async () => {
      const collection = database.get<BudgetModel>('budgets');

      let budget: BudgetModel;
      try {
        budget = await collection.find(id);
      } catch {
        throw new Error(`Budget not found: ${id}`);
      }

      return budget.updateBudget({
        name,
        amount,
        period,
        startDate,
        rollover,
        alertThreshold,
      });
    });
  } catch (error) {
    console.error('Failed to update budget:', error);
    throw error instanceof Error ? error : new Error('Failed to update budget');
  }
};

export const deleteBudget = async (budgetId: string) => {
  try {
    return await database.write(async () => {
      const collection = database.get<BudgetModel>('budgets');

      let budget: BudgetModel;
      try {
        budget = await collection.find(budgetId);
      } catch {
        throw new Error(`Budget not found: ${budgetId}`);
      }

      await budget.markAsDeleted();
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

    const transactions = await database
      .get<TransactionModel>('transactions')
      .query(
        Q.where('date', Q.gte(periodStart.getTime())),
        Q.where('date', Q.lte(periodEnd.getTime())),
        Q.where('amountInBaseCurrency', Q.lt(0))
      )
      .fetch();

    const spent = transactions.reduce(
      (sum, tx) => sum + Math.abs(tx.amountInBaseCurrency),
      0
    );
    const remaining = budget.amount - spent;
    const percentage = (spent / budget.amount) * 100;

    return {
      budget,
      spent,
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
