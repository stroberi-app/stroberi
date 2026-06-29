import { TrendingUp } from '@tamagui/lucide-icons';
import { Separator, Text, View } from 'tamagui';
import type { useAnalyticsOverview } from '../../hooks/useAnalyticsOverview';
import { buildCategoryColorMap } from '../../lib/chartColors';
import { formatCurrency } from '../../lib/format';
import { CategoryDonutChart, type DonutDatum } from '../charts/CategoryDonutChart';
import { SectionCard } from './SectionCard';

type Overview = ReturnType<typeof useAnalyticsOverview>;

type SpendingHotspotsCardProps = Pick<
  Overview,
  'categoryHotspots' | 'potentialMonthlySavings' | 'currency'
>;

export const SpendingHotspotsCard = ({
  categoryHotspots,
  potentialMonthlySavings,
  currency,
}: SpendingHotspotsCardProps) => {
  const donutSource = categoryHotspots
    .filter((item) => item.currentSpend > 0)
    .slice(0, 6);
  const colorMap = buildCategoryColorMap(donutSource.map((item) => item.categoryId));
  const donutData: Array<DonutDatum & { id: string }> = donutSource.map((item) => ({
    id: item.categoryId,
    label: item.categoryName,
    value: item.currentSpend,
    color: colorMap[item.categoryId],
  }));
  const donutTotal = donutData.reduce((sum, item) => sum + item.value, 0);

  return (
    <SectionCard>
      <View
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        marginBottom="$3"
      >
        <View flexDirection="row" alignItems="center" gap="$2">
          <TrendingUp size={16} color="$stroberi" />
          <Text fontSize="$5" fontWeight="bold" color="white">
            Spending Hotspots
          </Text>
        </View>
        <Text fontSize="$2" color="$gray10">
          Save up to {formatCurrency(potentialMonthlySavings, currency)}
        </Text>
      </View>

      {donutData.length > 1 && (
        <View
          flexDirection="row"
          alignItems="center"
          gap="$3"
          marginBottom="$4"
          paddingVertical="$2"
        >
          <CategoryDonutChart data={donutData} size={132}>
            <View alignItems="center">
              <Text fontSize="$1" color="$gray10">
                Top {donutData.length}
              </Text>
              <Text fontSize="$4" fontWeight="bold" color="white">
                {formatCurrency(donutTotal, currency)}
              </Text>
            </View>
          </CategoryDonutChart>
          <View flex={1} gap="$1.5">
            {donutData.map((item) => {
              const pct =
                donutTotal > 0 ? Math.round((item.value / donutTotal) * 100) : 0;
              return (
                <View key={item.id} flexDirection="row" alignItems="center" gap="$2">
                  <View
                    width={10}
                    height={10}
                    borderRadius={3}
                    backgroundColor={item.color}
                  />
                  <Text fontSize="$2" color="white" flex={1} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text fontSize="$2" color="$gray10" fontWeight="600">
                    {pct}%
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {categoryHotspots.slice(0, 5).map((item, index) => (
        <View key={item.categoryId}>
          {index > 0 && <Separator marginVertical="$3" borderColor="$gray5" />}
          <View
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            marginBottom="$1.5"
          >
            <Text fontSize="$3" color="white" fontWeight="600" flex={1} numberOfLines={1}>
              {item.categoryIcon} {item.categoryName}
            </Text>
            <Text fontSize="$3" color="white" fontWeight="700">
              {formatCurrency(item.currentSpend, currency)}
            </Text>
          </View>
          <View height={7} backgroundColor="$gray5" borderRadius={4} overflow="hidden">
            <View
              height="100%"
              width={`${Math.max(8, Math.min(100, item.share))}%`}
              backgroundColor={item.changePercent > 0 ? '$stroberi' : '$green'}
            />
          </View>
          <View
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            marginTop="$1.5"
          >
            <Text fontSize="$2" color={item.changePercent > 0 ? '$stroberi' : '$green'}>
              {item.changePercent >= 0 ? '+' : ''}
              {Math.round(item.changePercent)}% vs previous
            </Text>
            {item.potentialSavings > 0 && (
              <Text fontSize="$2" color="$yellow">
                Opportunity: {formatCurrency(item.potentialSavings, currency)}
              </Text>
            )}
          </View>
        </View>
      ))}
    </SectionCard>
  );
};
