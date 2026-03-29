import { withObservables } from '@nozbe/watermelondb/react';
import { Calendar } from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Text, View } from 'tamagui';
import type { TransactionModel } from '../database/transaction-model';
import type { TripModel } from '../database/trip-model';
import { useDefaultCurrency } from '../hooks/useDefaultCurrency';
import { formatCurrency } from '../lib/format';

type TripItemProps = {
  trip: TripModel;
  transactions: TransactionModel[];
  onPress: (trip: TripModel) => void;
  onEdit: (trip: TripModel) => void;
};

const TripItemInner = ({ trip, transactions, onPress, onEdit }: TripItemProps) => {
  const { defaultCurrency } = useDefaultCurrency();
  const scale = useSharedValue(1);

  // Calculate spending reactively from observed transactions
  const useTripCurrency = !!trip.currencyCode;
  let totalSpent = 0;

  if (useTripCurrency) {
    const tripCurrencyTransactions = transactions.filter(
      (tx) => tx.currencyCode === trip.currencyCode
    );
    totalSpent = tripCurrencyTransactions
      .filter((tx) => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  } else {
    totalSpent = transactions
      .filter((tx) => tx.amountInBaseCurrency < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amountInBaseCurrency), 0);
  }

  const transactionCount = transactions.length;
  const displayCurrency = trip.currencyCode || defaultCurrency || 'USD';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const formatDateRange = () => {
    const start = dayjs(trip.startDate).format('MMM D');
    if (trip.endDate) {
      const end = dayjs(trip.endDate).format('MMM D, YYYY');
      return `${start} - ${end}`;
    }
    return `${start} - Ongoing`;
  };

  return (
    <Pressable
      onPress={() => onPress(trip)}
      onLongPress={() => onEdit(trip)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={animatedStyle}>
        <View
          backgroundColor="$gray3"
          borderRadius="$4"
          padding="$4"
          marginBottom="$2"
          borderWidth={1}
          borderColor="$gray5"
        >
          <View flexDirection="row" alignItems="center" justifyContent="space-between">
            <View flexDirection="row" alignItems="center" gap="$3" flex={1}>
              <View
                backgroundColor="$gray4"
                borderRadius="$2"
                width={48}
                height={48}
                justifyContent="center"
                alignItems="center"
              >
                <Text fontSize={28}>{trip.icon}</Text>
              </View>
              <View flex={1}>
                <Text fontSize="$5" fontWeight="bold" color="white" numberOfLines={1}>
                  {trip.name}
                </Text>
                <View flexDirection="row" alignItems="center" gap="$1">
                  <Calendar size={12} color="$gray10" />
                  <Text fontSize="$2" color="$gray10">
                    {formatDateRange()}
                  </Text>
                </View>
              </View>
            </View>

            <View alignItems="flex-end">
              <Text fontSize="$5" fontWeight="bold" color="$stroberi">
                {formatCurrency(totalSpent, displayCurrency)}
              </Text>
              <Text fontSize="$2" color="$gray10">
                {transactionCount} transactions
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const enhance = withObservables(['trip'], ({ trip }: { trip: TripModel }) => ({
  trip: trip.observe(),
  transactions: trip.transactions.observe(),
}));

export const TripItem = enhance(TripItemInner);
