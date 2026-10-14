import { Q } from '@nozbe/watermelondb';
import type { TripModel } from '../trip-model';
import { collection, findRecordOrThrow, runAction, runWriteAction } from './shared';

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
};

// Lets a trip created "now" count as active even if its start timestamp lands
// a few seconds after the query runs.
const ACTIVE_TRIP_GRACE_PERIOD_MS = 60_000;

const activeTripClauses = (referenceTime: number) => {
  const activeAt = referenceTime + ACTIVE_TRIP_GRACE_PERIOD_MS;

  return [
    Q.where('isArchived', false),
    Q.where('startDate', Q.lte(activeAt)),
    Q.or(Q.where('endDate', Q.eq(null)), Q.where('endDate', Q.gt(activeAt))),
  ];
};

/** The latest-started trip that is in progress right now, as a live query. */
export const mostRecentActiveTripQuery = (referenceTime = Date.now()) =>
  collection('trips').query(
    ...activeTripClauses(referenceTime),
    Q.sortBy('startDate', Q.desc),
    Q.take(1)
  );

const assignTrip = (record: TripModel, payload: CreateTripPayload) => {
  record.name = payload.name;
  record.icon = payload.icon;
  record.currencyCode = payload.currencyCode || null;
  record.startDate = payload.startDate;
  record.endDate = payload.endDate || null;
};

const findTrip = (id: string) => findRecordOrThrow(collection('trips'), id, 'Trip');

export const createTrip = (payload: CreateTripPayload): Promise<TripModel> =>
  runWriteAction('create trip', () =>
    collection('trips').create((record) => {
      assignTrip(record, payload);
      record.isArchived = false;
    })
  );

export const updateTrip = ({
  id,
  ...payload
}: { id: string } & CreateTripPayload): Promise<TripModel> =>
  runWriteAction('update trip', async () => {
    const trip = await findTrip(id);
    return trip.update((record) => assignTrip(record, payload));
  });

export const deleteTrip = (tripId: string): Promise<TripModel> =>
  runWriteAction('delete trip', async () => {
    const trip = await findTrip(tripId);
    const linkedTransactionCount = await collection('transactions')
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

export const toggleTripArchive = (tripId: string): Promise<TripModel> =>
  runWriteAction('toggle trip archive', async () => {
    const trip = await findTrip(tripId);
    return trip.update((record) => {
      record.isArchived = !record.isArchived;
    });
  });

export const getTripSpending = (tripId: string): Promise<TripSpendingSummary> =>
  runAction('get trip spending', async () => {
    const trip = await collection('trips').find(tripId);
    const [totals] = (await collection('transactions')
      .query(
        Q.unsafeSqlQuery(
          `select
            count(*) as transactionCount,
            coalesce(sum(case when amountInBaseCurrency < 0 then abs(amountInBaseCurrency) else 0 end), 0) as totalSpent,
            coalesce(sum(case when amountInBaseCurrency > 0 then amountInBaseCurrency else 0 end), 0) as totalIncome
          from transactions
          where tripId = ? and _status != 'deleted'`,
          [tripId]
        )
      )
      .unsafeFetchRaw()) as Array<
      Record<'transactionCount' | 'totalSpent' | 'totalIncome', number | string | null>
    >;
    const totalSpent = Number(totals?.totalSpent ?? 0);
    const totalIncome = Number(totals?.totalIncome ?? 0);

    return {
      trip,
      totalSpent,
      totalIncome,
      netAmount: totalIncome - totalSpent,
      transactionCount: Number(totals?.transactionCount ?? 0),
    };
  });

export const getMostRecentActiveTrip = (): Promise<TripModel | null> =>
  runAction('get most recent active trip', async () => {
    const [trip] = await mostRecentActiveTripQuery().fetch();
    return trip ?? null;
  });
