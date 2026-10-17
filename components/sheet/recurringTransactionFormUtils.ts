import dayjs from 'dayjs';
import type { CategoryModel } from '../../database/category-model';
import type {
  RecurringFrequency,
  RecurringTransactionModel,
} from '../../database/recurring-transaction-model';
import { FALLBACK_CURRENCY } from '../../lib/format';
import { upcomingOccurrences } from '../../lib/recurrence';

export type RecurringTransactionFormState = {
  amount: string;
  endDate: Date;
  frequency: RecurringFrequency;
  hasEndDate: boolean;
  merchantName: string;
  selectedCategory: CategoryModel | null;
  selectedCurrency: string;
  startDate: Date;
  transactionType: 'expense' | 'income';
};

export const getDefaultRecurringTransactionFormState = (
  defaultCurrency?: string | null
): RecurringTransactionFormState => ({
  amount: '',
  endDate: dayjs().add(1, 'year').toDate(),
  frequency: 'monthly',
  hasEndDate: false,
  merchantName: '',
  selectedCategory: null,
  selectedCurrency: defaultCurrency ?? FALLBACK_CURRENCY,
  startDate: new Date(),
  transactionType: 'expense',
});

export const buildRecurringTransactionFormState = async (
  recurring: RecurringTransactionModel | null | undefined,
  defaultCurrency?: string | null
): Promise<RecurringTransactionFormState> => {
  if (!recurring) {
    return getDefaultRecurringTransactionFormState(defaultCurrency);
  }

  const category = await recurring.category?.fetch();

  return {
    amount: Math.abs(recurring.amount).toString(),
    transactionType: recurring.amount < 0 ? 'expense' : 'income',
    selectedCurrency: recurring.currencyCode,
    frequency: recurring.frequency,
    merchantName: recurring.merchant,
    startDate: recurring.startDate,
    hasEndDate: Boolean(recurring.endDate),
    endDate: recurring.endDate ?? dayjs().add(1, 'year').toDate(),
    selectedCategory: category ?? null,
  };
};

export const validateRecurringTransactionForm = ({
  amount,
  hasEndDate,
  endDate,
  startDate,
}: {
  amount: string;
  hasEndDate: boolean;
  endDate: Date;
  startDate: Date;
}) => {
  const amountValue = Number(amount);

  if (!amount || !Number.isFinite(amountValue) || amountValue === 0) {
    return 'Please enter a valid amount';
  }

  if (hasEndDate && dayjs(endDate).isBefore(dayjs(startDate), 'day')) {
    return 'End date must be on or after the start date';
  }

  return null;
};

export const buildRecurringTransactionPayload = ({
  amount,
  category,
  currencyCode,
  endDate,
  frequency,
  hasEndDate,
  merchantName,
  startDate,
  transactionType,
}: {
  amount: string;
  category: CategoryModel | null;
  currencyCode: string;
  endDate: Date;
  frequency: RecurringFrequency;
  hasEndDate: boolean;
  merchantName: string;
  startDate: Date;
  transactionType: 'expense' | 'income';
}) => {
  const amountValue = Number(amount);
  const finalAmount =
    transactionType === 'expense' ? -Math.abs(amountValue) : Math.abs(amountValue);

  return {
    merchant: merchantName,
    amount: finalAmount,
    categoryId: category?.id ?? null,
    currencyCode,
    note: '',
    frequency,
    startDate,
    endDate: hasEndDate ? endDate : undefined,
  };
};

export const getNextRecurringOccurrences = ({
  endDate,
  frequency,
  hasEndDate,
  startDate,
}: {
  endDate: Date;
  frequency: RecurringFrequency;
  hasEndDate: boolean;
  startDate: Date;
}) =>
  upcomingOccurrences({
    startDate,
    cadence: frequency,
    endDate: hasEndDate ? endDate : null,
    limit: 5,
  });
