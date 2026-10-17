import type { Database } from '@nozbe/watermelondb';
import { useEffect, useMemo, useState } from 'react';
import type { BudgetPeriod } from '../../database/budget-model';
import { evaluateBudget, getBudgetProgressColor } from '../../lib/budgetUtils';
import { formatCurrency } from '../../lib/format';
import { type BudgetSpend, observeBudgetSpend } from './observeBudgetSpend';

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
 * Subscribes to the spend backing a budget period (and the previous period
 * when rollover is enabled) and derives the live status preview shown while
 * editing a budget.
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
  const [spend, setSpend] = useState<BudgetSpend>({ spent: 0 });

  useEffect(() => {
    const subscription = observeBudgetSpend(database, {
      period,
      startDate,
      rollover,
      categoryIds: selectedCategoryIds,
    }).subscribe(setSpend);

    return () => subscription.unsubscribe();
  }, [database, period, rollover, selectedCategoryIds, startDate]);

  const budgetPreview = useMemo(
    () =>
      parsedAmount
        ? evaluateBudget(
            { amount: parsedAmount, rollover, alertThreshold },
            spend.spent,
            spend.previousSpent
          )
        : null,
    [alertThreshold, parsedAmount, rollover, spend]
  );

  if (!budgetPreview) {
    return {
      budgetPreview,
      previewColor: '$gray8',
      previewTitle: 'Enter an amount',
      previewMessage: 'Add a valid budget amount to see the live status preview.',
    };
  }

  const previewCopy = {
    exceeded: {
      title: 'Budget exceeded',
      message: `${formatCurrency(budgetPreview.spent - budgetPreview.budgetLimit, currency)} over the current limit.`,
    },
    warning: {
      title: 'Approaching limit',
      message: `Current spending is close to the ${alertThreshold}% warning threshold.`,
    },
    ok: {
      title: 'On track',
      message: `${formatCurrency(budgetPreview.remaining, currency)} still available in this period.`,
    },
  }[budgetPreview.status];

  return {
    budgetPreview,
    previewColor: getBudgetProgressColor(budgetPreview.percentage, alertThreshold),
    previewTitle: previewCopy.title,
    previewMessage: previewCopy.message,
  };
};
