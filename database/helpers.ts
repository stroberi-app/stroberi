import { TransactionModel } from './transaction-model';
import { CategoryModel } from './category-model';
import { database } from './index';
import { getCurrencyConversion } from '../hooks/useCurrencyApi';

export type CreateTransactionPayload = {
  merchant: string;
  amount: number;
  categoryId: string | null;
  date: Date;
  currencyCode: string;
  note: string;
  baseCurrency: string;
};
export const createTransaction = ({
  merchant,
  amount,
  categoryId,
  date,
  currencyCode,
  note,
  baseCurrency,
}: CreateTransactionPayload) =>
  database.write(async () => {
    const collection = database.get<TransactionModel>('transactions');
    const categoryCollection = categoryId
      ? await database.get<CategoryModel>('categories').find(categoryId)
      : null;

    let baseCurrencyCode = baseCurrency;
    let amountInBaseCurrency = amount;
    let exchangeRate = 1;
    if (baseCurrency !== currencyCode) {
      const rate = await getCurrencyConversion(baseCurrency, currencyCode);
      if (rate) {
        baseCurrencyCode = baseCurrency;
        amountInBaseCurrency = amount * rate;
        exchangeRate = rate;
      }
    }

    return collection.create(tx => {
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
  });

export const updateTransaction = ({
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
}) =>
  database.write(async () => {
    const collection = database.get<TransactionModel>('transactions');
    const categoryCollection = categoryId
      ? await database.get<CategoryModel>('categories').find(categoryId)
      : null;
    const transaction = await collection.find(id);

    let baseCurrencyCode = baseCurrency;
    let amountInBaseCurrency = amount;
    let exchangeRate = 1;
    if (baseCurrency !== currencyCode) {
      const rate = await getCurrencyConversion(baseCurrency, currencyCode);
      if (rate) {
        baseCurrencyCode = baseCurrency;
        amountInBaseCurrency = amount * rate;
        exchangeRate = rate;
      }
    }

    return transaction.update(tx => {
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
  });

export const createCategory = ({ name, icon }: { name: string; icon: string }) =>
  database.write(async () => {
    const collection = database.get<CategoryModel>('categories');
    return collection.create(category => {
      category.name = name;
      category.icon = icon;
    });
  });

export const updateCategory = ({ id, name, icon }: { id: string; name: string; icon: string }) =>
  database.write(async () => {
    const collection = database.get<CategoryModel>('categories');
    collection.find(id).then(category => {
      category.update(tx => {
        tx.name = name;
        tx.icon = icon;
      });
    });
  });
