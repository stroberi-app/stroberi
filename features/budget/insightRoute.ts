import { firstParam } from '../../lib/routeParams';

type RouteParam = string | string[] | undefined;

export type BudgetInsightRouteParams = {
  openCreate?: RouteParam;
  categoryId?: RouteParam;
};

export type BudgetInsightContext = {
  categoryId?: string;
};

const firstValue = (value: RouteParam) => firstParam(value)?.trim() || undefined;

export const parseBudgetInsightRoute = (
  params: BudgetInsightRouteParams
): BudgetInsightContext | null => {
  if (firstValue(params.openCreate) !== '1') {
    return null;
  }

  const categoryId = firstValue(params.categoryId);
  return categoryId ? { categoryId } : {};
};
