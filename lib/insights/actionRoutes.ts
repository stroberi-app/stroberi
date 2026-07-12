import type { InsightAction } from './types';

export type InsightActionRoute =
  | {
      pathname: '/transactions';
      params: Record<string, string>;
    }
  | {
      pathname: '/budgets';
      params: Record<string, string>;
    };

const optionalParam = (value: string | undefined) => value?.trim() || undefined;

const optionalPositiveNumber = (value: number | undefined) =>
  value !== undefined && Number.isFinite(value) && value > 0 ? String(value) : undefined;

const optionalDateRange = (fromDate: Date | undefined, toDate: Date | undefined) => {
  const fromTime = fromDate?.getTime();
  const toTime = toDate?.getTime();

  if (
    fromTime === undefined ||
    toTime === undefined ||
    !Number.isFinite(fromTime) ||
    !Number.isFinite(toTime) ||
    fromTime > toTime
  ) {
    return undefined;
  }

  return { fromDate: String(fromTime), toDate: String(toTime) };
};

export const buildInsightActionRoute = (
  action: InsightAction
): InsightActionRoute | null => {
  switch (action.type) {
    case 'viewTransactions': {
      const categoryId = optionalParam(action.categoryId);
      const merchant = optionalParam(action.merchant);
      const maxExpenseAmount = optionalPositiveNumber(action.maxExpenseAmount);
      const dateRange = optionalDateRange(action.fromDate, action.toDate);

      return {
        pathname: '/transactions',
        params: {
          insightAction: '1',
          ...(categoryId ? { categoryId } : {}),
          ...(merchant ? { merchant } : {}),
          ...(maxExpenseAmount ? { maxExpenseAmount } : {}),
          ...dateRange,
        },
      };
    }
    case 'fixCategories':
      return {
        pathname: '/transactions',
        params: { insightAction: '1', uncategorized: '1' },
      };
    case 'createBudget': {
      const categoryId = optionalParam(action.categoryId);

      return {
        pathname: '/budgets',
        params: {
          openCreate: '1',
          ...(categoryId ? { categoryId } : {}),
        },
      };
    }
    case 'none':
      return null;
  }
};
