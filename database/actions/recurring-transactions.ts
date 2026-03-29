import { Q } from '@nozbe/watermelondb';
import dayjs from 'dayjs';
import '../../lib/date';
import type { CategoryModel } from '../category-model';
import { database } from '../index';
import type {
  RecurringFrequency,
  RecurringTransactionModel,
} from '../recurring-transaction-model';
import type { TransactionModel } from '../transaction-model';
import { createTransaction } from './transactions';
import { findCategoryOrThrow, findRecordOrThrow, logAndRethrow } from './shared';

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
}: CreateRecurringTransactionPayload): Promise<RecurringTransactionModel> => {
  try {
    return await database.write(async () => {
      const collection = database.get<RecurringTransactionModel>(
        'recurring_transactions'
      );
      const category = await findCategoryOrThrow(categoryId);
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

        if (category) {
          recurring.category?.set(category);
        }
      });
    });
  } catch (error) {
    return logAndRethrow(
      'Failed to create recurring transaction:',
      error,
      'Failed to create recurring transaction'
    );
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
} & CreateRecurringTransactionPayload): Promise<RecurringTransactionModel> => {
  try {
    return await database.write(async () => {
      const collection = database.get<RecurringTransactionModel>(
        'recurring_transactions'
      );
      const recurring = await findRecordOrThrow(collection, id, 'Recurring transaction');
      const category = await findCategoryOrThrow(categoryId);
      const nextDueDate = calculateNextDueDateFromStart(frequency, startDate);

      return recurring.update((record) => {
        record.merchant = merchant;
        record.amount = amount;
        record.currencyCode = currencyCode;
        record.note = note;
        record.frequency = frequency;
        record.startDate = startDate;
        record.endDate = endDate || null;
        record.nextDueDate = nextDueDate;
        record._setRaw('categoryId', category?.id ?? null);
      });
    });
  } catch (error) {
    return logAndRethrow(
      'Failed to update recurring transaction:',
      error,
      'Failed to update recurring transaction'
    );
  }
};

export const deleteRecurringTransaction = async (
  recurringId: string
): Promise<RecurringTransactionModel> => {
  try {
    return await database.write(async () => {
      const collection = database.get<RecurringTransactionModel>(
        'recurring_transactions'
      );
      const recurring = await findRecordOrThrow(
        collection,
        recurringId,
        'Recurring transaction'
      );

      await recurring.markAsDeleted();
      return recurring;
    });
  } catch (error) {
    return logAndRethrow(
      'Failed to delete recurring transaction:',
      error,
      'Failed to delete recurring transaction'
    );
  }
};

export const toggleRecurringTransaction = async (
  recurringId: string
): Promise<RecurringTransactionModel> => {
  try {
    return await database.write(async () => {
      const collection = database.get<RecurringTransactionModel>(
        'recurring_transactions'
      );
      const recurring = await findRecordOrThrow(
        collection,
        recurringId,
        'Recurring transaction'
      );

      return recurring.toggle();
    });
  } catch (error) {
    return logAndRethrow(
      'Failed to toggle recurring transaction:',
      error,
      'Failed to toggle recurring transaction'
    );
  }
};

export const checkAndCreateDueTransactions = async (
  baseCurrency: string
): Promise<TransactionModel[]> => {
  try {
    const collection = database.get<RecurringTransactionModel>('recurring_transactions');
    const activeRecurring = await collection.query(Q.where('isActive', true)).fetch();
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
        const category = (await recurring.category?.fetch()) as CategoryModel | null;
        const transactionDate = dayjs()
          .hour(dayjs(recurring.startDate).hour())
          .minute(dayjs(recurring.startDate).minute())
          .second(0)
          .millisecond(0)
          .toDate();

        const transaction = await createTransaction({
          merchant: recurring.merchant,
          amount: recurring.amount,
          categoryId: category?.id ?? null,
          date: transactionDate,
          currencyCode: recurring.currencyCode,
          note: recurring.note,
          baseCurrency,
          recurringTransactionId: recurring.id,
        });

        const previousDue = recurring.nextDueDate ?? recurring.startDate;
        const nextDue = calculateNextDueDate(recurring.frequency, previousDue);

        await database.write(async () => {
          await recurring.update((record) => {
            record.nextDueDate = nextDue;
            record.lastCreatedDate = new Date();
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
    return logAndRethrow(
      'Failed to check and create due transactions:',
      error,
      'Failed to check and create due transactions'
    );
  }
};
