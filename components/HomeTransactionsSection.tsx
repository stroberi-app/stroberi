import { TransactionModel } from '../database/transaction-model';
import { withObservables } from '@nozbe/watermelondb/react';
import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { YGroup } from 'tamagui';
import { TransactionItem } from './TransactionItem';
import dayjs from 'dayjs';
import { DateFormats } from '../lib/date';
import * as React from 'react';
import Reanimated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RecentTransactionsSectionProps = {
  transactions: TransactionModel[];
  header: React.ReactNode;
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
  if (transactions.length === 0) {
    return null;
  }
  return (
    <>
      <YGroup>
        <Reanimated.FlatList
          contentInset={{
            bottom: 64 + bottom,
          }}
          ListHeaderComponent={() => header}
          itemLayoutAnimation={LinearTransition}
          data={transactions}
          keyExtractor={transaction => transaction.id}
          renderItem={({ item: transaction, index }) => (
            <TransactionItem
              date={dayjs(transaction.date).format(DateFormats.FullMonthFullDayTime)}
              transaction={transaction}
              index={index}
              total={transactions.length}
            />
          )}
        />
      </YGroup>
    </>
  );
});
