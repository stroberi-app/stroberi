import { Text, View, type ViewProps } from 'tamagui';
import { formatCurrency } from '../lib/format';

type BudgetProgressProps = ViewProps & {
  spent: number;
  budget: number;
  percentage: number;
  currency: string;
  color: string;
};

export const BudgetProgress = ({
  spent,
  budget,
  percentage,
  currency,
  color,
  ...props
}: BudgetProgressProps) => {
  const clampedPercentage = Math.min(percentage, 100);

  return (
    <View {...props}>
      <View flexDirection="row" justifyContent="space-between" marginBottom="$2">
        <Text fontSize="$2" color="$gray10">
          Spent: {formatCurrency(spent, currency)}
        </Text>
        <Text fontSize="$2" color="$gray10">
          Budget: {formatCurrency(budget, currency)}
        </Text>
      </View>

      <View
        height={8}
        backgroundColor="$gray4"
        borderRadius="$4"
        overflow="hidden"
        width="100%"
      >
        <View
          height="100%"
          width={`${clampedPercentage}%`}
          backgroundColor={color}
          borderRadius="$4"
        />
      </View>

      <View
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        marginTop="$2"
      >
        <View
          backgroundColor={color}
          paddingHorizontal="$2"
          paddingVertical="$1"
          borderRadius="$2"
        >
          <Text fontSize="$2" color="white" fontWeight="bold">
            {Math.round(percentage)}%
          </Text>
        </View>
        <Text fontSize="$2" color="$gray10">
          Remaining: {formatCurrency(Math.max(budget - spent, 0), currency)}
        </Text>
      </View>
    </View>
  );
};
