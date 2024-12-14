import { Text, View, YGroup } from 'tamagui';
import * as React from 'react';
import { Pen, Trash2 } from '@tamagui/lucide-icons';
import { CategoryModel } from '../database/category-model';
import { TransactionModel } from '../database/transaction-model';
import { withObservables } from '@nozbe/watermelondb/react';
import { formatCurrency } from '../lib/format';
import * as ContextMenu from 'zeego/context-menu';
import { useRouter } from 'expo-router';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useActionSheet } from '@expo/react-native-action-sheet';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Pressable } from 'react-native';

type TransactionItemProps = {
  category: CategoryModel | undefined;
  transaction: TransactionModel;
  date: string;
};

export const TransactionItem = withObservables<{ transaction: TransactionModel }, unknown>(
  [],
  ({ transaction }) => {
    return {
      category: transaction.category?.observe(),
      transaction: transaction.observe(),
    };
  }
)(({ date, category, transaction }: TransactionItemProps) => {
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
        <View backgroundColor={'gray'} width={50}>
          <Pressable
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}
            onPress={onEdit}>
            <Pen height={8} width={8} />
          </Pressable>
        </View>
        <View backgroundColor={'$stroberiLight'} width={50}>
          <Pressable
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
            onPress={onDelete}>
            <Trash2 height={8} width={8} />
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  const component = (
    <YGroup.Item key={transaction.id}>
      <ReanimatedSwipeable
        friction={2}
        enableTrackpadTwoFingerGesture
        rightThreshold={40}
        renderRightActions={renderRightAction}>
        <View
          flexDirection={'row'}
          paddingVertical={'$2'}
          paddingHorizontal={'$4'}
          gap={'$4'}
          borderWidth={1}
          borderColor={'$borderColor'}>
          <Text fontSize={'$5'}>{category?.icon ?? '📦'}</Text>
          <View flexDirection={'column'} justifyContent={'center'}>
            <Text fontSize={'$5'} fontWeight={'bold'}>
              {category?.name ?? 'Uncategorized'}
            </Text>
            {transaction.merchant && (
              <Text fontSize={'$3'} color={'gray'}>
                {transaction.merchant}
              </Text>
            )}
          </View>
          <View marginLeft={'auto'} alignItems={'flex-end'}>
            <Text fontSize={'$5'} color={transaction.amount > 0 ? '$greenLight' : '$stroberiLight'}>
              {formatCurrency(transaction.amount, transaction.currencyCode)}
            </Text>
            <Text fontSize={'$3'} color={'gray'}>
              {date}
            </Text>
          </View>
        </View>
      </ReanimatedSwipeable>
    </YGroup.Item>
  );

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>{component}</ContextMenu.Trigger>
      <ContextMenu.Content
        loop={false}
        collisionPadding={{}}
        alignOffset={true}
        avoidCollisions={true}>
        <ContextMenu.Preview>{() => component}</ContextMenu.Preview>
        <ContextMenu.Item key={'edit'} onSelect={onEdit}>
          <ContextMenu.ItemTitle>Edit</ContextMenu.ItemTitle>
        </ContextMenu.Item>
        <ContextMenu.Item key={'delete'} destructive onSelect={onDelete}>
          <ContextMenu.ItemTitle>Delete</ContextMenu.ItemTitle>
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
});
