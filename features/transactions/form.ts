import type { PlatformOSType } from 'react-native';
import type { CreateTransactionPayload } from '../../database/actions/transactions';
import type { CategoryModel } from '../../database/category-model';
import type { TripModel } from '../../database/trip-model';

type TransactionType = 'expense' | 'income';

type TransactionRouteParams = Record<string, string | string[] | undefined>;

export type ParsedTransactionRouteParams = {
  transactionId: string | null;
  transactionType: TransactionType | undefined;
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
  };
};

/** New expenses start with a minus sign so the amount is entered as negative. */
export const getInitialTransactionAmount = (
  transactionType: TransactionType | undefined
) => (transactionType === 'expense' ? '-' : '');

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

/**
 * Only new transactions autofocus the amount (never on Android). Edits are
 * detected from the route's id because the transaction loads after mount.
 */
export const shouldFocusTransactionAmountInput = ({
  platform,
  transactionId,
}: {
  platform: PlatformOSType;
  transactionId: string | null;
}) => {
  return platform !== 'android' && !transactionId;
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
