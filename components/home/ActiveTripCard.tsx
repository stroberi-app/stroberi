import { type Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { Plane } from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { from, type Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Text, View } from 'tamagui';
import { getTripSpending } from '../../database/helpers';
import type { TripModel } from '../../database/trip-model';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { useTripsEnabled } from '../../hooks/useTripsEnabled';
import { formatCurrency } from '../../lib/format';
import { useRouter } from 'expo-router';

type ActiveTripCardProps = {
  activeTrips: TripModel[];
};

const ActiveTripCard = ({ activeTrips }: ActiveTripCardProps) => {
  const { defaultCurrency } = useDefaultCurrency();
  const { tripsEnabled } = useTripsEnabled();
  const router = useRouter();
  const [spending, setSpending] = useState<{
    totalSpent: number;
    transactionCount: number;
    currencyCode: string | null;
  } | null>(null);

  const activeTrip = activeTrips[0]; // Show the first/most recent active trip

  useEffect(() => {
    if (activeTrip) {
      const loadSpending = async () => {
        try {
          const result = await getTripSpending(activeTrip.id);
          setSpending({
            totalSpent: result.totalSpent,
            transactionCount: result.transactionCount,
            currencyCode: result.currencyCode,
          });
        } catch (error) {
          console.error('Failed to load trip spending:', error);
        }
      };
      loadSpending();
    }
  }, [activeTrip?.id]);

  if (!tripsEnabled || !activeTrip) {
    return null;
  }

  const daysRemaining = activeTrip.endDate
    ? dayjs(activeTrip.endDate).diff(dayjs(), 'day')
    : null;

  const handlePress = () => {
    router.push('/(tabs)/trips');
  };

  return (
    <Pressable onPress={handlePress}>
      <View
        backgroundColor="$gray3"
        borderWidth={1}
        borderColor="$green"
        padding="$3"
        borderRadius="$4"
        marginBottom="$3"
        marginHorizontal="$2"
      >
        <View flexDirection="row" alignItems="center" justifyContent="space-between">
          <View flexDirection="row" alignItems="center" gap="$2" flex={1}>
            <View
              backgroundColor="$green"
              borderRadius="$2"
              width={36}
              height={36}
              justifyContent="center"
              alignItems="center"
            >
              <Text fontSize={20}>{activeTrip.icon}</Text>
            </View>
            <View flex={1}>
              <View flexDirection="row" alignItems="center" gap="$2">
                <Plane size={14} color="$green" />
                <Text fontSize="$2" color="$green" fontWeight="600">
                  Active Trip
                </Text>
              </View>
              <Text fontSize="$4" fontWeight="bold" color="white" numberOfLines={1}>
                {activeTrip.name}
              </Text>
            </View>
          </View>

          <View alignItems="flex-end">
            <Text fontSize="$4" fontWeight="bold" color="$stroberi">
              {formatCurrency(
                spending?.totalSpent ?? 0,
                spending?.currencyCode || defaultCurrency || 'USD'
              )}
            </Text>
            <Text fontSize="$1" color="$gray10">
              {spending?.transactionCount ?? 0} expenses
            </Text>
          </View>
        </View>

        {daysRemaining !== null && daysRemaining >= 0 && (
          <View marginTop="$2" backgroundColor="$gray4" padding="$2" borderRadius="$2">
            <Text fontSize="$2" color="$gray10" textAlign="center">
              {daysRemaining === 0
                ? 'Last day!'
                : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const enhance = withObservables<
  { database: Database },
  { activeTrips: Observable<TripModel[]> }
>(['database'], ({ database }) => {
  // Use a timestamp slightly in the future to ensure trips marked
  // as "finished now" are immediately excluded
  const now = Date.now() + 60000; // Add 1 minute buffer

  return {
    activeTrips: database
      .get<TripModel>('trips')
      .query(
        Q.where('isArchived', false),
        Q.or(Q.where('endDate', Q.eq(null)), Q.where('endDate', Q.gt(now))),
        Q.sortBy('startDate', Q.desc)
      )
      .observe(),
  };
});

export default enhance(ActiveTripCard);
