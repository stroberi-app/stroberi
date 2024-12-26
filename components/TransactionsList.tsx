import dayjs from 'dayjs';
import { DateFilters, DateFormats } from '../lib/date';
import { withObservables } from '@nozbe/watermelondb/react';
import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { Text } from 'tamagui';
import { TransactionItem } from './TransactionItem';
import * as React from 'react';
import { TransactionModel } from '../database/transaction-model';
import { CreateFirstTransactionButton } from './CreateFirstTransactionButton';
import { CategoryModel } from '../database/category-model';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useCallback, useMemo } from 'react';

type TransactionsListProps = {
  transactions: TransactionModel[];
};

type ListItem = string | TransactionModel;

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

  const data = useMemo(() => {
    const result: (string | TransactionModel)[] = [];

    let currentKey: string | null = null;

    for (const transaction of transactions) {
      const key = getDateKey(transaction.date);

      if (key !== currentKey) {
        // Add a new title (section header)
        result.push(key);
        currentKey = key;
      }

      // Add the transaction to the result
      result.push(transaction);
    }

    return result;
  }, [transactions]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (typeof item === 'string') {
      return (
        <Text fontSize="$5" fontWeight="bold" marginTop="$4" marginBottom="$2">
          {item}
        </Text>
      );
    } else {
      return (
        <TransactionItem
          date={dayjs(item.date).format(DateFormats.FullMonthFullDayTime)}
          transaction={item}
        />
      );
    }
  }, []);

  const contentInset = useMemo(() => {
    return {
      bottom: 64 + bottom,
    };
  }, [bottom]);

  if (transactions.length === 0) {
    return <CreateFirstTransactionButton mt="30%" />;
  }

  return (
    <FlashList
      contentInset={contentInset}
      keyExtractor={keyExtractor}
      data={data}
      renderItem={renderItem}
      getItemType={getItemType}
      estimatedItemSize={52}
    />
  );
};

const getItemType = (item: ListItem) => {
  return typeof item === 'string' ? 'sectionHeader' : 'row';
};

const keyExtractor = (item: ListItem) => {
  return typeof item === 'string' ? item : item.id;
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
    const dayjsInstance = dayjs();
    let query = database.collections
      .get<TransactionModel>('transactions')
      .query(Q.sortBy('date', 'desc'));

    if (dateFilter === 'This Year') {
      const startOfYear = dayjsInstance.startOf('year').toDate();
      const endOfYear = dayjsInstance.endOf('year').toDate();
      query = query.extend(Q.where('date', Q.gte(startOfYear.getTime())));
      query = query.extend(Q.where('date', Q.lte(endOfYear.getTime())));
    } else if (dateFilter === 'This Month') {
      const startOfMonth = dayjsInstance.startOf('month').toDate();
      const endOfMonth = dayjsInstance.endOf('month').toDate();
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
