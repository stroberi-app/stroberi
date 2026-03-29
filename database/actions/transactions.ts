import { type Model, Q } from '@nozbe/watermelondb';
import type { ConversionResult, ConversionStatus } from '../../lib/currencyConversion';
import { MissingCurrencyRateError } from '../../lib/currencyConversion';
import { getCurrencyConversion } from '../../lib/currencyConversionService';
import type { CategoryModel } from '../category-model';
import { database } from '../index';
import type { TransactionModel } from '../transaction-model';
import { findCategoryOrThrow, findRecordOrThrow, logAndRethrow } from './shared';

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

export type CreateTransactionsBatchResult = {
  importedCount: number;
  failed: Array<{ row: number; reason: string }>;
};

type ResolvedConversion = {
  baseCurrencyCode: string;
  amountInBaseCurrency: number;
  exchangeRate: number;
  conversionStatus: ConversionStatus;
};

type ConversionCache = Map<string, ConversionResult>;

const resolveConversion = async ({
  amount,
  baseCurrency,
  currencyCode,
  allowMissingRate = false,
  conversionCache,
}: {
  amount: number;
  baseCurrency: string;
  currencyCode: string;
  allowMissingRate?: boolean;
  conversionCache?: ConversionCache;
}): Promise<ResolvedConversion> => {
  if (baseCurrency === currencyCode) {
    return {
      baseCurrencyCode: baseCurrency,
      amountInBaseCurrency: amount,
      exchangeRate: 1,
      conversionStatus: 'ok',
    };
  }

  const cacheKey = `${baseCurrency}_${currencyCode}`;
  let conversion = conversionCache?.get(cacheKey);

  if (!conversion) {
    conversion = await getCurrencyConversion(baseCurrency, currencyCode);
    conversionCache?.set(cacheKey, conversion);
  }

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

const getCategoryMap = async (transactions: CreateTransactionPayload[]) => {
  const uniqueCategoryIds = Array.from(
    new Set(
      transactions
        .map((transaction) => transaction.categoryId)
        .filter((categoryId): categoryId is string => Boolean(categoryId))
    )
  );

  const categoryMap = new Map<string, CategoryModel>();
  if (uniqueCategoryIds.length === 0) {
    return categoryMap;
  }

  const categories = await database
    .get<CategoryModel>('categories')
    .query(Q.where('id', Q.oneOf(uniqueCategoryIds)))
    .fetch();

  for (const category of categories) {
    categoryMap.set(category.id, category);
  }

  return categoryMap;
};

export const createTransactionsBatch = async (
  transactions: CreateTransactionPayload[],
  conversionCache?: ConversionCache
): Promise<CreateTransactionsBatchResult> => {
  if (!transactions.length) {
    return { importedCount: 0, failed: [] };
  }

  const failed: Array<{ row: number; reason: string }> = [];
  const categoryMap = await getCategoryMap(transactions);
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
        conversionCache,
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
      preparedRecords.push(
        collection.prepareCreate((tx) => {
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
        })
      );

      if (transaction.category) {
        const currentCount = categoryUsageIncrements.get(transaction.category.id) ?? 0;
        categoryUsageIncrements.set(transaction.category.id, currentCount + 1);
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
}: CreateTransactionPayload): Promise<TransactionModel> => {
  try {
    return await database.write(async () => {
      const collection = database.get<TransactionModel>('transactions');
      const category = await findCategoryOrThrow(categoryId);
      const resolvedConversion = await resolveConversion({
        amount,
        baseCurrency,
        currencyCode,
        allowMissingRate,
      });
      const preparedRecords: Model[] = [];

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

        if (category) {
          tx.category?.set(category);
        }
      });

      preparedRecords.push(transaction);

      if (category) {
        preparedRecords.push(
          category.prepareUpdate((record) => {
            record.usageCount = (record.usageCount || 0) + 1;
          })
        );
      }

      await database.batch(...preparedRecords);
      return transaction;
    });
  } catch (error) {
    return logAndRethrow(
      'Failed to create transaction:',
      error,
      'Failed to create transaction'
    );
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
}): Promise<TransactionModel> => {
  try {
    return await database.write(async () => {
      const collection = database.get<TransactionModel>('transactions');
      const transaction = await findRecordOrThrow(collection, id, 'Transaction');
      const oldCategory = await transaction.category?.fetch();
      const oldCategoryId = oldCategory?.id || null;
      const nextCategory = await findCategoryOrThrow(categoryId);
      const resolvedConversion = await resolveConversion({
        amount,
        baseCurrency,
        currencyCode,
        allowMissingRate,
      });
      const preparedRecords: Model[] = [];

      preparedRecords.push(
        transaction.prepareUpdate((record) => {
          record.merchant = merchant;
          record.amount = amount;
          record.date = date;
          record.currencyCode = currencyCode;
          record.note = note;
          record.baseCurrencyCode = resolvedConversion.baseCurrencyCode;
          record.amountInBaseCurrency = resolvedConversion.amountInBaseCurrency;
          record.exchangeRate = resolvedConversion.exchangeRate;
          record.conversionStatus = resolvedConversion.conversionStatus;
          record.tripId = tripId !== undefined ? tripId : record.tripId;
          record._setRaw('categoryId', nextCategory?.id ?? null);
        })
      );

      if (oldCategoryId !== categoryId) {
        if (oldCategory) {
          preparedRecords.push(
            oldCategory.prepareUpdate((record) => {
              record.usageCount = Math.max(0, (record.usageCount || 0) - 1);
            })
          );
        }

        if (nextCategory) {
          preparedRecords.push(
            nextCategory.prepareUpdate((record) => {
              record.usageCount = (record.usageCount || 0) + 1;
            })
          );
        }
      }

      await database.batch(...preparedRecords);
      return transaction;
    });
  } catch (error) {
    return logAndRethrow(
      'Failed to update transaction:',
      error,
      'Failed to update transaction'
    );
  }
};

export const deleteTransaction = async (
  transactionId: string
): Promise<TransactionModel> => {
  try {
    return await database.write(async () => {
      const collection = database.get<TransactionModel>('transactions');
      const transaction = await findRecordOrThrow(
        collection,
        transactionId,
        'Transaction'
      );
      const category = await transaction.category?.fetch();
      const preparedRecords: Model[] = [transaction.prepareMarkAsDeleted()];

      if (category) {
        preparedRecords.push(
          category.prepareUpdate((record) => {
            record.usageCount = Math.max(0, (record.usageCount || 0) - 1);
          })
        );
      }

      await database.batch(...preparedRecords);
      return transaction;
    });
  } catch (error) {
    return logAndRethrow(
      'Failed to delete transaction:',
      error,
      'Failed to delete transaction'
    );
  }
};
