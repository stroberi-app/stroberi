import { formatCurrency } from '../../lib/format';
import type { SafeToSpendSummary, WeeklyRecap } from '../../lib/insights';

export const INSIGHTS_CARD_GAP = '$4';

export const getInsightInboxEmptyState = () => ({
  title: 'No insights yet',
  body: 'Add a few more categorized transactions and Stroberi will surface spending leaks, trend changes, and wins here.',
});

export const getWeeklyRecapDisplayState = (recap: WeeklyRecap) => {
  const isEmpty = recap.totalSpent === 0 && recap.previousWeekSpent === 0;

  if (isEmpty) {
    return {
      isEmpty: true,
      title: 'Nothing to recap yet',
      summary:
        'This week is still waiting for transactions. Add spending as it happens and your private recap will appear here.',
    };
  }

  return {
    isEmpty: false,
    title: 'Weekly Recap',
    summary: recap.summary,
  };
};

export const getSafeToSpendDisplayText = (
  safeToSpend: SafeToSpendSummary,
  currency: string
) => {
  if (safeToSpend.status === 'unknown') {
    return 'Add income first';
  }

  return `${formatCurrency(safeToSpend.dailyAmount, currency)}/day`;
};

export const getSafeToSpendExplanation = (safeToSpend: SafeToSpendSummary) => {
  if (safeToSpend.status === 'unknown') {
    return 'Record income and a few expenses to calculate a local safe-to-spend amount.';
  }

  return safeToSpend.explanation;
};
