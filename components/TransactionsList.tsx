import type { Database } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { FlashList } from '@shopify/flash-list';
import dayjs from 'dayjs';
import { useCallback, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Observable } from 'rxjs';
import { Text, View } from 'tamagui';
import type { CategoryModel } from '../database/category-model';
import type { TransactionModel } from '../database/transaction-model';
import { type DateFilters, DateFormats } from '../lib/date';
import {
  buildTransactionsBaseQuery,
  type TransactionTypeFilter,
} from '../lib/transactionQuery';
import { Button } from './button/Button';
import { CreateFirstTransactionSection } from './CreateFirstTransactionSection';
import { TransactionItem } from './TransactionItem';

type TransactionsListViewProps = {
  transactions: TransactionModel[];
  appliedNumberOfFilters?: number;
  onClearFilters?: () => void;
  scrollRef?: React.RefObject<FlashList<ListItem>>;
};

type TransactionsListDataProps = {
  database: Database;
  dateFilter?: DateFilters | null;
  customRange?: [Date, Date];
  categories: CategoryModel[];
  transactionType?: TransactionTypeFilter;
};

type ListItem = string | TransactionModel;

const SECTION_HEADER_ESTIMATED_SIZE = 44;
const TRANSACTION_ROW_ESTIMATED_SIZE = 76;
const TRANSACTIONS_DRAW_DISTANCE = 900;

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
  onClearFilters,
  scrollRef,
}: TransactionsListViewProps) => {
  const { bottom } = useSafeAreaInsets();

  const data = useMemo(() => {
    const result: ListItem[] = [];

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

  if (transactions.length === 0) {
    if ((appliedNumberOfFilters ?? 0) > 0) {
      return (
        <View flex={1} justifyContent="center" alignItems="center" padding="$4" gap="$3">
          <Text color="white" fontWeight="bold" fontSize="$7">
            No matches found
          </Text>
          <Text color="$gray10" textAlign="center">
            No transactions match your current filters.
          </Text>
          <Button
            backgroundColor="$green"
            onPress={onClearFilters}
            disabled={!onClearFilters}
          >
            Clear filters
          </Button>
        </View>
      );
    }

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
      estimatedItemSize={TRANSACTION_ROW_ESTIMATED_SIZE}
      overrideItemLayout={overrideItemLayout}
      drawDistance={TRANSACTIONS_DRAW_DISTANCE}
    />
  );
};

const getItemType = (item: ListItem) => {
  return typeof item === 'string' ? 'sectionHeader' : 'row';
};

const keyExtractor = (item: ListItem) => {
  return typeof item === 'string' ? item : item.id;
};

const overrideItemLayout = (layout: { size?: number }, item: ListItem) => {
  layout.size =
    typeof item === 'string'
      ? SECTION_HEADER_ESTIMATED_SIZE
      : TRANSACTION_ROW_ESTIMATED_SIZE;
};

const withData = withObservables<
  TransactionsListDataProps,
  { transactions: Observable<TransactionModel[]> }
>(
  ['dateFilter', 'customRange', 'categories', 'transactionType'],
  ({ database, dateFilter, customRange, categories, transactionType }) => {
    const query = buildTransactionsBaseQuery(database, {
      dateFilter,
      customRange,
      categories,
      transactionType,
    });

    return {
      transactions: query.observeWithColumns([
        'date',
        'categoryId',
        'amountInBaseCurrency',
      ]),
    };
  }
);

const TransactionsListBase = withData(TransactionsList);

export default function TransactionsListWithRefresh(
  props: TransactionsListDataProps & Omit<TransactionsListViewProps, 'transactions'>
) {
  return <TransactionsListBase {...props} />;
}
