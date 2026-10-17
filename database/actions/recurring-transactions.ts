import { Q } from '@nozbe/watermelondb';
import dayjs from 'dayjs';
import { advanceByCadence, firstOccurrenceOnOrAfter } from '../../lib/recurrence';
import { database } from '../index';
import type {
  RecurringFrequency,
  RecurringTransactionModel,
} from '../recurring-transaction-model';
import type { TransactionModel } from '../transaction-model';
import { prepareTransactionRecords, resolveBaseCurrencyAmount } from './transactions';
import {
  collection,
  findCategoryOrThrow,
  findRecordOrThrow,
  runAction,
  runWriteAction,
} from './shared';

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

const findRecurring = (id: string) =>
  findRecordOrThrow(collection('recurring_transactions'), id, 'Recurring transaction');

const assignRecurring = (
  record: RecurringTransactionModel,
  payload: CreateRecurringTransactionPayload
) => {
  record.merchant = payload.merchant;
  record.amount = payload.amount;
  record.currencyCode = payload.currencyCode;
  record.note = payload.note;
  record.frequency = payload.frequency;
  record.startDate = payload.startDate;
  record.endDate = payload.endDate || null;
  record.nextDueDate = firstOccurrenceOnOrAfter(
    payload.startDate,
    payload.frequency
  ).toDate();
};

export const createRecurringTransaction = (
  payload: CreateRecurringTransactionPayload
): Promise<RecurringTransactionModel> =>
  runWriteAction('create recurring transaction', async () => {
    const category = await findCategoryOrThrow(payload.categoryId);

    return collection('recurring_transactions').create((record) => {
      assignRecurring(record, payload);
      record.lastCreatedDate = null;
      record.isActive = true;
      record._setRaw('categoryId', category?.id ?? null);
    });
  });

export const updateRecurringTransaction = ({
  id,
  ...payload
}: {
  id: string;
} & CreateRecurringTransactionPayload): Promise<RecurringTransactionModel> =>
  runWriteAction('update recurring transaction', async () => {
    const recurring = await findRecurring(id);
    const category = await findCategoryOrThrow(payload.categoryId);

    return recurring.update((record) => {
      assignRecurring(record, payload);
      record._setRaw('categoryId', category?.id ?? null);
    });
  });

export const deleteRecurringTransaction = (
  recurringId: string
): Promise<RecurringTransactionModel> =>
  runWriteAction('delete recurring transaction', async () => {
    const recurring = await findRecurring(recurringId);
    await recurring.markAsDeleted();
    return recurring;
  });

export const toggleRecurringTransaction = (
  recurringId: string
): Promise<RecurringTransactionModel> =>
  runWriteAction('toggle recurring transaction', async () => {
    const recurring = await findRecurring(recurringId);
    return recurring.update((record) => {
      record.isActive = !record.isActive;
    });
  });

const isDue = (recurring: RecurringTransactionModel, now: dayjs.Dayjs) => {
  if (recurring.endDate && now.isAfter(dayjs(recurring.endDate))) {
    return false;
  }

  return !now.isBefore(dayjs(recurring.nextDueDate), 'day');
};

/**
 * Materialises one transaction per due schedule (stamped today at the
 * schedule's time of day) and advances its next due date by one period, both
 * in a single batch so a schedule can never fire twice for the same period.
 */
export const checkAndCreateDueTransactions = (
  baseCurrency: string
): Promise<TransactionModel[]> =>
  runAction('check and create due transactions', async () => {
    const now = dayjs();
    const activeRecurring = await collection('recurring_transactions')
      .query(Q.where('isActive', true))
      .fetch();
    const created: TransactionModel[] = [];

    for (const recurring of activeRecurring.filter((item) => isDue(item, now))) {
      try {
        const scheduledTime = dayjs(recurring.startDate);
        const payload = {
          merchant: recurring.merchant,
          amount: recurring.amount,
          categoryId: recurring.category?.id ?? null,
          date: now
            .hour(scheduledTime.hour())
            .minute(scheduledTime.minute())
            .second(0)
            .millisecond(0)
            .toDate(),
          currencyCode: recurring.currencyCode,
          note: recurring.note,
          baseCurrency,
          recurringTransactionId: recurring.id,
        };
        const converted = await resolveBaseCurrencyAmount(payload);

        const transaction = await database.write(async () => {
          const { transaction, records } = await prepareTransactionRecords(
            payload,
            converted
          );
          await database.batch(
            ...records,
            recurring.prepareUpdate((record) => {
              record.nextDueDate = advanceByCadence(
                record.nextDueDate ?? record.startDate,
                record.frequency
              ).toDate();
              record.lastCreatedDate = new Date();
            })
          );
          return transaction;
        }, 'create due recurring transaction');

        created.push(transaction);
      } catch (error) {
        console.error(
          `Failed to create transaction from recurring ${recurring.id}:`,
          error
        );
      }
    }

    return created;
  });
