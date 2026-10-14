import { type Model, Q } from '@nozbe/watermelondb';
import {
  type BaseCurrencyAmount,
  type ConversionResult,
  toBaseCurrencyAmount,
} from '../../lib/currencyConversion';
import { getCurrencyConversion } from '../../lib/currencyConversionService';
import type { CategoryModel } from '../category-model';
import { database } from '../index';
import type { TransactionModel } from '../transaction-model';
import {
  collection,
  findCategoryOrThrow,
  findRecordOrThrow,
  prepareCategoryUsageChange,
  runAction,
  runWriteAction,
} from './shared';

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

export type UpdateTransactionPayload = { id: string } & Omit<
  CreateTransactionPayload,
  'recurringTransactionId' | 'sourceRowNumber'
>;

export type CreateTransactionsBatchResult = {
  importedCount: number;
  failed: Array<{ row: number; reason: string }>;
};

/** Exchange rates keyed by `${baseCurrency}_${currencyCode}`, reused across rows. */
export type ConversionCache = Map<string, ConversionResult>;

type ConversionInput = Pick<
  CreateTransactionPayload,
  'amount' | 'currencyCode' | 'baseCurrency' | 'allowMissingRate'
>;

const fetchConversion = async (
  baseCurrency: string,
  currencyCode: string,
  cache?: ConversionCache
): Promise<ConversionResult | null> => {
  if (baseCurrency === currencyCode) {
    return null;
  }

  const cacheKey = `${baseCurrency}_${currencyCode}`;
  const cached = cache?.get(cacheKey);
  if (cached) {
    return cached;
  }

  const conversion = await getCurrencyConversion(baseCurrency, currencyCode);
  cache?.set(cacheKey, conversion);
  return conversion;
};

/**
 * Resolves the base-currency amount up front. This may hit the network, so it
 * must run before entering a writer to avoid blocking the write queue.
 */
export const resolveBaseCurrencyAmount = async (
  { amount, currencyCode, baseCurrency, allowMissingRate }: ConversionInput,
  cache?: ConversionCache
): Promise<BaseCurrencyAmount> =>
  toBaseCurrencyAmount({
    amount,
    currencyCode,
    baseCurrency,
    allowMissingRate,
    conversion: await fetchConversion(baseCurrency, currencyCode, cache),
  });

const applyBaseCurrencyAmount = (
  record: TransactionModel,
  converted: BaseCurrencyAmount
) => {
  record.baseCurrencyCode = converted.baseCurrencyCode;
  record.amountInBaseCurrency = converted.amountInBaseCurrency;
  record.exchangeRate = converted.exchangeRate;
  record.conversionStatus = converted.conversionStatus;
};

const assignTransaction = (
  record: TransactionModel,
  payload: Pick<
    CreateTransactionPayload,
    'merchant' | 'amount' | 'date' | 'currencyCode' | 'note'
  >,
  converted: BaseCurrencyAmount,
  category: CategoryModel | null
) => {
  record.merchant = payload.merchant;
  record.amount = payload.amount;
  record.date = payload.date;
  record.currencyCode = payload.currencyCode;
  record.note = payload.note;
  record.categoryId = category?.id ?? null;
  applyBaseCurrencyAmount(record, converted);
};

const prepareNewTransaction = (
  payload: CreateTransactionPayload,
  converted: BaseCurrencyAmount,
  category: CategoryModel | null
) =>
  collection('transactions').prepareCreate((record) => {
    assignTransaction(record, payload, converted, category);
    record.recurringTransactionId = payload.recurringTransactionId || null;
    record.tripId = payload.tripId || null;
  });

/**
 * Prepares a new transaction plus its category usage bump. Must be called
 * inside a writer; the caller batches `records` (optionally with its own).
 */
export const prepareTransactionRecords = async (
  payload: CreateTransactionPayload,
  converted: BaseCurrencyAmount
) => {
  const category = await findCategoryOrThrow(payload.categoryId);
  const transaction = prepareNewTransaction(payload, converted, category);
  const records: Model[] = [transaction];

  if (category) {
    records.push(prepareCategoryUsageChange(category, 1));
  }

  return { transaction, records };
};

const fetchCategoriesById = async (categoryIds: Array<string | null>) => {
  const uniqueIds = Array.from(new Set(categoryIds.filter((id): id is string => !!id)));
  if (!uniqueIds.length) {
    return new Map<string, CategoryModel>();
  }

  const categories = await collection('categories')
    .query(Q.where('id', Q.oneOf(uniqueIds)))
    .fetch();

  return new Map(categories.map((category) => [category.id, category]));
};

