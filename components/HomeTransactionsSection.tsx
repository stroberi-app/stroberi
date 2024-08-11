import { TransactionModel } from '../database/transaction-model';
import { withObservables } from '@nozbe/watermelondb/react';
import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { Text, YGroup } from 'tamagui';
import { TransactionItem } from './TransactionItem';
import dayjs from 'dayjs';
import { DateFormats } from '../lib/date';
import * as React from 'react';

type RecentTransactionsSectionProps = {
  transactions: TransactionModel[];
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
})(({ transactions }: RecentTransactionsSectionProps) => {
  if (transactions.length === 0) {
    return null;
  }
  return (
    <>
      <Text fontSize={'$9'} fontWeight={'bold'} marginTop={'$4'} marginBottom={'$2'}>
        Recent Transactions
      </Text>
      <YGroup bordered>
        {transactions.map(transaction => (
          <TransactionItem
            key={transaction.id}
            date={dayjs(transaction.date).format(DateFormats.FullMonthFullDayTime)}
            transaction={transaction}
            amount={transaction.amount}
          />
        ))}
      </YGroup>
    </>
  );
});
