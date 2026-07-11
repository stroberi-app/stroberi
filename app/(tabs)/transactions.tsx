import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { useScrollToTop } from '@react-navigation/native';
import { Filter } from '@tamagui/lucide-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
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
import { countActiveTransactionFilters } from '../../features/transactions/filterState';
import { parseTransactionInsightRoute } from '../../features/transactions/insightRoute';
import type { DateFilters } from '../../lib/date';
import type { TransactionTypeFilter } from '../../lib/transactionQuery';

export default function TransactionsScreen() {
  const params = useLocalSearchParams<{
    insightAction?: string | string[];
    categoryId?: string | string[];
    merchant?: string | string[];
    uncategorized?: string | string[];
    maxExpenseAmount?: string | string[];
    fromDate?: string | string[];
    toDate?: string | string[];
  }>();
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const [dateFilter, setDateFilter] = useState<DateFilters | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<CategoryModel[]>([]);
  const [transactionType, setTransactionType] = useState<TransactionTypeFilter>('all');
  const [merchantFilter, setMerchantFilter] = useState<string | undefined>();
  const [uncategorizedOnly, setUncategorizedOnly] = useState(false);
  const [maxExpenseAmount, setMaxExpenseAmount] = useState<number | undefined>();
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
  const insightRoute = useMemo(
    () =>
      parseTransactionInsightRoute({
        insightAction: params.insightAction,
        categoryId: params.categoryId,
        merchant: params.merchant,
        uncategorized: params.uncategorized,
        maxExpenseAmount: params.maxExpenseAmount,
        fromDate: params.fromDate,
        toDate: params.toDate,
      }),
    [
      params.categoryId,
      params.fromDate,
      params.insightAction,
      params.maxExpenseAmount,
      params.merchant,
      params.toDate,
      params.uncategorized,
    ]
  );

  React.useEffect(() => {
    if (!insightRoute) return;

    let cancelled = false;

    if (insightRoute.dateRange) {
      setFromDate(insightRoute.dateRange[0]);
      setToDate(insightRoute.dateRange[1]);
      setDateFilter('Custom');
    } else {
      setDateFilter(null);
    }
    setTransactionType('all');
    setMerchantFilter(insightRoute.merchant);
    setUncategorizedOnly(insightRoute.uncategorized);
    setMaxExpenseAmount(insightRoute.maxExpenseAmount);

    const applyCategory = async () => {
      if (!insightRoute.categoryId) {
        setSelectedCategories([]);
      } else {
        const category = await database
          .get<CategoryModel>('categories')
          .find(insightRoute.categoryId)
          .catch(() => null);

        if (cancelled) return;
        setSelectedCategories(category ? [category] : []);
      }

      if (!cancelled) {
        router.setParams({
          insightAction: undefined,
          categoryId: undefined,
          merchant: undefined,
          uncategorized: undefined,
          maxExpenseAmount: undefined,
          fromDate: undefined,
          toDate: undefined,
        });
      }
    };

    applyCategory();

    return () => {
      cancelled = true;
    };
  }, [database, insightRoute, router]);

  useScrollToTop(scrollRef);

  const clearFilters = useCallback(() => {
    setDateFilter(null);
    setSelectedCategories([]);
    setTransactionType('all');
    setMerchantFilter(undefined);
    setUncategorizedOnly(false);
    setMaxExpenseAmount(undefined);
    setFromDate(new Date());
    setToDate(new Date());
  }, []);

  const appliedNumberOfFilters = countActiveTransactionFilters({
    dateFilter,
    categoryCount: selectedCategories.length,
    transactionType,
    merchant: merchantFilter,
    uncategorized: uncategorizedOnly,
    maxExpenseAmount,
  });
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
          merchant={merchantFilter}
          uncategorized={uncategorizedOnly}
          maxExpenseAmount={maxExpenseAmount}
          appliedNumberOfFilters={appliedNumberOfFilters}
          onClearFilters={clearFilters}
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
          setTransactionType={(nextType) => {
            setTransactionType(nextType);
            setMaxExpenseAmount(undefined);
          }}
        />
        <CategoryFilterSection
          selectedCategories={selectedCategories}
          setSelectedCategory={(categories) => {
            setSelectedCategories(categories);
            if (categories.length > 0) {
              setUncategorizedOnly(false);
            }
          }}
        />
        {appliedNumberOfFilters > 0 && (
          <View paddingHorizontal="$4" paddingTop="$3">
            <LinkButton
              spacing="small"
              backgroundColor="$gray4"
              color="$stroberi"
              accessibilityLabel="Clear all transaction filters"
              onPress={() => {
                clearFilters();
                sheetRef.current?.close();
              }}
            >
              Clear all filters
            </LinkButton>
          </View>
        )}
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
