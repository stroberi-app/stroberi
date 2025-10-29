import type { Model } from '@nozbe/watermelondb';
import { getCurrencyConversion } from '../hooks/useCurrencyApi';
import type { CategoryModel } from './category-model';
import { database } from './index';
import type { TransactionModel } from './transaction-model';

export type CreateTransactionPayload = {
  merchant: string;
  amount: number;
  categoryId: string | null;
  date: Date;
  currencyCode: string;
  note: string;
  baseCurrency: string;
};
export const createTransaction = async ({
  merchant,
  amount,
  categoryId,
  date,
  currencyCode,
  note,
  baseCurrency,
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
