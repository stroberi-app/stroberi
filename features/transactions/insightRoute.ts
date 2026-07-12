type RouteParam = string | string[] | undefined;

export type TransactionInsightRouteParams = {
  insightAction?: RouteParam;
  categoryId?: RouteParam;
  merchant?: RouteParam;
  uncategorized?: RouteParam;
  maxExpenseAmount?: RouteParam;
  fromDate?: RouteParam;
  toDate?: RouteParam;
};

export type TransactionInsightContext = {
  categoryId?: string;
  merchant?: string;
  uncategorized: boolean;
  maxExpenseAmount?: number;
  dateRange?: [Date, Date];
};

const firstValue = (value: RouteParam) => {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
};

const positiveNumber = (value: RouteParam) => {
  const parsed = Number(firstValue(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const dateRange = (fromValue: RouteParam, toValue: RouteParam) => {
  const fromTime = Number(firstValue(fromValue));
  const toTime = Number(firstValue(toValue));

  if (!Number.isFinite(fromTime) || !Number.isFinite(toTime) || fromTime > toTime) {
    return undefined;
  }

  return [new Date(fromTime), new Date(toTime)] as [Date, Date];
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
  const maxExpenseAmount = positiveNumber(params.maxExpenseAmount);
  const parsedDateRange = dateRange(params.fromDate, params.toDate);

  return {
    ...(categoryId ? { categoryId } : {}),
    ...(merchant ? { merchant } : {}),
    ...(maxExpenseAmount ? { maxExpenseAmount } : {}),
    ...(parsedDateRange ? { dateRange: parsedDateRange } : {}),
    uncategorized: false,
  };
};
