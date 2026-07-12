import { CalendarClock } from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import { Separator, Text, View } from 'tamagui';
import type { useAnalyticsOverview } from '../../hooks/useAnalyticsOverview';
import { formatCurrency } from '../../lib/format';
import { SectionCard } from './SectionCard';

type Overview = ReturnType<typeof useAnalyticsOverview>;

type UpcomingBillsCardProps = Pick<Overview, 'upcomingRecurring' | 'currency'>;

export const UpcomingBillsCard = ({
  upcomingRecurring,
  currency,
}: UpcomingBillsCardProps) => (
  <SectionCard>
    <View
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      marginBottom="$3"
    >
      <View flexDirection="row" alignItems="center" gap="$2">
        <CalendarClock size={16} color="$blue10" />
        <Text fontSize="$5" fontWeight="bold" color="white">
          Upcoming Bills
        </Text>
      </View>
      <Text fontSize="$2" color="$gray10">
        Next 30 days
      </Text>
    </View>

    {upcomingRecurring.length === 0 ? (
      <View
        borderRadius="$3"
        backgroundColor="$gray4"
        padding="$3"
        borderWidth={1}
        borderColor="$gray5"
      >
        <Text fontSize="$3" color="$gray11">
          No recurring expenses detected yet. Add merchant names to improve bill
          predictions.
        </Text>
      </View>
    ) : (
      upcomingRecurring.map((item, index) => {
        const daysUntil = dayjs(item.predictedDate).diff(dayjs(), 'day');
        return (
          <View key={`${item.merchant}-${item.predictedDate.toISOString()}`}>
            {index > 0 && <Separator marginVertical="$2.5" borderColor="$gray5" />}
            <View flexDirection="row" alignItems="center" justifyContent="space-between">
              <View flex={1}>
                <Text fontSize="$3" color="white" fontWeight="600">
                  {item.merchant}
                </Text>
                <Text fontSize="$2" color="$gray10">
                  {daysUntil === 0
                    ? 'Due today'
                    : `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`}
                </Text>
              </View>
              <View alignItems="flex-end">
                <Text fontSize="$3" color="white" fontWeight="700">
                  {formatCurrency(item.amount, currency)}
                </Text>
                <Text fontSize="$1" color="$gray10">
                  {Math.round(item.confidence * 100)}% confidence
                </Text>
              </View>
            </View>
          </View>
        );
      })
    )}
  </SectionCard>
);
