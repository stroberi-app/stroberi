type RouteParam = string | string[] | undefined;

export type BudgetInsightRouteParams = {
  openCreate?: RouteParam;
  categoryId?: RouteParam;
};

export type BudgetInsightContext = {
  categoryId?: string;
};

const firstValue = (value: RouteParam) => {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
};

export const parseBudgetInsightRoute = (
  params: BudgetInsightRouteParams
): BudgetInsightContext | null => {
  if (firstValue(params.openCreate) !== '1') {
    return null;
  }

  const categoryId = firstValue(params.categoryId);
  return categoryId ? { categoryId } : {};
};