export const createTransactionsBatch = async (
  transactions: CreateTransactionPayload[],
  conversionCache?: ConversionCache
): Promise<CreateTransactionsBatchResult> => {
  if (!transactions.length) {
    return { importedCount: 0, failed: [] };
  }

  const failed: CreateTransactionsBatchResult['failed'] = [];
  const categories = await fetchCategoriesById(transactions.map((tx) => tx.categoryId));
  const ready: Array<{
    payload: CreateTransactionPayload;
    converted: BaseCurrencyAmount;
    category: CategoryModel | null;
  }> = [];

  for (const payload of transactions) {
    const row = payload.sourceRowNumber ?? -1;
    const category = payload.categoryId
      ? (categories.get(payload.categoryId) ?? null)
      : null;

    if (payload.categoryId && !category) {
      failed.push({ row, reason: `Category not found: ${payload.categoryId}` });
      continue;
    }

    try {
      const converted = await resolveBaseCurrencyAmount(payload, conversionCache);
      ready.push({ payload, converted, category });
    } catch (error) {
      failed.push({
        row,
        reason: error instanceof Error ? error.message : 'Failed currency conversion',
      });
    }
  }

  if (!ready.length) {
    return { importedCount: 0, failed };
  }

  await database.write(async () => {
    const records: Model[] = [];
    const usageIncrements = new Map<CategoryModel, number>();

    for (const { payload, converted, category } of ready) {
      records.push(prepareNewTransaction(payload, converted, category));

      if (category) {
        usageIncrements.set(category, (usageIncrements.get(category) ?? 0) + 1);
      }
    }

    for (const [category, increment] of usageIncrements) {
      records.push(prepareCategoryUsageChange(category, increment));
    }

    await database.batch(...records);
  }, 'import transactions');

  return { importedCount: ready.length, failed };
};

export const createTransaction = (
  payload: CreateTransactionPayload
): Promise<TransactionModel> =>
  runAction('create transaction', async () => {
    const converted = await resolveBaseCurrencyAmount(payload);

    return database.write(async () => {
      const { transaction, records } = await prepareTransactionRecords(
        payload,
        converted
      );
      await database.batch(...records);
      return transaction;
    }, 'create transaction');
  });

export const updateTransaction = (
  payload: UpdateTransactionPayload
): Promise<TransactionModel> =>
  runAction('update transaction', async () => {
    const converted = await resolveBaseCurrencyAmount(payload);

    return database.write(async () => {
      const transaction = await findRecordOrThrow(
        collection('transactions'),
        payload.id,
        'Transaction'
      );
      const previousCategory = (await transaction.category?.fetch()) ?? null;
      const nextCategory = await findCategoryOrThrow(payload.categoryId);
      const records: Model[] = [
        transaction.prepareUpdate((record) => {
          assignTransaction(record, payload, converted, nextCategory);
          if (payload.tripId !== undefined) {
            record.tripId = payload.tripId;
          }
        }),
      ];

      if (previousCategory?.id !== nextCategory?.id) {
        if (previousCategory) {
          records.push(prepareCategoryUsageChange(previousCategory, -1));
        }
        if (nextCategory) {
          records.push(prepareCategoryUsageChange(nextCategory, 1));
        }
      }

      await database.batch(...records);
      return transaction;
    }, 'update transaction');
  });

export const deleteTransaction = (transactionId: string): Promise<TransactionModel> =>
  runWriteAction('delete transaction', async () => {
    const transaction = await findRecordOrThrow(
      collection('transactions'),
      transactionId,
      'Transaction'
    );
    const category = await transaction.category?.fetch();
    const records: Model[] = [transaction.prepareMarkAsDeleted()];

    if (category) {
      records.push(prepareCategoryUsageChange(category, -1));
    }

    await database.batch(...records);
    return transaction;
  });

/**
 * Re-expresses every transaction in a new base currency. Rows whose rate is
 * unavailable keep their original amount and are flagged `missing_rate`.
 */
export const rebaseTransactionsToCurrency = (baseCurrency: string): Promise<void> =>
  runAction('rebase transactions', async () => {
    const transactions = await collection('transactions').query().fetch();
    if (!transactions.length) {
      return;
    }

    const cache: ConversionCache = new Map();
    const currencyCodes = new Set(transactions.map((tx) => tx.currencyCode));
    await Promise.all(
      Array.from(currencyCodes, (code) => fetchConversion(baseCurrency, code, cache))
    );

    const converted = await Promise.all(
      transactions.map((tx) =>
        resolveBaseCurrencyAmount(
          {
            amount: tx.amount,
            currencyCode: tx.currencyCode,
            baseCurrency,
            allowMissingRate: true,
          },
          cache
        )
      )
    );

    await database.write(async () => {
      await database.batch(
        ...transactions.map((tx, index) =>
          tx.prepareUpdate((record) => applyBaseCurrencyAmount(record, converted[index]))
        )
      );
    }, 'rebase transactions');
  });
