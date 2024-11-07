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
import { DateFilters } from '../app/(tabs)/transactions';
import { CategoryModel } from '../database/category-model';

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
  return dayjsDate.format(
    dayjsDate.year() === dayjs().year()
      ? DateFormats.FullMonthFullDay
      : DateFormats.FullMonthFullDay + ', YYYY'
  );
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
                category={transaction.category}
              />
            ))}
          </YGroup>
        </React.Fragment>
      ))}
    </>
  );
};

const enhance = withObservables<
  {
    database: Database;
    dateFilter?: DateFilters | null;
    customRange?: [Date, Date];
    categories: CategoryModel[];
  },
  { transactions: Observable<TransactionModel[]> }
>(
  ['dateFilter', 'customRange', 'categories'],
  ({ database, dateFilter, customRange, categories }) => {
    let query = database.collections
      .get<TransactionModel>('transactions')
      .query(Q.sortBy('date', 'desc'));

    if (dateFilter === 'This Year') {
      const startOfYear = dayjs().startOf('year').toDate();
      const endOfYear = dayjs().endOf('year').toDate();
      query = query.extend(Q.where('date', Q.gte(startOfYear.getTime())));
      query = query.extend(Q.where('date', Q.lte(endOfYear.getTime())));
    } else if (dateFilter === 'This Month') {
      const startOfMonth = dayjs().startOf('month').toDate();
      const endOfMonth = dayjs().endOf('month').toDate();
      query = query.extend(Q.where('date', Q.gte(startOfMonth.getTime())));
      query = query.extend(Q.where('date', Q.lte(endOfMonth.getTime())));
    } else if (customRange) {
      const [start, end] = customRange;
      query = query.extend(Q.where('date', Q.gte(start.getTime())));
      query = query.extend(Q.where('date', Q.lte(end.getTime())));
    }
    if (categories.length > 0) {
      query = query.extend(Q.where('categoryId', Q.oneOf(categories.map(c => c.id))));
    }
    return {
      transactions: query.observe(),
    };
  }
);
export default enhance(TransactionsList);
