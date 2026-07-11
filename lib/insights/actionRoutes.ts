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

export const buildInsightActionRoute = (
  action: InsightAction
): InsightActionRoute | null => {
  switch (action.type) {
    case 'viewTransactions': {
      const categoryId = optionalParam(action.categoryId);
      const merchant = optionalParam(action.merchant);

      return {
        pathname: '/transactions',
        params: {
          insightAction: '1',
          ...(categoryId ? { categoryId } : {}),
          ...(merchant ? { merchant } : {}),
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
