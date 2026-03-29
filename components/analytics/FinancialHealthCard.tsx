import { Heart, Lightbulb } from '@tamagui/lucide-icons';
import { Text, View } from 'tamagui';
import type { FinancialHealthScore } from '../../lib/advancedAnalytics';
import { AnalyticsCard, ProgressBar } from './AnalyticsCard';

type FinancialHealthCardProps = {
  score: FinancialHealthScore;
};

export const FinancialHealthCard = ({ score }: FinancialHealthCardProps) => {
  const getGradeConfig = () => {
    switch (score.grade) {
      case 'A':
        return { color: '$green', bg: 'rgba(34, 197, 94, 0.2)', label: 'Excellent' };
      case 'B':
        return { color: '$green', bg: 'rgba(34, 197, 94, 0.15)', label: 'Good' };
      case 'C':
        return { color: '$yellow', bg: 'rgba(234, 179, 8, 0.15)', label: 'Fair' };
      case 'D':
        return { color: '$yellow', bg: 'rgba(234, 179, 8, 0.2)', label: 'Needs Work' };
      default:
        return { color: '$stroberi', bg: 'rgba(229, 75, 75, 0.15)', label: 'Critical' };
    }
  };

  const gradeConfig = getGradeConfig();

  const getFactorColor = (factorScore: number) => {
    if (factorScore >= 80) return '$green';
    if (factorScore >= 60) return '$yellow';
    return '$stroberi';
  };

  return (
    <AnalyticsCard
      title="Financial Health Score"
      icon={<Heart size={20} color="#f472b6" />}
      accentColor="#f472b6"
    >
      {/* Main Score Display */}
      <View alignItems="center" marginBottom="$4">
        <View
          width={140}
          height={140}
          borderRadius={70}
          borderWidth={10}
          borderColor="$gray5"
          justifyContent="center"
          alignItems="center"
          position="relative"
          overflow="hidden"
        >
          {/* Score fill indicator */}
          <View
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            height={`${score.overallScore}%`}
            backgroundColor={gradeConfig.bg}
          />
          <View alignItems="center" zIndex={1}>
            <Text fontSize="$10" fontWeight="bold" color={gradeConfig.color}>
              {score.grade}
            </Text>
            <Text fontSize="$5" color="white" fontWeight="600">
              {score.overallScore}
            </Text>
            <Text fontSize="$2" color="$gray11">
              out of 100
            </Text>
          </View>
        </View>
        <View
          backgroundColor={gradeConfig.bg}
          paddingHorizontal="$3"
          paddingVertical="$1.5"
          borderRadius="$3"
          marginTop="$3"
        >
          <Text fontSize="$4" fontWeight="bold" color={gradeConfig.color}>
            {gradeConfig.label}
          </Text>
        </View>
      </View>

      {/* Factor Breakdown */}
      <View backgroundColor="$gray4" borderRadius="$3" padding="$3" marginBottom="$3">
        <Text fontSize="$3" fontWeight="bold" color="white" marginBottom="$3">
          Score Breakdown
        </Text>

        {Object.entries(score.factors).map(([key, factor]) => (
          <View key={key} marginBottom="$3">
            <View flexDirection="row" justifyContent="space-between" marginBottom="$1">
              <View flex={1}>
                <Text fontSize="$3" color="white" textTransform="capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </Text>
                <Text fontSize="$2" color="$gray10">
                  {factor.description}
                </Text>
              </View>
              <View alignItems="flex-end">
                <Text
                  fontSize="$4"
                  fontWeight="bold"
                  color={getFactorColor(factor.score)}
                >
                  {factor.score}
                </Text>
                <Text fontSize="$1" color="$gray10">
                  {factor.weight}% weight
                </Text>
              </View>
            </View>
            <ProgressBar
              value={factor.score}
              color={getFactorColor(factor.score)}
              height={6}
            />
          </View>
        ))}
      </View>

      {/* Recommendations */}
      {score.recommendations.length > 0 && (
        <View backgroundColor="$gray4" borderRadius="$3" padding="$3">
          <View flexDirection="row" alignItems="center" gap="$2" marginBottom="$2">
            <Lightbulb size={16} color="$yellow" />
            <Text fontSize="$3" fontWeight="bold" color="white">
              Recommendations
            </Text>
          </View>
          {score.recommendations.map((rec, index) => (
            <View
              key={index}
              flexDirection="row"
              gap="$2"
              paddingVertical="$1.5"
              borderTopWidth={index > 0 ? 1 : 0}
              borderTopColor="$gray5"
            >
              <View
                width={20}
                height={20}
                borderRadius={10}
                backgroundColor="$gray5"
                justifyContent="center"
                alignItems="center"
              >
                <Text fontSize="$1" color="$gray11" fontWeight="bold">
                  {index + 1}
                </Text>
              </View>
              <Text fontSize="$2" color="$gray11" flex={1}>
                {rec}
              </Text>
            </View>
          ))}
        </View>
      )}
    </AnalyticsCard>
  );
};
