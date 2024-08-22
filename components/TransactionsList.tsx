import dayjs from 'dayjs';
import { DateFormats } from '../lib/date';
import { withObservables } from '@nozbe/watermelondb/react';
import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { Text, YGroup } from 'tamagui';
import { TransactionItem } from './TransactionItem';
import * as React from 'react';
import { TransactionModel } from '../database/transaction-model';
import { CreateFirstTransactionButton } from './CreateFirstTransactionButton';

type TransactionsListProps = {
  transactions: TransactionModel[];
};

const getDateKey = (date: Date) => {
  const dayjsDate = dayjs(date);
  if (dayjsDate.isToday()) {
    return 'Today';
  }
  if (dayjsDate.isYesterday()) {
    return 'Yesterday';
  }
  return dayjsDate.format(DateFormats.FullMonthFullDay);
};

const TransactionsList = ({ transactions }: TransactionsListProps) => {
  const groupByDate = transactions.reduce(
    (acc, transaction) => {
      const key = getDateKey(transaction.date);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(transaction);
      return acc;
    },
    {} as Record<string, typeof transactions>
  );

  if (transactions.length === 0) {
    return <CreateFirstTransactionButton mt={'30%'} />;
  }
  return (
    <>
      {Object.entries(groupByDate).map(([key, values]) => (
        <React.Fragment key={key}>
          <Text fontSize={'$5'} fontWeight={'bold'} marginTop={'$4'} marginBottom={'$2'}>
            {key}
          </Text>
          <YGroup>
            {values.map(transaction => (
              <TransactionItem
                key={transaction.id}
                date={dayjs(transaction.date).format(DateFormats.FullMonthFullDayTime)}
                transaction={transaction}
              />
            ))}
          </YGroup>
        </React.Fragment>
      ))}
    </>
  );
};

const enhance = withObservables<
  { database: Database },
  { transactions: Observable<TransactionModel[]> }
>([], ({ database }) => {
  return {
    transactions: database.collections
      .get<TransactionModel>('transactions')
      .query(Q.sortBy('date', 'desc'))
      .observe(),
  };
});

export default enhance(TransactionsList);
