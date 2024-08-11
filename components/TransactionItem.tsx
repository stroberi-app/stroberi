import { Text, View, YGroup } from 'tamagui';
import * as React from 'react';
import { CategoryModel } from '../database/category-model';
import { TransactionModel } from '../database/transaction-model';
import { withObservables } from '@nozbe/watermelondb/react';
import { formatCurrency } from '../lib/format';
import * as ContextMenu from 'zeego/context-menu';
import { useRouter } from 'expo-router';

type TransactionItemProps = {
  category: CategoryModel | undefined;
  transaction: TransactionModel;
  date: string;
};

export const TransactionItem = withObservables<{ transaction: TransactionModel }, unknown>(
  [],
  ({ transaction }) => {
    return {
      category: transaction.categoryId?.observe(),
      transaction: transaction.observe(),
    };
  }
)(({ date, category, transaction }: TransactionItemProps) => {
  const router = useRouter();
  const component = (
    <YGroup.Item key={transaction.id}>
      <View
        flexDirection={'row'}
        paddingVertical={'$2'}
        paddingHorizontal={'$4'}
        gap={'$4'}
        borderWidth={1}
        borderColor={'$borderColor'}>
        <Text fontSize={'$5'}>{category?.icon ?? '📦'}</Text>
        <View flexDirection={'column'}>
          <Text fontSize={'$5'} fontWeight={'bold'}>
            {transaction.merchant}
          </Text>
          <Text fontSize={'$3'} color={'gray'}>
            {category?.name ?? 'Uncategorized'}
          </Text>
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
        <ContextMenu.Item
          key={'edit'}
          onSelect={() => {
            router.push({
              pathname: '/create-transaction',
              params: {
                transaction: JSON.stringify(transaction._raw),
                category: JSON.stringify(category?._raw),
              },
            });
          }}>
          <ContextMenu.ItemTitle>Edit</ContextMenu.ItemTitle>
        </ContextMenu.Item>
        <ContextMenu.Item key={'delete'} destructive onSelect={() => transaction.deleteTx()}>
          <ContextMenu.ItemTitle>Delete</ContextMenu.ItemTitle>
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
});
