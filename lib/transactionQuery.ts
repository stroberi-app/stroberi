import { type Database, Q } from '@nozbe/watermelondb';
import type { CategoryModel } from '../database/category-model';
import type { TransactionModel } from '../database/transaction-model';
import type { DateFilters } from './date';

export type TransactionTypeFilter = 'all' | 'expense' | 'income';

export type TransactionQueryFilters = {
  dateFilter?: DateFilters | null;
  customRange?: [Date, Date];
  categories?: CategoryModel[];
  transactionType?: TransactionTypeFilter;
};

export const buildTransactionFilterClauses = ({
  dateFilter,
  customRange,
  categories = [],
  transactionType = 'all',
}: TransactionQueryFilters) => {
  const now = new Date();
  const clauses: ReturnType<typeof Q.where>[] = [];

  if (dateFilter === 'This Year') {
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
    clauses.push(Q.where('date', Q.gte(startOfYear)));
    clauses.push(Q.where('date', Q.lte(endOfYear)));
  } else if (dateFilter === 'This Month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    ).getTime();
    clauses.push(Q.where('date', Q.gte(startOfMonth)));
    clauses.push(Q.where('date', Q.lte(endOfMonth)));
  } else if (customRange) {
    clauses.push(Q.where('date', Q.gte(customRange[0].getTime())));
    clauses.push(Q.where('date', Q.lte(customRange[1].getTime())));
  }

  if (categories.length > 0) {
    clauses.push(
      Q.where('categoryId', Q.oneOf(categories.map((category) => category.id)))
    );
  }

  if (transactionType === 'expense') {
    clauses.push(Q.where('amountInBaseCurrency', Q.lt(0)));
  } else if (transactionType === 'income') {
    clauses.push(Q.where('amountInBaseCurrency', Q.gte(0)));
  }

  return clauses;
};

export const buildTransactionsBaseQuery = (
  database: Database,
  filters: TransactionQueryFilters
) => {
  const filterClauses = buildTransactionFilterClauses(filters);

  return database
    .get<TransactionModel>('transactions')
    .query(Q.sortBy('date', 'desc'), ...filterClauses);
};
