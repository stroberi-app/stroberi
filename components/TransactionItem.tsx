import { Text, View } from 'tamagui';
import * as React from 'react';
import { Pen, Trash2 } from '@tamagui/lucide-icons';
import { CategoryModel } from '../database/category-model';
import { TransactionModel } from '../database/transaction-model';
import { withObservables } from '@nozbe/watermelondb/react';
import { formatCurrency } from '../lib/format';
import { useRouter } from 'expo-router';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useActionSheet } from '@expo/react-native-action-sheet';
import Animated, { SharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Pressable } from 'react-native';
import { Observable } from 'rxjs';
import dayjs from 'dayjs';
import { DateFormats } from '../lib/date';

type TransactionItemProps = {
  category?: CategoryModel | null;
  transaction: TransactionModel;
};

export const TransactionItem = withObservables<
  { transaction: TransactionModel },
  { transaction: Observable<TransactionModel>; category?: Observable<CategoryModel | null> }
>(['transaction'], ({ transaction }) => {
  return {
    category: transaction.category?.observe(),
    transaction: transaction.observe(),
  };
})(({ category, transaction }: TransactionItemProps) => {
  const { showActionSheetWithOptions } = useActionSheet();

  const router = useRouter();

  const onEdit = () => {
    router.push({
      pathname: '/create-transaction',
      params: {
        transaction: JSON.stringify(transaction._raw),
        category: JSON.stringify(category?._raw),
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
      async buttonIndex => {
        if (buttonIndex === 0) {
          await transaction.deleteTx();
        }
      }
    );
  };
  const renderRightAction = (prog: SharedValue<number>, drag: SharedValue<number>) => {
    const styleAnimation = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: drag.value + 100 }],
        flexDirection: 'row',
      };
    });

    return (
      <Animated.View style={styleAnimation}>
        <View backgroundColor="gray" width={50}>
          <Pressable
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}
            onPress={() => {
              onEdit();
              drag.value = withTiming(0, { duration: 200 });
            }}
            accessibilityLabel="Edit transaction"
            accessibilityRole="button">
            <Pen height={24} width={24} />
          </Pressable>
        </View>
        <View backgroundColor="$stroberiLight" width={50}>
          <Pressable
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
            onPress={() => {
              onDelete();
              drag.value = withTiming(0, { duration: 200 });
            }}>
            <Trash2 height={8} width={8} />
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  return (
    <ReanimatedSwipeable
      key={transaction.id}
      friction={2}
      enableTrackpadTwoFingerGesture
      rightThreshold={40}
      renderRightActions={renderRightAction}>
      <View
        flexDirection="row"
        alignItems="center"
        paddingVertical="$2"
        paddingHorizontal="$4"
        gap="$4"
        borderWidth="$0.5"
        borderColor="$borderColor">
        <Text fontSize="$5">{category?.icon ?? '📦'}</Text>
        <View flexDirection="column" justifyContent="center">
          <Text fontSize="$5" fontWeight="bold">
            {category?.name ?? 'Uncategorized'}
          </Text>
          {transaction.merchant && (
            <Text fontSize="$3" color="gray">
              {transaction.merchant}
            </Text>
          )}
        </View>
        <View marginLeft="auto" alignItems="flex-end">
          <Text fontSize="$5" color={transaction.amount > 0 ? '$greenLight' : '$stroberiLight'}>
            {formatCurrency(transaction.amount, transaction.currencyCode)}
          </Text>
          <Text fontSize="$3" color="gray">
            {dayjs(transaction.date).format(DateFormats.FullMonthFullDayTime)}
          </Text>
        </View>
      </View>
    </ReanimatedSwipeable>
  );
});
