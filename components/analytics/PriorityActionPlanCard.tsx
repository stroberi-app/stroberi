import { Lightbulb } from '@tamagui/lucide-icons';
import { Text, View } from 'tamagui';
import type { useAnalyticsOverview } from '../../hooks/useAnalyticsOverview';
import { getPriorityStyles } from '../../lib/analyticsOverview';
import { SectionCard } from './SectionCard';

type Overview = ReturnType<typeof useAnalyticsOverview>;

type PriorityActionPlanCardProps = Pick<Overview, 'actionPlan'>;

export const PriorityActionPlanCard = ({ actionPlan }: PriorityActionPlanCardProps) => (
  <SectionCard>
    <View flexDirection="row" alignItems="center" justifyContent="space-between">
      <View flexDirection="row" alignItems="center" gap="$2">
        <Lightbulb size={16} color="$yellow" />
        <Text fontSize="$5" fontWeight="bold" color="white">
          Priority Action Plan
        </Text>
      </View>
      <Text fontSize="$2" color="$gray10">
        Focus on these first
      </Text>
    </View>

    <View marginTop="$3" gap="$2">
      {actionPlan.map((item) => {
        const style = getPriorityStyles(item.priority);
        return (
          <View
            key={item.id}
            borderRadius="$3"
            borderWidth={1}
            borderColor={style.borderColor}
            backgroundColor={style.backgroundColor}
            padding="$3"
          >
            <View
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              marginBottom="$1"
            >
              <Text fontSize="$4" fontWeight="700" color="white" flex={1}>
                {item.title}
              </Text>
              <Text fontSize="$1" color={style.textColor}>
                {style.label}
              </Text>
            </View>
            <Text fontSize="$2" color="$gray11">
              {item.description}
            </Text>
            <Text
              fontSize="$2"
              color={style.textColor}
              marginTop="$1.5"
              fontWeight="700"
            >
              {item.impact}
            </Text>
          </View>
        );
      })}
    </View>
  </SectionCard>
);
