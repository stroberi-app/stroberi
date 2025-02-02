import { TransactionModel } from '../../database/transaction-model';
import { withObservables } from '@nozbe/watermelondb/react';
import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { Text, YGroup } from 'tamagui';
import { TransactionItem } from '../TransactionItem';
import * as React from 'react';
import Reanimated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RecentTransactionsSectionProps = {
  transactions: TransactionModel[];
  header: (transactionCount: number) => React.ReactNode;
};
export const HomeTransactionsSection = withObservables<
  { database: Database },
  { transactions: Observable<TransactionModel[]> }
>([], ({ database }) => {
  return {
    transactions: database.collections
      .get<TransactionModel>('transactions')
      .query(Q.sortBy('date', 'desc'), Q.take(20))
      .observe(),
  };
})(({ transactions, header }: RecentTransactionsSectionProps) => {
  const { bottom } = useSafeAreaInsets();
  return (
    <>
      <YGroup>
        <Reanimated.FlatList
          contentInset={{
            bottom: 64 + bottom,
          }}
          ListHeaderComponent={() => (
            <>
              {header(transactions.length)}
              {transactions.length > 0 && (
                <Text fontSize={'$8'} fontWeight={'bold'} marginTop={'$4'} marginBottom={'$2'}>
                  Recent Transactions
                </Text>
              )}
            </>
          )}
          itemLayoutAnimation={LinearTransition}
          data={transactions}
          keyExtractor={transaction => transaction.id}
          renderItem={({ item: transaction }) => <TransactionItem transaction={transaction} />}
        />
      </YGroup>
    </>
  );
});
