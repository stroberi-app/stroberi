import { Q } from '@nozbe/watermelondb';
import type { TripModel } from '../trip-model';
import { database } from '../index';
import type { TransactionModel } from '../transaction-model';
import { findRecordOrThrow, logAndRethrow } from './shared';

export type CreateTripPayload = {
  name: string;
  icon: string;
  currencyCode?: string | null;
  startDate: Date;
  endDate?: Date | null;
};

export type TripSpendingSummary = {
  trip: TripModel;
  totalSpent: number;
  totalIncome: number;
  netAmount: number;
  transactionCount: number;
  currencyCode: string | null;
};

export const ACTIVE_TRIP_GRACE_PERIOD_MS = 60_000;

export const isTripActiveAt = (
  trip: Pick<TripModel, 'isArchived' | 'startDate' | 'endDate'>,
  referenceTime = Date.now()
) => {
  if (trip.isArchived) {
    return false;
  }

  return (
    trip.startDate.getTime() <= referenceTime &&
    (trip.endDate === null || trip.endDate.getTime() > referenceTime)
  );
};

export const buildActiveTripFilterClauses = (referenceTime = Date.now()) => {
  const activeTripReferenceTime = referenceTime + ACTIVE_TRIP_GRACE_PERIOD_MS;

  return [
    Q.where('isArchived', false),
    Q.where('startDate', Q.lte(activeTripReferenceTime)),
    Q.or(
      Q.where('endDate', Q.eq(null)),
      Q.where('endDate', Q.gt(activeTripReferenceTime))
    ),
  ];
};

export const createTrip = async ({
  name,
  icon,
  currencyCode,
  startDate,
  endDate,
}: CreateTripPayload): Promise<TripModel> => {
  try {
    return await database.write(async () => {
      const collection = database.get<TripModel>('trips');

      return collection.create((trip) => {
        trip.name = name;
        trip.icon = icon;
        trip.currencyCode = currencyCode || null;
        trip.startDate = startDate;
        trip.endDate = endDate || null;
        trip.isArchived = false;
      });
    });
  } catch (error) {
    return logAndRethrow('Failed to create trip:', error, 'Failed to create trip');
  }
};

export const updateTrip = async ({
  id,
  name,
  icon,
  currencyCode,
  startDate,
  endDate,
}: {
  id: string;
} & CreateTripPayload): Promise<TripModel> => {
  try {
    return await database.write(async () => {
      const collection = database.get<TripModel>('trips');
      const trip = await findRecordOrThrow(collection, id, 'Trip');

      return trip.update((record) => {
        record.name = name;
        record.icon = icon;
        record.currencyCode = currencyCode || null;
        record.startDate = startDate;
        record.endDate = endDate || null;
      });
    });
  } catch (error) {
    return logAndRethrow('Failed to update trip:', error, 'Failed to update trip');
  }
};

export const deleteTrip = async (tripId: string): Promise<TripModel> => {
  try {
    return await database.write(async () => {
      const collection = database.get<TripModel>('trips');
      const trip = await findRecordOrThrow(collection, tripId, 'Trip');
      const linkedTransactionCount = await database
        .get<TransactionModel>('transactions')
        .query(Q.where('tripId', tripId))
        .fetchCount();

      if (linkedTransactionCount > 0) {
        throw new Error(
          'This trip still has linked transactions. Archive it instead of deleting it to preserve your transaction history.'
        );
      }

      await trip.markAsDeleted();
      return trip;
    });
  } catch (error) {
    return logAndRethrow('Failed to delete trip:', error, 'Failed to delete trip');
  }
};

export const toggleTripArchive = async (tripId: string): Promise<TripModel> => {
  try {
    return await database.write(async () => {
      const collection = database.get<TripModel>('trips');
      const trip = await findRecordOrThrow(collection, tripId, 'Trip');
      return trip.toggleArchive();
    });
  } catch (error) {
    return logAndRethrow(
      'Failed to toggle trip archive:',
      error,
      'Failed to toggle trip archive'
    );
  }
};

export const getTripSpending = async (tripId: string): Promise<TripSpendingSummary> => {
  try {
    const trip = await database.get<TripModel>('trips').find(tripId);
    const aggregateSql = `select
          count(*) as transactionCount,
          coalesce(sum(case when amountInBaseCurrency < 0 then abs(amountInBaseCurrency) else 0 end), 0) as totalSpent,
          coalesce(sum(case when amountInBaseCurrency > 0 then amountInBaseCurrency else 0 end), 0) as totalIncome
       from transactions
       where tripId = ? and _status != 'deleted'`;
    const params = [tripId];
    const [rawTotals] = (await database
      .get<TransactionModel>('transactions')
      .query(Q.unsafeSqlQuery(aggregateSql, params))
      .unsafeFetchRaw()) as Array<{
      transactionCount: number | string | null;
      totalSpent: number | string | null;
      totalIncome: number | string | null;
    }>;
    const totalSpent = Number(rawTotals?.totalSpent ?? 0);
    const totalIncome = Number(rawTotals?.totalIncome ?? 0);
    const transactionCount = Number(rawTotals?.transactionCount ?? 0);

    return {
      trip,
      totalSpent,
      totalIncome,
      netAmount: totalIncome - totalSpent,
      transactionCount,
      currencyCode: null,
    };
  } catch (error) {
    return logAndRethrow(
      'Failed to get trip spending:',
      error,
      'Failed to get trip spending'
    );
  }
};

export const getActiveTrips = async (): Promise<TripModel[]> => {
  try {
    return await database
      .get<TripModel>('trips')
      .query(...buildActiveTripFilterClauses())
      .fetch();
  } catch (error) {
    return logAndRethrow(
      'Failed to get active trips:',
      error,
      'Failed to get active trips'
    );
  }
};

export const getMostRecentActiveTrip = async (): Promise<TripModel | null> => {
  try {
    const [trip] = await database
      .get<TripModel>('trips')
      .query(
        ...buildActiveTripFilterClauses(),
        Q.sortBy('startDate', Q.desc),
        Q.take(1)
      )
      .fetch();

    return trip ?? null;
  } catch (error) {
    return logAndRethrow(
      'Failed to get most recent active trip:',
      error,
      'Failed to get most recent active trip'
    );
  }
};
