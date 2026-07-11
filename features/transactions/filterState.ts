import type { DateFilters } from '../../lib/date';
import type { TransactionTypeFilter } from '../../lib/transactionQuery';

type ActiveTransactionFilters = {
  dateFilter?: DateFilters | null;
  categoryCount: number;
  transactionType: TransactionTypeFilter;
  merchant?: string;
  uncategorized?: boolean;
};

export const countActiveTransactionFilters = ({
  dateFilter,
  categoryCount,
  transactionType,
  merchant,
  uncategorized = false,
}: ActiveTransactionFilters) =>
  [
    dateFilter,
    categoryCount > 0 ? 'categories' : null,
    transactionType !== 'all' ? transactionType : null,
    merchant ? 'merchant' : null,
    uncategorized ? 'uncategorized' : null,
  ].filter(Boolean).length;
