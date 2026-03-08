import { type Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { FlashList } from '@shopify/flash-list';
import dayjs from 'dayjs';
import { ActivityIndicator } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Observable } from 'rxjs';
import { Text, View } from 'tamagui';
import type { CategoryModel } from '../database/category-model';
import type { TransactionModel } from '../database/transaction-model';
import { type DateFilters, DateFormats } from '../lib/date';
import { buildTransactionsBaseQuery } from '../lib/transactionQuery';
import { Button } from './button/Button';
import { CreateFirstTransactionSection } from './CreateFirstTransactionSection';
import { TransactionItem } from './TransactionItem';

const INITIAL_VISIBLE_COUNT = 300;
const PAGE_INCREMENT = 200;

const OBSERVED_TRANSACTION_COLUMNS = [
  'merchant',
  'amount',
  'currencyCode',
  'date',
  'recurringTransactionId',
  'categoryId',
] as const;

type ListItem = string | TransactionModel;

type TransactionsListContentProps = {
  transactions: TransactionModel[];
  totalCount: number;
  visibleCount: number;
  appliedNumberOfFilters?: number;
  onClearFilters?: () => void;
  scrollRef?: RefObject<FlashList<ListItem>>;
  onLoadMore: (totalCount: number) => void;
  onTotalCountChange: (totalCount: number) => void;
  isLoadingMore: boolean;
};

type TransactionsListProps = {
  database: Database;
  dateFilter?: DateFilters | null;
  customRange?: [Date, Date];
  categories: CategoryModel[];
  appliedNumberOfFilters?: number;
  onClearFilters?: () => void;
  scrollRef?: RefObject<FlashList<ListItem>>;
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
      : `${DateFormats.FullMonthFullDay}, YYYY`
  );
};

const TransactionsList = ({
  transactions,
  totalCount,
  visibleCount,
  appliedNumberOfFilters,
  onClearFilters,
  scrollRef,
  onLoadMore,
  onTotalCountChange,
  isLoadingMore,
}: TransactionsListContentProps) => {
  const { bottom } = useSafeAreaInsets();
  const hasMore = visibleCount < totalCount;

  useEffect(() => {
    onTotalCountChange(totalCount);
  }, [onTotalCountChange, totalCount]);

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

  const onEndReached = useCallback(() => {
    if (!hasMore) {
      return;
    }
    onLoadMore(totalCount);
  }, [hasMore, onLoadMore, totalCount]);

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

  const listFooter = useMemo(() => {
    if (!hasMore) {
      return null;
    }

    return (
      <View alignItems="center" justifyContent="center" paddingVertical="$3">
        {isLoadingMore && <ActivityIndicator size="small" color="#9CA3AF" />}
      </View>
    );
  }, [hasMore, isLoadingMore]);

  const contentInset = useMemo(() => {
    return {
      bottom: 64 + bottom,
    };
  }, [bottom]);

  if (totalCount === 0) {
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
      estimatedItemSize={52}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      ListFooterComponent={listFooter}
    />
  );
};

const getItemType = (item: ListItem) => {
  return typeof item === 'string' ? 'sectionHeader' : 'row';
};

const keyExtractor = (item: ListItem, index: number) => {
  return typeof item === 'string' ? `section-${item}-${index}` : item.id;
};

const withData = withObservables<
  {
    database: Database;
    dateFilter?: DateFilters | null;
    customRange?: [Date, Date];
    categories: CategoryModel[];
    visibleCount: number;
    onLoadMore: (totalCount: number) => void;
    onTotalCountChange: (totalCount: number) => void;
    isLoadingMore: boolean;
  },
  {
    transactions: Observable<TransactionModel[]>;
    totalCount: Observable<number>;
  }
>(
  ['dateFilter', 'customRange', 'categories', 'visibleCount'],
  ({ database, dateFilter, customRange, categories, visibleCount }) => {
    const baseQuery = buildTransactionsBaseQuery(database, {
      dateFilter,
      customRange,
      categories,
    });
    const visibleQuery = baseQuery.extend(Q.take(Math.max(1, visibleCount)));

    return {
      transactions: visibleQuery.observeWithColumns([...OBSERVED_TRANSACTION_COLUMNS]),
      totalCount: baseQuery.observeCount(false),
    };
  }
);

const TransactionsListWithData = withData(TransactionsList);

const TransactionsListContainer = (props: TransactionsListProps) => {
  const { dateFilter, customRange, categories, scrollRef } = props;
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isLoadingMoreRef = useRef(false);

  const categoriesKey = useMemo(
    () => categories.map((category) => category.id).sort().join('|'),
    [categories]
  );
  const customRangeStart = customRange?.[0]?.getTime() ?? null;
  const customRangeEnd = customRange?.[1]?.getTime() ?? null;
  const filterResetKey = useMemo(
    () =>
      `${dateFilter ?? 'all'}:${customRangeStart ?? 'none'}:${customRangeEnd ?? 'none'}:${categoriesKey}`,
    [categoriesKey, customRangeEnd, customRangeStart, dateFilter]
  );

  useEffect(() => {
    void filterResetKey;

    setVisibleCount(INITIAL_VISIBLE_COUNT);
    setIsLoadingMore(false);
    isLoadingMoreRef.current = false;
    scrollRef?.current?.scrollToOffset({
      offset: 0,
      animated: false,
    });
  }, [filterResetKey, scrollRef]);

  const onLoadMore = useCallback(
    (totalCount: number) => {
      if (isLoadingMoreRef.current || visibleCount >= totalCount) {
        return;
      }

      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);
      setVisibleCount((previous) => Math.min(previous + PAGE_INCREMENT, totalCount));
    },
    [visibleCount]
  );

  const onTotalCountChange = useCallback((totalCount: number) => {
    setVisibleCount((previous) => {
      if (totalCount > 0 && previous > totalCount) {
        return totalCount;
      }
      return previous;
    });
  }, []);

  useEffect(() => {
    if (!isLoadingMoreRef.current && !isLoadingMore) {
      return;
    }

    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
  }, [isLoadingMore]);

  return (
    <TransactionsListWithData
      {...props}
      visibleCount={visibleCount}
      onLoadMore={onLoadMore}
      onTotalCountChange={onTotalCountChange}
      isLoadingMore={isLoadingMore}
    />
  );
};

export default TransactionsListContainer;
