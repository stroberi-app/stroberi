import {
    AlertTriangle,
    CalendarClock,
    ChevronRight,
    Smile,
    TrendingUp,
} from '@tamagui/lucide-icons';
import { ScrollView, Text, View, styled } from 'tamagui';
import type { SmartInsight } from '../../lib/forecasting';

type SmartInsightsFeedProps = {
    insights: SmartInsight[];
};

export const SmartInsightsFeed = ({ insights }: SmartInsightsFeedProps) => {
    if (!insights || insights.length === 0) return null;

    return (
        <View marginBottom="$4">
            <View flexDirection="row" alignItems="center" justifyContent="space-between" marginBottom="$3" paddingHorizontal="$2">
                <Text fontSize="$4" fontWeight="bold" color="$gray11" textTransform="uppercase" letterSpacing={1}>
                    Smart Insights
                </Text>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 8, gap: 12 }}
            >
                {insights.map((insight) => (
                    <InsightCard key={insight.id} insight={insight} />
                ))}
            </ScrollView>
        </View>
    );
};

const InsightCard = ({ insight }: { insight: SmartInsight }) => {
    const Icon = getIcon(insight.icon);

    return (
        <CardFrame backgroundColor="$gray4">
            <View flexDirection="row" gap="$3">
                <IconContainer backgroundColor={insight.color}>
                    <Icon size={20} color="white" />
                </IconContainer>
                <View flex={1}>
                    <Text fontSize="$3" fontWeight="bold" color="white" numberOfLines={1}>
                        {insight.title}
                    </Text>
                    <Text fontSize="$3" color="$gray10" numberOfLines={2} marginTop="$1" lineHeight={18}>
                        {insight.message}
                    </Text>
                </View>
            </View>
        </CardFrame>
    );
};

const getIcon = (name: string) => {
    switch (name) {
        case 'AlertTriangle':
            return AlertTriangle;
        case 'TrendingUp':
            return TrendingUp;
        case 'CalendarClock':
            return CalendarClock;
        case 'Smile':
            return Smile;
        default:
            return Smile;
    }
};

const CardFrame = styled(View, {
    width: 260,
    padding: '$3',
    borderRadius: '$4',
});

const IconContainer = styled(View, {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
});
