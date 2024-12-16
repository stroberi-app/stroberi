import dayjs from 'dayjs';
import { DateFormats } from '../lib/date';
import { withObservables } from '@nozbe/watermelondb/react';
import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { Text } from 'tamagui';
import { TransactionItem } from './TransactionItem';
import * as React from 'react';
import { TransactionModel } from '../database/transaction-model';
import { CreateFirstTransactionButton } from './CreateFirstTransactionButton';
import { DateFilters } from '../app/(tabs)/transactions';
import { CategoryModel } from '../database/category-model';
import { SectionList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { bottom } = useSafeAreaInsets();
  const sections = transactions.reduce(
    (acc, transaction) => {
      const key = getDateKey(transaction.date);
      const section = acc.find(section => section.title === key);
      if (section) {
        section.data.push(transaction);
      } else {
        acc.push({ title: key, data: [transaction] });
      }
      return acc;
    },
    [] as { title: string; data: TransactionModel[] }[]
  );

  if (transactions.length === 0) {
    return <CreateFirstTransactionButton mt={'30%'} />;
  }

  return (
    <SectionList
      contentInset={{
        bottom: 64 + bottom,
      }}
      sections={sections}
      keyExtractor={transaction => transaction.id}
      renderItem={({ item: transaction, index, section }) => (
        <TransactionItem
          date={dayjs(transaction.date).format(DateFormats.FullMonthFullDayTime)}
          transaction={transaction}
          index={index}
          total={section.data.length}
        />
      )}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section: { title } }) => (
        <Text fontSize={'$5'} fontWeight={'bold'} marginTop={'$4'} marginBottom={'$2'}>
          {title}
        </Text>
      )}
    />
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
