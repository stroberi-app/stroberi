import type { CreateTransactionPayload } from '../../database/actions/transactions';
import type { CategoryModel } from '../../database/category-model';
import type { TransactionModel } from '../../database/transaction-model';
import type { TripModel } from '../../database/trip-model';

type TransactionType = 'expense' | 'income';

type TransactionRouteParams = Record<string, string | string[] | undefined>;

export type ParsedTransactionRouteParams = {
  legacyCategory: CategoryModel | null;
  legacyTransaction: TransactionModel | null;
  transactionId: string | null;
  transactionType: TransactionType | undefined;
};

const parseSerializedParam = <T>(value: string | string[] | undefined) => {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const parseTransactionRouteParams = (
  params: TransactionRouteParams
): ParsedTransactionRouteParams => {
  const transactionType =
    params.transactionType === 'expense' || params.transactionType === 'income'
      ? params.transactionType
      : undefined;

  return {
    transactionType,
    transactionId: typeof params.transactionId === 'string' ? params.transactionId : null,
    legacyTransaction: parseSerializedParam<TransactionModel>(params.transaction),
    legacyCategory: parseSerializedParam<CategoryModel>(params.category),
  };
};

export const getInitialTransactionAmount = (
  transactionType: TransactionType | undefined,
  transaction: TransactionModel | null
) => {
  const prefix = transactionType ? (transactionType === 'expense' ? '-' : '') : '';
  return `${prefix}${transaction?.amount ?? ''}`;
};

export const getDefaultSelectedCurrency = (
  transaction: TransactionModel | null,
  defaultCurrency?: string | null
) => {
  return transaction?.currencyCode ?? defaultCurrency ?? 'USD';
};

export const getAmountValidationMessage = (
  amount: string,
  validationError: string | null
) => {
  if (validationError) {
    return validationError;
  }

  const amountValue = Number(amount);
  if (!amount || !Number.isFinite(amountValue) || amountValue === 0) {
    return 'Please enter a valid amount';
  }

  return null;
};

export const shouldAutoPopulateActiveTrip = ({
  transaction,
  transactionId,
  tripsEnabled,
}: {
  transaction: TransactionModel | null;
  transactionId: string | null;
  tripsEnabled: boolean;
}) => {
  return !transaction && !transactionId && tripsEnabled;
};

export const buildTransactionPayload = ({
  merchant,
  amount,
  selectedCategory,
  date,
  currencyCode,
  note,
  baseCurrency,
  selectedTrip,
  allowMissingRate,
}: {
  merchant: string;
  amount: number;
  selectedCategory: CategoryModel | null;
  date: Date;
  currencyCode: string;
  note: string;
  baseCurrency: string;
  selectedTrip: TripModel | null;
  allowMissingRate: boolean;
}): CreateTransactionPayload => {
  return {
    merchant,
    amount,
    categoryId: selectedCategory?.id ?? null,
    date,
    currencyCode,
    note,
    baseCurrency,
    tripId: selectedTrip?.id ?? null,
    allowMissingRate,
  };
};
