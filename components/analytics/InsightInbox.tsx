import { AlertTriangle, CheckCircle2, Info, Lightbulb } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { Text, View, styled } from 'tamagui';
import type { InsightAction, MoneyInsight } from '../../lib/insights';
import { buildInsightActionRoute } from '../../lib/insights/actionRoutes';
import { LinkButton } from '../button/LinkButton';
import { getInsightInboxEmptyState } from './emptyStates';

type InsightInboxProps = {
  insights: MoneyInsight[];
};

export const InsightInbox = ({ insights }: InsightInboxProps) => {
  if (insights.length === 0) {
    const emptyState = getInsightInboxEmptyState();

    return (
      <SectionCard>
        <View flexDirection="row" alignItems="center" gap="$2">
          <Lightbulb size={20} color="$yellow" />
          <Text fontSize="$5" fontWeight="bold" color="white">
            Insight Inbox
          </Text>
        </View>
        <EmptyPanel marginTop="$3">
          <Text fontSize="$4" fontWeight="700" color="white">
            {emptyState.title}
          </Text>
          <Text fontSize="$3" color="$gray10" marginTop="$1">
            {emptyState.body}
          </Text>
        </EmptyPanel>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <Text fontSize="$5" fontWeight="bold" color="white">
        Insight Inbox
      </Text>
      <View gap="$3" marginTop="$3">
        {insights.map((insight) => (
          <InsightRow key={insight.id} insight={insight} />
        ))}
      </View>
    </SectionCard>
  );
};

const InsightRow = ({ insight }: { insight: MoneyInsight }) => {
  const router = useRouter();
  const action = insight.actions[0];

  const onActionPress = (target: InsightAction) => {
    const route = buildInsightActionRoute(target);
    if (route) {
      router.push(route);
    }
  };

  const Icon =
    insight.severity === 'positive'
      ? CheckCircle2
      : insight.severity === 'warning' || insight.severity === 'critical'
        ? AlertTriangle
        : Info;
  const color =
    insight.severity === 'positive'
      ? '$green'
      : insight.severity === 'warning' || insight.severity === 'critical'
        ? '$yellow'
        : '$blue10';

  return (
    <InsightFrame>
      <View flexDirection="row" gap="$3">
        <View marginTop="$1">
          <Icon size={18} color={color} />
        </View>
        <View flex={1}>
          <Text fontSize="$4" fontWeight="bold" color="white">
            {insight.title}
          </Text>
          <Text fontSize="$3" color="$gray10" marginTop="$1">
            {insight.body}
          </Text>
          {action && action.type !== 'none' ? (
            <LinkButton
              spacing="small"
              backgroundColor="transparent"
              color="$stroberi"
              fontSize="$2"
              fontWeight="700"
              marginTop="$2"
              accessibilityLabel={action.label}
              onPress={() => onActionPress(action)}
            >
              {action.label}
            </LinkButton>
          ) : null}
        </View>
      </View>
    </InsightFrame>
  );
};

const SectionCard = styled(View, {
  backgroundColor: '$gray2',
  borderRadius: '$6',
  borderWidth: 1,
  borderColor: '$gray5',
  padding: '$4',
});

const InsightFrame = styled(View, {
  backgroundColor: '$gray3',
  borderRadius: '$4',
  padding: '$3',
});

const EmptyPanel = styled(View, {
  backgroundColor: '$gray3',
  borderRadius: '$4',
  borderWidth: 1,
  borderColor: '$gray5',
  padding: '$3',
});
