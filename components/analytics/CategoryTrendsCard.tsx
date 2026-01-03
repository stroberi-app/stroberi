import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from '@tamagui/lucide-icons';
import { Text, View } from 'tamagui';
import type { CategoryTrendAnalysis } from '../../lib/advancedAnalytics';
import { formatCurrency } from '../../lib/format';
import { AnalyticsCard } from './AnalyticsCard';

// Custom badge for spending trends - inverted colors since less spending is good
type SpendingTrendBadgeProps = {
  trend: 'growing' | 'shrinking' | 'stable';
  change: number;
};

const SpendingTrendBadge = ({ trend, change }: SpendingTrendBadgeProps) => {
  const getConfig = () => {
    switch (trend) {
      case 'shrinking':
        // Spending less is GOOD - show green
        return { icon: '↓', color: '$green', bg: 'rgba(34, 197, 94, 0.15)' };
      case 'growing':
        // Spending more is BAD - show red
        return { icon: '↑', color: '$stroberi', bg: 'rgba(229, 75, 75, 0.15)' };
      default:
        return { icon: '→', color: '$gray11', bg: 'rgba(255, 255, 255, 0.1)' };
    }
  };

  const config = getConfig();
  const label = `${change > 0 ? '+' : ''}${change}% `;

  return (
    <View
      flexDirection="row"
      alignItems="center"
      gap="$1"
      backgroundColor={config.bg}
      paddingHorizontal="$2"
      paddingVertical="$1"
      borderRadius="$2"
    >
      <Text fontSize="$2" color={config.color}>
        {config.icon}
      </Text>
      <Text fontSize="$2" color={config.color} fontWeight="600">
        {label}
      </Text>
    </View>
  );
};

type CategoryTrendsCardProps = {
  analysis: CategoryTrendAnalysis;
  currency: string;
};

export const CategoryTrendsCard = ({ analysis, currency }: CategoryTrendsCardProps) => {
  const growingCategories = analysis.trends.filter((t) => t.trend === 'growing');
  const shrinkingCategories = analysis.trends.filter((t) => t.trend === 'shrinking');

  return (
    <AnalyticsCard
      title="Category Trends"
      icon={<BarChart3 size={20} color="#818cf8" />}
      accentColor="#818cf8"
    >
      {/* Unusual Spending Alerts */}
      {analysis.unusualSpending.length > 0 && (
        <View
          backgroundColor="rgba(229, 75, 75, 0.15)"
          padding="$3"
          borderRadius="$3"
          marginBottom="$3"
        >
          <View flexDirection="row" alignItems="center" gap="$2" marginBottom="$2">
            <AlertTriangle size={16} color="$stroberi" />
            <Text fontSize="$3" fontWeight="bold" color="$stroberi">
              Unusual Spending Detected
            </Text>
          </View>
          {analysis.unusualSpending.slice(0, 2).map((item) => (
            <View
              key={item.categoryId}
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
              paddingVertical="$1"
            >
              <Text fontSize="$3" color="white">
                {item.categoryName}
              </Text>
              <View
                backgroundColor="$stroberi"
                paddingHorizontal="$2"
                paddingVertical="$0.5"
                borderRadius="$2"
              >
                <Text fontSize="$2" color="white" fontWeight="bold">
                  +{item.percentageAbove}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Trend Summary */}
      <View flexDirection="row" gap="$3" marginBottom="$3">
        <View
          flex={1}
          backgroundColor="rgba(229, 75, 75, 0.1)"
          padding="$3"
          borderRadius="$3"
          alignItems="center"
        >
          <TrendingUp size={20} color="$stroberi" />
          <Text fontSize="$6" fontWeight="bold" color="$stroberi" marginTop="$1">
            {growingCategories.length}
          </Text>
          <Text fontSize="$2" color="$gray11">
            Spending More
          </Text>
        </View>
        <View
          flex={1}
          backgroundColor="rgba(34, 197, 94, 0.1)"
          padding="$3"
          borderRadius="$3"
          alignItems="center"
        >
          <TrendingDown size={20} color="$green" />
          <Text fontSize="$6" fontWeight="bold" color="$green" marginTop="$1">
            {shrinkingCategories.length}
          </Text>
          <Text fontSize="$2" color="$gray11">
            Spending Less
          </Text>
        </View>
      </View>

      {/* Category List */}
      <View backgroundColor="$gray4" borderRadius="$3" overflow="hidden">
        <View
          flexDirection="row"
          paddingHorizontal="$3"
          paddingVertical="$2"
          backgroundColor="$gray5"
        >
          <Text fontSize="$2" color="$gray11" flex={2}>
            Category
          </Text>
          <Text fontSize="$2" color="$gray11" flex={1} textAlign="right">
            Current
          </Text>
          <Text fontSize="$2" color="$gray11" flex={1} textAlign="right">
            Change
          </Text>
        </View>
        {analysis.trends.slice(0, 6).map((trend, index) => (
          <View
            key={trend.categoryId}
            flexDirection="row"
            paddingHorizontal="$3"
            paddingVertical="$2.5"
            borderTopWidth={index > 0 ? 1 : 0}
            borderTopColor="$gray5"
            alignItems="center"
            pressStyle={{ backgroundColor: '$gray6' }}
            onPress={() => {
              // TODO: Implement drill down
              console.log('Drill down into', trend.categoryName);
            }}
          >
            <View flex={2} flexDirection="row" alignItems="center" gap="$2">
              <Text fontSize="$3" color="white" numberOfLines={1}>
                {trend.categoryName}
              </Text>
            </View>
            <Text fontSize="$3" color="white" flex={1} textAlign="right" fontWeight="600">
              {formatCurrency(trend.currentPeriod, currency)}
            </Text>
            <View flex={1} alignItems="flex-end">
              <SpendingTrendBadge trend={trend.trend} change={trend.change} />
            </View>
            <ChevronRight size={16} color="$gray10" marginLeft="$2" />
          </View>
        ))}
      </View>

      {/* More categories indicator */}
      {analysis.trends.length > 6 && (
        <View alignItems="center" marginTop="$2">
          <Text fontSize="$2" color="$gray10">
            +{analysis.trends.length - 6} more categories
          </Text>
        </View>
      )}
    </AnalyticsCard>
  );
};
