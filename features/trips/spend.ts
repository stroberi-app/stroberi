import type { TransactionModel } from '../../database/transaction-model';
import type { TripModel } from '../../database/trip-model';

type TripTransaction = Pick<
  TransactionModel,
  'amount' | 'amountInBaseCurrency' | 'currencyCode'
>;

/**
 * Total spent on a trip. Trips with their own currency are totalled in that
 * currency from the original amounts (other currencies are left out); trips
 * without one are totalled in the base currency.
 */
export const calculateTripSpend = (
  trip: Pick<TripModel, 'currencyCode'>,
  transactions: TripTransaction[]
): number => {
  const amounts = trip.currencyCode
    ? transactions
        .filter((transaction) => transaction.currencyCode === trip.currencyCode)
        .map((transaction) => transaction.amount)
    : transactions.map((transaction) => transaction.amountInBaseCurrency);

  return amounts
    .filter((amount) => amount < 0)
    .reduce((sum, amount) => sum + Math.abs(amount), 0);
};
