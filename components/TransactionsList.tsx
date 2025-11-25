import { type Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { FlashList } from '@shopify/flash-list';
import dayjs from 'dayjs';
import { useCallback, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Observable } from 'rxjs';
import { Text } from 'tamagui';
import type { CategoryModel } from '../database/category-model';
import type { TransactionModel } from '../database/transaction-model';
import { type DateFilters, DateFormats } from '../lib/date';
import { CreateFirstTransactionSection } from './CreateFirstTransactionSection';
import { TransactionItem } from './TransactionItem';

type TransactionsListProps = {
  transactions: TransactionModel[];
  appliedNumberOfFilters?: number;
  scrollRef?: React.RefObject<FlashList<ListItem>>;
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
      : `${DateFormats.FullMonthFullDay}, YYYY`
  );
};

const TransactionsList = ({
  transactions,
  appliedNumberOfFilters,
  scrollRef,
}: TransactionsListProps) => {
  const { bottom } = useSafeAreaInsets();

  const data = useMemo(() => {
    const result: (string | TransactionModel)[] = [];

    let currentKey: string | null = null;

    for (const transaction of transactions) {
      const key = getDateKey(transaction.date);

      if (key !== currentKey) {
        result.push(key);
        currentKey = key;
      }

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
      return <TransactionItem transaction={item} />;
    }
  }, []);

  const contentInset = useMemo(() => {
    return {
      bottom: 64 + bottom,
    };
  }, [bottom]);

  if (transactions.length === 0 && appliedNumberOfFilters === 0) {
    return <CreateFirstTransactionSection mt="30%" />;
  }

  return (
    <FlashList
      ref={scrollRef}
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
const withData = withObservables<
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
      query = query.extend(Q.where('categoryId', Q.oneOf(categories.map((c) => c.id))));
    }
    return {
      transactions: query.observe(),
    };
  }
);

export default withData(TransactionsList);
