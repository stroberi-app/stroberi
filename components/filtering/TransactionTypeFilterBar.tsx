import { Text, View } from 'tamagui';
import type { TransactionTypeFilter } from '../../lib/transactionQuery';

type TransactionTypeFilterBarProps = {
  value: TransactionTypeFilter;
  onChange: (value: TransactionTypeFilter) => void;
};

const options: Array<{
  label: string;
  value: TransactionTypeFilter;
  activeBackgroundColor: string;
}> = [
  { label: 'All', value: 'all', activeBackgroundColor: '$gray' },
  { label: 'Expenses', value: 'expense', activeBackgroundColor: '$stroberi' },
  { label: 'Income', value: 'income', activeBackgroundColor: '$green' },
];

const TransactionTypeFilterBar = ({ value, onChange }: TransactionTypeFilterBarProps) => {
  return (
    <View marginBottom="$3">
      <View
        flexDirection="row"
        backgroundColor="$bgSecondary"
        borderRadius="$4"
        padding="$1"
        gap="$1"
      >
        {options.map((option) => {
          const isSelected = value === option.value;

          return (
            <View
              key={option.value}
              flex={1}
              backgroundColor={isSelected ? option.activeBackgroundColor : 'transparent'}
              borderRadius="$3"
              paddingVertical="$2"
              alignItems="center"
              onPress={() => onChange(option.value)}
              pressStyle={{ opacity: 0.8 }}
            >
              <Text fontSize="$4" fontWeight="600" color={isSelected ? 'white' : 'gray'}>
                {option.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default TransactionTypeFilterBar;
