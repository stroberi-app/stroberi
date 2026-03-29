import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { useScrollToTop } from '@react-navigation/native';
import { Filter } from '@tamagui/lucide-icons';
import * as React from 'react';
import { useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';
import { Button } from '../../components/button/Button';
import { LinkButton } from '../../components/button/LinkButton';
import { DatePicker } from '../../components/DatePicker';
import BottomSheetDynamicSize from '../../components/filtering/BottomSheetDynamicSize';
import CategoryFilterSection from '../../components/filtering/CategoryFilterSection';
import DateFilterSection from '../../components/filtering/DateFilterSection';
import TransactionTypeFilterSection from '../../components/filtering/TransactionTypeFilterSection';
import TransactionsList from '../../components/TransactionsList';
import type { CategoryModel } from '../../database/category-model';
import type { DateFilters } from '../../lib/date';
import type { TransactionTypeFilter } from '../../lib/transactionQuery';

export default function TransactionsScreen() {
  const { top } = useSafeAreaInsets();
  const [dateFilter, setDateFilter] = useState<DateFilters | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<CategoryModel[]>([]);
  const [transactionType, setTransactionType] = useState<TransactionTypeFilter>('all');
  const sheetRef = React.useRef<BottomSheetModal>(null);
  const dateSheetRef = React.useRef<BottomSheetModal>(null);
  const database = useDatabase();
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const scrollRef = useRef(null);
  const customRange = useMemo<[Date, Date] | undefined>(() => {
    if (dateFilter !== 'Custom') {
      return undefined;
    }
    return [fromDate, toDate];
  }, [dateFilter, fromDate, toDate]);

  useScrollToTop(scrollRef);

  const appliedNumberOfFilters = [
    dateFilter,
    selectedCategories.length > 0 ? 'categories' : null,
    transactionType !== 'all' ? transactionType : null,
  ].filter(Boolean).length;
  return (
    <>
      <View
        paddingTop={top || '$2'}
        flex={1}
        backgroundColor="$bgPrimary"
        paddingHorizontal="$2"
      >
        <View flexDirection="row" justifyContent="space-between" alignItems="center">
          <Text fontSize="$8" fontWeight="bold" marginBottom="$2">
            Transactions
          </Text>
          <LinkButton paddingHorizontal="$2" onPress={() => sheetRef.current?.present()}>
            <Filter size="$1" color="$stroberi" />
            {appliedNumberOfFilters > 0 && (
              <Text color="$stroberi" fontWeight="bold">
                +{appliedNumberOfFilters}
              </Text>
            )}
          </LinkButton>
        </View>
        <TransactionsList
          database={database}
          dateFilter={dateFilter}
          customRange={customRange}
          categories={selectedCategories}
          transactionType={transactionType}
          appliedNumberOfFilters={appliedNumberOfFilters}
          onClearFilters={() => {
            setDateFilter(null);
            setSelectedCategories([]);
            setTransactionType('all');
            setFromDate(new Date());
            setToDate(new Date());
          }}
          scrollRef={scrollRef}
        />
      </View>
      <BottomSheetDynamicSize sheetRef={sheetRef}>
        <DateFilterSection
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          fromDate={fromDate}
          toDate={toDate}
          dateSheetRef={dateSheetRef}
        />
        <TransactionTypeFilterSection
          transactionType={transactionType}
          setTransactionType={setTransactionType}
        />
        <CategoryFilterSection
          selectedCategories={selectedCategories}
          setSelectedCategory={setSelectedCategories}
        />
      </BottomSheetDynamicSize>
      <BottomSheetDynamicSize sheetRef={dateSheetRef}>
        <View paddingHorizontal="$4" paddingVertical="$2" gap="$5">
          <View flexDirection="row" justifyContent="space-between" alignItems="center">
            <Text fontSize="$6" fontWeight="bold">
              From Date
            </Text>
            <DatePicker date={fromDate} setDate={setFromDate} />
          </View>
          <View flexDirection="row" justifyContent="space-between" alignItems="center">
            <Text fontSize="$6" fontWeight="bold">
              To Date
            </Text>
            <DatePicker date={toDate} setDate={setToDate} />
          </View>
          <Button
            backgroundColor="$green"
            gap="$0"
            paddingHorizontal="$2"
            onPress={() => {
              dateSheetRef.current?.close();
              setDateFilter('Custom');
            }}
          >
            Apply
          </Button>
        </View>
      </BottomSheetDynamicSize>
    </>
  );
}
