type RouteParam = string | string[] | undefined;

export type TransactionInsightRouteParams = {
  insightAction?: RouteParam;
  categoryId?: RouteParam;
  merchant?: RouteParam;
  uncategorized?: RouteParam;
};

export type TransactionInsightContext = {
  categoryId?: string;
  merchant?: string;
  uncategorized: boolean;
};

const firstValue = (value: RouteParam) => {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
};

export const parseTransactionInsightRoute = (
  params: TransactionInsightRouteParams
): TransactionInsightContext | null => {
  if (firstValue(params.insightAction) !== '1') {
    return null;
  }

  if (firstValue(params.uncategorized) === '1') {
    return { uncategorized: true };
  }

  const categoryId = firstValue(params.categoryId);
  const merchant = firstValue(params.merchant);

  return {
    ...(categoryId ? { categoryId } : {}),
    ...(merchant ? { merchant } : {}),
    uncategorized: false,
  };
};
