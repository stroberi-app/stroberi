import type { Database } from '@nozbe/watermelondb';
import { useEffect, useMemo, useState } from 'react';
import { combineLatest } from 'rxjs';
import type { BudgetPeriod } from '../../database/budget-model';
import type { TransactionModel } from '../../database/transaction-model';
import {
  buildBudgetTransactionConditions,
  calculateBudgetPeriodDates,
  calculateRollover,
  getBudgetProgressColor,
  sumBudgetTransactions,
} from '../../lib/budgetUtils';
import { formatCurrency } from '../../lib/format';

type UseBudgetPreviewParams = {
  database: Database;
  period: BudgetPeriod;
  startDate: Date;
  rollover: boolean;
  selectedCategoryIds: string[];
  parsedAmount: number | null;
  alertThreshold: number;
  currency: string;
};

/**
 * Subscribes to the transactions backing a budget period (and the previous
 * period when rollover is enabled) and derives the live status preview shown
 * while editing a budget.
 */
export const useBudgetPreview = ({
  database,
  period,
  startDate,
  rollover,
  selectedCategoryIds,
  parsedAmount,
  alertThreshold,
  currency,
}: UseBudgetPreviewParams) => {
  const [currentSpent, setCurrentSpent] = useState(0);
  const [previousSpent, setPreviousSpent] = useState(0);

  useEffect(() => {
    const periodDates = calculateBudgetPeriodDates({ period, startDate });
    const previousPeriodDates = calculateBudgetPeriodDates({ period, startDate }, -1);

    const currentTransactionsObservable = database
      .get<TransactionModel>('transactions')
      .query(
        ...buildBudgetTransactionConditions(
          periodDates.start,
          periodDates.end,
          selectedCategoryIds
        )
      )
      .observeWithColumns(['amountInBaseCurrency', 'categoryId', 'date']);

    if (!rollover) {
      const subscription = currentTransactionsObservable.subscribe((transactions) => {
        setCurrentSpent(sumBudgetTransactions(transactions));
        setPreviousSpent(0);
      });

      return () => subscription.unsubscribe();
    }

    const previousTransactionsObservable = database
      .get<TransactionModel>('transactions')
      .query(
        ...buildBudgetTransactionConditions(
          previousPeriodDates.start,
          previousPeriodDates.end,
          selectedCategoryIds
        )
      )
      .observeWithColumns(['amountInBaseCurrency', 'categoryId', 'date']);

    const subscription = combineLatest([
      currentTransactionsObservable,
      previousTransactionsObservable,
    ]).subscribe(([transactions, previousTransactions]) => {
      setCurrentSpent(sumBudgetTransactions(transactions));
      setPreviousSpent(sumBudgetTransactions(previousTransactions));
    });

    return () => subscription.unsubscribe();
  }, [database, period, rollover, selectedCategoryIds, startDate]);

  const budgetPreview = useMemo(() => {
    if (!parsedAmount) {
      return null;
    }

    const rolloverAmount = calculateRollover(
      { amount: parsedAmount, rollover },
      previousSpent
    );
    const budgetLimit = parsedAmount + rolloverAmount;
    const percentage = budgetLimit > 0 ? (currentSpent / budgetLimit) * 100 : 0;
    const remaining = budgetLimit - currentSpent;
    const status =
      percentage >= 100
        ? ('exceeded' as const)
        : percentage >= alertThreshold
          ? ('warning' as const)
          : ('ok' as const);

    return {
      spent: currentSpent,
      remaining,
      percentage,
      budgetLimit,
      rolloverAmount,
      status,
    };
  }, [alertThreshold, currentSpent, parsedAmount, previousSpent, rollover]);

  const previewColor = budgetPreview
    ? getBudgetProgressColor(budgetPreview.percentage, alertThreshold)
    : '$gray8';

  const previewTitle = budgetPreview
    ? budgetPreview.status === 'exceeded'
      ? 'Budget exceeded'
      : budgetPreview.status === 'warning'
        ? 'Approaching limit'
        : 'On track'
    : 'Enter an amount';

  const previewMessage = budgetPreview
    ? budgetPreview.status === 'exceeded'
      ? `${formatCurrency(budgetPreview.spent - budgetPreview.budgetLimit, currency)} over the current limit.`
      : budgetPreview.status === 'warning'
        ? `Current spending is close to the ${alertThreshold}% warning threshold.`
        : `${formatCurrency(budgetPreview.remaining, currency)} still available in this period.`
    : 'Add a valid budget amount to see the live status preview.';

  return { budgetPreview, previewColor, previewTitle, previewMessage };
};
