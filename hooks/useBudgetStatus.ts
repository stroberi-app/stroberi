import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { useMemo } from 'react';
import type { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs';
import type { BudgetCategoryModel } from '../database/budget-category-model';
import type { BudgetModel } from '../database/budget-model';
import { database } from '../database/index';
import type { TransactionModel } from '../database/transaction-model';
import { calculateBudgetPeriodDates } from '../lib/budgetUtils';

export type BudgetStatus = {
  spent: number;
  remaining: number;
  percentage: number;
  status: 'ok' | 'warning' | 'exceeded';
};

export const useBudgetStatus = withObservables<
  { budget: BudgetModel },
  { budgetStatus: Observable<BudgetStatus> }
>(['budget'], ({ budget }) => {
  const periodDates = calculateBudgetPeriodDates(budget);

  const budgetCategoriesObservable = budget.budgetCategories.observe();

  return {
    budgetStatus: budgetCategoriesObservable.pipe(
      switchMap((budgetCategories: BudgetCategoryModel[]) => {
        const categoryIds = budgetCategories.map((bc) => bc.categoryId);

        const baseConditions = [
          Q.where('date', Q.gte(periodDates.start.getTime())),
          Q.where('date', Q.lte(periodDates.end.getTime())),
          Q.where('amountInBaseCurrency', Q.lt(0)),
        ];

        if (categoryIds.length > 0) {
          baseConditions.push(Q.where('categoryId', Q.oneOf(categoryIds)));
        }

        return database
          .get<TransactionModel>('transactions')
          .query(...baseConditions)
          .observeWithColumns(['amountInBaseCurrency'])
          .pipe(
            map((transactions) => {
              const spent = transactions.reduce(
                (sum, tx) => sum + Math.abs(tx.amountInBaseCurrency),
                0
              );
              const remaining = budget.amount - spent;
              const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

              const status =
                percentage >= 100
                  ? ('exceeded' as const)
                  : percentage >= budget.alertThreshold
                    ? ('warning' as const)
                    : ('ok' as const);

              return {
                spent,
                remaining,
                percentage,
                status,
              };
            })
          );
      })
    ),
  };
});

export const useAllBudgetsStatus = () => {
  return useMemo(() => {
    return withObservables<
      Record<string, never>,
      { budgets: Observable<BudgetModel[]>; totalBudgetStatus: Observable<BudgetStatus> }
    >([], () => {
      const budgetsObservable = database
        .get<BudgetModel>('budgets')
        .query(Q.where('isActive', true))
        .observe();

      const totalStatusObservable = budgetsObservable.pipe(
        map((budgets) => {
          if (budgets.length === 0) {
            return {
              spent: 0,
              remaining: 0,
              percentage: 0,
              status: 'ok' as const,
            };
          }

          let totalBudget = 0;
          const totalSpent = 0;

          budgets.forEach((budget) => {
            totalBudget += budget.amount;
          });

          const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
          const remaining = totalBudget - totalSpent;

          const status =
            percentage >= 100
              ? ('exceeded' as const)
              : percentage >= 90
                ? ('warning' as const)
                : ('ok' as const);

          return {
            spent: totalSpent,
            remaining,
            percentage,
            status,
          };
        })
      );

      return {
        budgets: budgetsObservable,
        totalBudgetStatus: totalStatusObservable,
      };
    });
  }, []);
};
