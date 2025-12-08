import { type Model, Q } from '@nozbe/watermelondb';
import dayjs from 'dayjs';
import '../lib/date';
import { STORAGE_KEYS } from '../lib/storageKeys';
import { getCurrencyConversion } from '../hooks/useCurrencyApi';
import type { BudgetCategoryModel } from './budget-category-model';
import type { BudgetModel, BudgetPeriod } from './budget-model';
import type { CategoryModel } from './category-model';
import { database } from './index';
import type { FxSnapshotModel } from './fx-snapshot-model';
import type {
  RecurringFrequency,
  RecurringTransactionModel,
} from './recurring-transaction-model';
import type { TransactionModel } from './transaction-model';
import type { TripBudgetModel, TripBudgetType } from './trip-budget-model';
import type { TripBudgetCategoryModel } from './trip-budget-category-model';
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

      let resolvedTrip: TripModel | null = null;
      let tripCurrencyCode: string | null = null;
      let amountInTripCurrency: number | null = null;
      let tripExchangeRate: number | null = null;

      if (tripId) {
        try {
          resolvedTrip = await database.get<TripModel>('trips').find(tripId);
          tripCurrencyCode = resolvedTrip.homeCurrencyCode;
          if (tripCurrencyCode === currencyCode) {
            tripExchangeRate = 1;
            amountInTripCurrency = amount;
          } else if (tripCurrencyCode === baseCurrencyCode) {
            tripExchangeRate = exchangeRate;
            amountInTripCurrency = amountInBaseCurrency;
          } else {
            const rate = await getCurrencyConversion(tripCurrencyCode, currencyCode);
            if (rate) {
              tripExchangeRate = rate;
              amountInTripCurrency = amount * rate;
            }
          }
        } catch {
          throw new Error(`Trip not found: ${tripId}`);
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
        tx.tripId = resolvedTrip ? resolvedTrip.id : null;
        tx.tripCurrencyCode = tripCurrencyCode;
        tx.amountInTripCurrency = amountInTripCurrency;
        tx.tripExchangeRate = tripExchangeRate;
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
  tripId,
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

      const nextTripId =
        typeof tripId === 'undefined' ? (transaction.tripId as string | null) : tripId;

      let resolvedTrip: TripModel | null = null;
      let tripCurrencyCode: string | null = null;
      let amountInTripCurrency: number | null = null;
      let tripExchangeRate: number | null = null;

      if (nextTripId) {
        try {
          resolvedTrip = await database.get<TripModel>('trips').find(nextTripId);
          tripCurrencyCode = resolvedTrip.homeCurrencyCode;
          if (tripCurrencyCode === currencyCode) {
            tripExchangeRate = 1;
            amountInTripCurrency = amount;
          } else if (tripCurrencyCode === baseCurrencyCode) {
            tripExchangeRate = exchangeRate;
            amountInTripCurrency = amountInBaseCurrency;
          } else {
            const rate = await getCurrencyConversion(tripCurrencyCode, currencyCode);
            if (rate) {
              tripExchangeRate = rate;
              amountInTripCurrency = amount * rate;
            }
          }
        } catch {
          throw new Error(`Trip not found: ${nextTripId}`);
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
        tx.tripId = resolvedTrip ? resolvedTrip.id : null;
        tx.tripCurrencyCode = tripCurrencyCode;
        tx.amountInTripCurrency = amountInTripCurrency;
        tx.tripExchangeRate = tripExchangeRate;
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

export type CreateTripPayload = {
  name: string;
  homeCurrencyCode: string;
  startDate?: Date | null;
  endDate?: Date | null;
};

export const createTrip = async ({
  name,
  homeCurrencyCode,
  startDate = null,
  endDate = null,
}: CreateTripPayload) => {
  try {
    return await database.write(async () => {
      const tripCollection = database.get<TripModel>('trips');
      return tripCollection.create((trip) => {
        trip.name = name;
        trip.homeCurrencyCode = homeCurrencyCode;
        trip.startDate = startDate;
        trip.endDate = endDate;
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
  homeCurrencyCode,
  startDate = null,
  endDate = null,
  isArchived,
}: { id: string } & CreateTripPayload & { isArchived: boolean }) => {
  try {
    return await database.write(async () => {
      let trip: TripModel;
      try {
        trip = await database.get<TripModel>('trips').find(id);
      } catch {
        throw new Error(`Trip not found: ${id}`);
      }

      return trip.updateTrip({
        name,
        homeCurrencyCode,
        startDate,
        endDate,
        isArchived,
      });
    });
  } catch (error) {
    console.error('Failed to update trip:', error);
    throw error instanceof Error ? error : new Error('Failed to update trip');
  }
};

export const archiveTrip = async (tripId: string) => {
  try {
    return await database.write(async () => {
      let trip: TripModel;
      try {
        trip = await database.get<TripModel>('trips').find(tripId);
      } catch {
        throw new Error(`Trip not found: ${tripId}`);
      }

      return trip.archive();
    });
  } catch (error) {
    console.error('Failed to archive trip:', error);
    throw error instanceof Error ? error : new Error('Failed to archive trip');
  }
};

export const setActiveTripId = async (tripId: string | null) => {
  try {
    if (tripId) {
      await database.localStorage.set(STORAGE_KEYS.ACTIVE_TRIP_ID, tripId);
    } else {
      await database.localStorage.set(STORAGE_KEYS.ACTIVE_TRIP_ID, '');
    }
  } catch (error) {
    console.error('Failed to set active trip id:', error);
  }
};

export const getActiveTripId = async (): Promise<string | null> => {
  try {
    const stored = await database.localStorage.get(STORAGE_KEYS.ACTIVE_TRIP_ID);
    return typeof stored === 'string' && stored.length > 0 ? stored : null;
  } catch (error) {
    console.error('Failed to read active trip id:', error);
    return null;
  }
};

export const getActiveTrip = async (): Promise<TripModel | null> => {
  const tripId = await getActiveTripId();
  if (!tripId) return null;

  try {
    return await database.get<TripModel>('trips').find(tripId);
  } catch {
    return null;
  }
};

export type CreateTripBudgetPayload = {
  tripId: string;
  name: string;
  amount: number;
  currencyCode: string;
  type: TripBudgetType;
  alertThreshold: number;
  categoryIds?: string[];
  isActive?: boolean;
};

export const createTripBudget = async ({
  tripId,
  name,
  amount,
  currencyCode,
  type,
  alertThreshold,
  categoryIds = [],
  isActive = true,
}: CreateTripBudgetPayload) => {
  try {
    return await database.write(async () => {
      const trip = await database.get<TripModel>('trips').find(tripId);
      const budgetCollection = database.get<TripBudgetModel>('trip_budgets');
      const budgetCategoryCollection =
        database.get<TripBudgetCategoryModel>('trip_budget_categories');

      const preparedRecords: Model[] = [];

      const budget = budgetCollection.prepareCreate((b) => {
        b.tripId = trip.id;
        b.name = name;
        b.amount = amount;
        b.currencyCode = currencyCode;
        b.type = type;
        b.alertThreshold = alertThreshold;
        b.isActive = isActive;
      });
      preparedRecords.push(budget);

      for (const categoryId of categoryIds) {
        const budgetCategory = budgetCategoryCollection.prepareCreate((bc) => {
          bc.tripBudgetId = budget.id;
          bc.categoryId = categoryId;
        });
        preparedRecords.push(budgetCategory);
      }

      await database.batch(...preparedRecords);
      return budget;
    });
  } catch (error) {
    console.error('Failed to create trip budget:', error);
    throw error instanceof Error ? error : new Error('Failed to create trip budget');
  }
};

export const updateTripBudget = async ({
  id,
  name,
  amount,
  currencyCode,
  type,
  alertThreshold,
  categoryIds = [],
  isActive = true,
}: { id: string } & CreateTripBudgetPayload) => {
  try {
    return await database.write(async () => {
      const budgetCollection = database.get<TripBudgetModel>('trip_budgets');
      const budgetCategoryCollection =
        database.get<TripBudgetCategoryModel>('trip_budget_categories');

      let budget: TripBudgetModel;
      try {
        budget = await budgetCollection.find(id);
      } catch {
        throw new Error(`Trip budget not found: ${id}`);
      }

      const existingBudgetCategories = await budget.tripBudgetCategories.fetch();

      const preparedRecords: Model[] = [];

      const updatedBudget = budget.prepareUpdate((b) => {
        b.name = name;
        b.amount = amount;
        b.currencyCode = currencyCode;
        b.type = type;
        b.alertThreshold = alertThreshold;
        b.isActive = isActive;
      });
      preparedRecords.push(updatedBudget);

      for (const bc of existingBudgetCategories) {
        preparedRecords.push(bc.prepareMarkAsDeleted());
      }

      for (const categoryId of categoryIds) {
        const budgetCategory = budgetCategoryCollection.prepareCreate((bc) => {
          bc.tripBudgetId = budget.id;
          bc.categoryId = categoryId;
        });
        preparedRecords.push(budgetCategory);
      }

      await database.batch(...preparedRecords);
      return updatedBudget;
    });
  } catch (error) {
    console.error('Failed to update trip budget:', error);
    throw error instanceof Error ? error : new Error('Failed to update trip budget');
  }
};

export const deleteTripBudget = async (budgetId: string) => {
  try {
    return await database.write(async () => {
      const budgetCollection = database.get<TripBudgetModel>('trip_budgets');

      let budget: TripBudgetModel;
      try {
        budget = await budgetCollection.find(budgetId);
      } catch {
        throw new Error(`Trip budget not found: ${budgetId}`);
      }

      const budgetCategories = await budget.tripBudgetCategories.fetch();

      const preparedRecords: Model[] = [budget.prepareMarkAsDeleted()];

      for (const bc of budgetCategories) {
        preparedRecords.push(bc.prepareMarkAsDeleted());
      }

      await database.batch(...preparedRecords);
      return budget;
    });
  } catch (error) {
    console.error('Failed to delete trip budget:', error);
    throw error instanceof Error ? error : new Error('Failed to delete trip budget');
  }
};

export const toggleTripBudget = async (budgetId: string) => {
  try {
    return await database.write(async () => {
      const collection = database.get<TripBudgetModel>('trip_budgets');

      let budget: TripBudgetModel;
      try {
        budget = await collection.find(budgetId);
      } catch {
        throw new Error(`Trip budget not found: ${budgetId}`);
      }

      return budget.toggle();
    });
  } catch (error) {
    console.error('Failed to toggle trip budget:', error);
    throw error instanceof Error ? error : new Error('Failed to toggle trip budget');
  }
};

export const getTripBudgetStatus = async (
  tripBudgetId: string,
  periodStart: Date,
  periodEnd: Date
) => {
  try {
    const budget = await database.get<TripBudgetModel>('trip_budgets').find(tripBudgetId);
    const [trip, budgetCategories] = await Promise.all([
      budget.trip.fetch(),
      budget.tripBudgetCategories.fetch(),
    ]);

    if (!trip) {
      throw new Error('Trip missing for this budget');
    }

    const categoryIds = budgetCategories.map((bc) => bc.categoryId);

    const conditions = [
      Q.where('tripId', trip.id),
      Q.where('date', Q.gte(periodStart.getTime())),
      Q.where('date', Q.lte(periodEnd.getTime())),
    ];

    if (budget.type === 'category' && categoryIds.length > 0) {
      conditions.push(Q.where('categoryId', Q.oneOf(categoryIds)));
    }

    const transactions = await database
      .get<TransactionModel>('transactions')
      .query(...conditions)
      .fetch();

    const spent = transactions.reduce((sum, tx) => {
      if (tx.amount >= 0) return sum;

      const amountForBudget =
        tx.amountInTripCurrency ??
        tx.amountInBaseCurrency ??
        tx.amount;

      return sum + Math.abs(amountForBudget);
    }, 0);

    const remaining = budget.amount - spent;
    const percentage = budget.amount === 0 ? 0 : (spent / budget.amount) * 100;

    return {
      budget,
      trip,
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
    console.error('Failed to get trip budget status:', error);
    throw error instanceof Error
      ? error
      : new Error('Failed to get trip budget status');
  }
};

export type FxSnapshotPayload = {
  baseCurrencyCode: string;
  counterCurrencyCode: string;
  rate: number;
  source?: string | null;
  capturedAt?: Date;
  tripId?: string | null;
};

export const createFxSnapshot = async ({
  baseCurrencyCode,
  counterCurrencyCode,
  rate,
  source = null,
  capturedAt = new Date(),
  tripId = null,
}: FxSnapshotPayload) => {
  try {
    return await database.write(async () => {
      const snapshotCollection = database.get<FxSnapshotModel>('fx_snapshots');
      let linkedTripId: string | null = null;

      if (tripId) {
        try {
          const trip = await database.get<TripModel>('trips').find(tripId);
          linkedTripId = trip.id;
        } catch {
          throw new Error(`Trip not found: ${tripId}`);
        }
      }

      return snapshotCollection.create((snapshot) => {
        snapshot.baseCurrencyCode = baseCurrencyCode;
        snapshot.counterCurrencyCode = counterCurrencyCode;
        snapshot.rate = rate;
        snapshot.source = source ?? null;
        snapshot.capturedAt = capturedAt;
        snapshot.tripId = linkedTripId;
      });
    });
  } catch (error) {
    console.error('Failed to create FX snapshot:', error);
    throw error instanceof Error ? error : new Error('Failed to create FX snapshot');
  }
};

export const getLatestFxSnapshot = async ({
  baseCurrencyCode,
  counterCurrencyCode,
  tripId,
}: {
  baseCurrencyCode: string;
  counterCurrencyCode: string;
  tripId?: string | null;
}) => {
  try {
    const snapshots = await database
      .get<FxSnapshotModel>('fx_snapshots')
      .query(
        Q.where('baseCurrencyCode', baseCurrencyCode),
        Q.where('counterCurrencyCode', counterCurrencyCode),
        Q.sortBy('captured_at', 'desc')
      )
      .fetch();

    if (tripId) {
      const tripSpecific = snapshots.find((snapshot) => snapshot.tripId === tripId);
      if (tripSpecific) {
        return tripSpecific;
      }
    }

    return snapshots[0] ?? null;
  } catch (error) {
    console.error('Failed to fetch FX snapshot:', error);
    throw error instanceof Error ? error : new Error('Failed to fetch FX snapshot');
  }
};
