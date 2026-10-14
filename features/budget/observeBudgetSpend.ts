import type { Database } from '@nozbe/watermelondb';
import { combineLatest, map, type Observable } from 'rxjs';
import type { BudgetModel } from '../../database/budget-model';
import type { TransactionModel } from '../../database/transaction-model';
import {
  buildBudgetTransactionConditions,
  calculateBudgetPeriodDates,
  sumBudgetTransactions,
} from '../../lib/budgetUtils';

export type BudgetScope = Pick<BudgetModel, 'period' | 'startDate' | 'rollover'> & {
  categoryIds: string[];
};

/** Current-period spend, plus the previous period's when rollover needs it. */
export type BudgetSpend = { spent: number; previousSpent?: number };

const observeSpend = (
  database: Database,
  { start, end }: { start: Date; end: Date },
  categoryIds: string[]
) =>
  database
    .get<TransactionModel>('transactions')
    .query(...buildBudgetTransactionConditions(start, end, categoryIds))
    .observeWithColumns(['amountInBaseCurrency', 'categoryId', 'date'])
    .pipe(map(sumBudgetTransactions));

/** Live spend for a budget scope; feed the result to `evaluateBudget`. */
export const observeBudgetSpend = (
  database: Database,
  scope: BudgetScope
): Observable<BudgetSpend> => {
  const current = observeSpend(
    database,
    calculateBudgetPeriodDates(scope),
    scope.categoryIds
  );

  if (!scope.rollover) {
    return current.pipe(map((spent) => ({ spent })));
  }

  const previous = observeSpend(
    database,
    calculateBudgetPeriodDates(scope, -1),
    scope.categoryIds
  );

  return combineLatest([current, previous]).pipe(
    map(([spent, previousSpent]) => ({ spent, previousSpent }))
  );
};
