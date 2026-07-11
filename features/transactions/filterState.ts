import type { DateFilters } from '../../lib/date';
import type { TransactionTypeFilter } from '../../lib/transactionQuery';

type ActiveTransactionFilters = {
  dateFilter?: DateFilters | null;
  categoryCount: number;
  transactionType: TransactionTypeFilter;
  merchant?: string;
  uncategorized?: boolean;
  maxExpenseAmount?: number;
};

export const countActiveTransactionFilters = ({
  dateFilter,
  categoryCount,
  transactionType,
  merchant,
  uncategorized = false,
  maxExpenseAmount,
}: ActiveTransactionFilters) =>
  [
    dateFilter,
    categoryCount > 0 ? 'categories' : null,
    transactionType !== 'all' ? transactionType : null,
    merchant ? 'merchant' : null,
    uncategorized ? 'uncategorized' : null,
    maxExpenseAmount ? 'maxExpenseAmount' : null,
  ].filter(Boolean).length;
