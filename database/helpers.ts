import { TransactionModel } from './transaction-model';
import { CategoryModel } from './category-model';
import { database } from './index';

export type CreateTransactionPayload = {
  merchant: string;
  amount: number;
  categoryId: string | null;
  date: Date;
  currencyCode: string;
  note: string;
};
export const createTransaction = ({
  merchant,
  amount,
  categoryId,
  date,
  currencyCode,
  note,
}: CreateTransactionPayload) =>
  database.write(async () => {
    const collection = database.get<TransactionModel>('transactions');
    const categoryCollection = categoryId
      ? await database.get<CategoryModel>('categories').find(categoryId)
      : null;
    return collection.create(tx => {
      tx.merchant = merchant;
      tx.amount = amount;
      tx.date = date;
      tx.currencyCode = currencyCode;
      tx.note = note;
      if (categoryCollection) {
        tx.categoryId?.set(categoryCollection);
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
}: {
  id: string;
  merchant: string;
  amount: number;
  categoryId: string | null;
  date: Date;
  currencyCode: string;
  note: string;
}) =>
  database.write(async () => {
    const collection = database.get<TransactionModel>('transactions');
    const categoryCollection = categoryId
      ? await database.get<CategoryModel>('categories').find(categoryId)
      : null;
    const transaction = await collection.find(id);
    return transaction.update(tx => {
      tx.merchant = merchant;
      tx.amount = amount;
      tx.date = date;
      tx.currencyCode = currencyCode;
      tx.note = note;
      if (categoryCollection) {
        tx.categoryId?.set(categoryCollection);
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
