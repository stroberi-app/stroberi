import { useActionSheet } from '@expo/react-native-action-sheet';
import { withObservables } from '@nozbe/watermelondb/react';
import { RefreshCw } from '@tamagui/lucide-icons-2';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SharedValue } from 'react-native-reanimated';
import type { Observable } from 'rxjs';
import { Text, View } from 'tamagui';
import { deleteTransaction } from '../database/actions/transactions';
import type { CategoryModel } from '../database/category-model';
import type { TransactionModel } from '../database/transaction-model';
import useToast from '../hooks/useToast';
import { DateFormats } from '../lib/date';
import { formatCurrency } from '../lib/format';
import { SwipeActions } from './SwipeActions';

type TransactionItemProps = {
  category?: CategoryModel | null;
  transaction: TransactionModel;
  onPress?: (transaction: TransactionModel) => void;
  isFirst?: boolean;
  isLast?: boolean;
};

export const TransactionItem = withObservables<
  {
    transaction: TransactionModel;
    onPress?: (transaction: TransactionModel) => void;
    isFirst?: boolean;
    isLast?: boolean;
  },
  {
    transaction: Observable<TransactionModel>;
    category?: Observable<CategoryModel | null>;
  }
>(['transaction'], ({ transaction }) => {
  return {
    category: transaction.category?.observe(),
    transaction: transaction.observe(),
  };
})(({ category, transaction, onPress, isFirst, isLast }: TransactionItemProps) => {
  const { showActionSheetWithOptions } = useActionSheet();
  const toast = useToast();

  const router = useRouter();

  const onEdit = () => {
    router.push({
      pathname: '/create-transaction',
      params: {
        transactionId: transaction.id,
      },
    });
  };

  const onDelete = () => {
    showActionSheetWithOptions(
      {
        title: 'Are you sure you want to delete this transaction?',
        options: ['Delete', 'Cancel'],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 1,
      },
      async (buttonIndex) => {
        if (buttonIndex !== 0) {
          return;
        }

        try {
          await deleteTransaction(transaction.id);
        } catch (error) {
          toast.show({
            title: 'Unable to delete transaction',
            message:
              error instanceof Error ? error.message : 'Failed to delete transaction.',
            preset: 'error',
          });
        }
      }
    );
  };
  const renderRightAction = (_prog: SharedValue<number>, drag: SharedValue<number>) => (
    <SwipeActions
      drag={drag}
      itemLabel="transaction"
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );

  return (
    <ReanimatedSwipeable
      friction={2}
      enableTrackpadTwoFingerGesture
      rightThreshold={40}
      renderRightActions={renderRightAction}
    >
      <Pressable
        onPress={onPress ? () => onPress(transaction) : undefined}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? 'View transaction details' : undefined}
      >
        <View
          flexDirection="row"
          alignItems="center"
          paddingVertical="$2"
          paddingHorizontal="$4"
          gap="$4"
          borderWidth="$0.5"
          borderColor="$borderColor"
          borderTopLeftRadius={isFirst ? '$6' : 0}
          borderTopRightRadius={isFirst ? '$6' : 0}
          borderBottomLeftRadius={isLast ? '$6' : 0}
          borderBottomRightRadius={isLast ? '$6' : 0}
        >
          <Text fontSize="$5">{category?.icon ?? '📦'}</Text>
          <View flexDirection="column" justifyContent="center">
            <View flexDirection="row" gap="$2" alignItems="center">
              <Text fontSize="$5" fontWeight="bold">
                {category?.name ?? 'Uncategorized'}
              </Text>
              {transaction.recurringTransactionId && (
                <RefreshCw size={14} color="$blue10" />
              )}
            </View>
            {transaction.merchant && (
              <Text fontSize="$3" color="gray">
                {transaction.merchant}
              </Text>
            )}
          </View>
          <View marginLeft="auto" alignItems="flex-end">
            <Text
              fontSize="$5"
              color={transaction.amount > 0 ? '$greenLight' : '$stroberiLight'}
            >
              {formatCurrency(transaction.amount, transaction.currencyCode)}
            </Text>
            <Text fontSize="$3" color="gray">
              {dayjs(transaction.date).format(DateFormats.FullMonthFullDayTime)}
            </Text>
          </View>
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
});
