import { XCircle } from '@tamagui/lucide-icons';
import { Text, View } from 'tamagui';
import type { TransactionTypeFilter } from '../../lib/transactionQuery';
import { LinkButton } from '../button/LinkButton';
import TransactionTypeFilterBar from './TransactionTypeFilterBar';

type TransactionTypeFilterSectionProps = {
  transactionType: TransactionTypeFilter;
  setTransactionType: (value: TransactionTypeFilter) => void;
};

const TransactionTypeFilterSection = ({
  transactionType,
  setTransactionType,
}: TransactionTypeFilterSectionProps) => {
  return (
    <View paddingHorizontal="$4" paddingVertical="$2" mb="$5">
      <View
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        mb="$4"
      >
        <Text fontSize="$6" fontWeight="bold">
          Filter by Type
        </Text>
        {transactionType !== 'all' && (
          <LinkButton onPress={() => setTransactionType('all')}>
            <XCircle size={18} color="white" />
          </LinkButton>
        )}
      </View>
      <TransactionTypeFilterBar value={transactionType} onChange={setTransactionType} />
    </View>
  );
};

export default TransactionTypeFilterSection;
