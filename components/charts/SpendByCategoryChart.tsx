import { type Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { CircleSlash } from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import * as React from 'react';
import { Pressable } from 'react-native';
import { map, type Observable } from 'rxjs';
import { Button, styled, Text, View } from 'tamagui';
import type { CategoryModel } from '../../database/category-model';
import type { TransactionModel } from '../../database/transaction-model';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { buildCategoryColorMap, withAlpha } from '../../lib/chartColors';
import { formatCurrency } from '../../lib/format';
import { calculateCategorySpending } from '../../lib/transactionAnalytics';
import { CarouselItemChart } from '../carousel/CarouselItemChart';
import { CarouselItemText } from '../carousel/CarouselItemText';
import { CarouselItemWrapper } from '../carousel/CarouselItemWrapper';

type SpendByCategoryProps = {
  chartData: SpendByCategoryChartData;
  categories: CategoryModel[];
  dateFilter: SpendByCategoryDateFilter;
  setDateFilter: (dateFilter: SpendByCategoryDateFilter) => void;
};
type SpendByCategoryChartData = {
  category: string;
  total: number;
}[];

type SpendByCategoryDateFilter = 'thisMonth' | 'lastMonth' | 'thisYear';
export const SpendByCategory = withObservables<
  { database: Database; dateFilter: SpendByCategoryDateFilter },
  {
    chartData: Observable<SpendByCategoryChartData>;
    categories: Observable<CategoryModel[]>;
  }
>(['dateFilter'], ({ database, dateFilter }) => {
  const today = dayjs();
  let dateQueries: ReturnType<typeof Q.where>[] = [];

  if (dateFilter === 'lastMonth') {
    const startOfMonth = today.subtract(1, 'month').startOf('month').toDate();
    const endOfMonth = today.subtract(1, 'month').endOf('month').toDate();
    dateQueries = [
      Q.where('date', Q.gte(startOfMonth.getTime())),
      Q.where('date', Q.lte(endOfMonth.getTime())),
    ];
  } else if (dateFilter === 'thisMonth') {
    const startOfMonth = today.startOf('month').toDate();
    const endOfMonth = today.endOf('month').toDate();
    dateQueries = [
      Q.where('date', Q.gte(startOfMonth.getTime())),
      Q.where('date', Q.lte(endOfMonth.getTime())),
    ];
  } else if (dateFilter === 'thisYear') {
    const startOfYear = today.startOf('year').toDate();
    const endOfYear = today.endOf('year').toDate();
    dateQueries = [
      Q.where('date', Q.gte(startOfYear.getTime())),
      Q.where('date', Q.lte(endOfYear.getTime())),
    ];
  }

  return {
    categories: database.collections.get<CategoryModel>('categories').query().observe(),
    // Single optimized query for category spending data
    chartData: database.collections
      .get<TransactionModel>('transactions')
      .query(Q.where('amountInBaseCurrency', Q.lt(0)), ...dateQueries)
      .observeWithColumns(['categoryId', 'amountInBaseCurrency'])
      .pipe(map((transactions) => calculateCategorySpending(transactions))),
  };
})(({ chartData, categories, dateFilter, setDateFilter }: SpendByCategoryProps) => {
  const { defaultCurrency } = useDefaultCurrency();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const maxCategories = 6;

  const overallTotal = React.useMemo(
    () => chartData.reduce((sum, item) => sum + item.total, 0),
    [chartData]
  );

  const processedData = React.useMemo(() => {
    const dataWithNames = chartData
      .map(({ category, total }) => {
        const categoryModel = categories.find((c) => c.id === category);
        return {
          id: category,
          total,
          name: categoryModel?.name || 'Uncategorized',
          icon: categoryModel?.icon || '📦',
        };
      })
      .sort((a, b) => b.total - a.total)
      .filter((item) => item.total > 0);

    return dataWithNames.slice(0, maxCategories);
  }, [chartData, categories]);

  const colorMap = React.useMemo(
    () => buildCategoryColorMap(processedData.map((item) => item.id)),
    [processedData]
  );

  // Reset the selection whenever the underlying category data changes (e.g.
  // switching date filters) so a stale selection can't linger on screen.
  // Adjusting state during render (React's recommended pattern for this)
  // avoids the extra render an equivalent useEffect would cost.
  const [prevChartData, setPrevChartData] = React.useState(chartData);
  if (chartData !== prevChartData) {
    setPrevChartData(chartData);
    setSelectedId(null);
  }

  const shownTotal = React.useMemo(
    () => processedData.reduce((sum, item) => sum + item.total, 0),
    [processedData]
  );

  const selectedItem = processedData.find((item) => item.id === selectedId) ?? null;

  const totalCategories = chartData.filter((item) => item.total > 0).length;
  const hiddenCategories = Math.max(0, totalCategories - maxCategories);
  const isEmpty = processedData.length === 0;

  const filters = (
    <View gap="$2" alignItems="center">
      <View
        flexDirection={'row'}
        gap={'$2'}
        justifyContent={'center'}
        paddingHorizontal={'$2'}
        flexWrap={'wrap'}
        alignItems={'center'}
      >
        <FilterButton
          active={dateFilter === 'thisMonth'}
          onPress={() => {
            setDateFilter('thisMonth');
          }}
        >
          <FilterButtonText>This month</FilterButtonText>
        </FilterButton>
        <FilterButton
          active={dateFilter === 'lastMonth'}
          onPress={() => {
            setDateFilter('lastMonth');
          }}
        >
          <FilterButtonText>Last month</FilterButtonText>
        </FilterButton>
        <FilterButton
          active={dateFilter === 'thisYear'}
          onPress={() => {
            setDateFilter('thisYear');
          }}
        >
          <FilterButtonText>This year</FilterButtonText>
        </FilterButton>
      </View>
    </View>
  );

  return (
    <CarouselItemWrapper>
      <View paddingHorizontal="$2" marginBottom="$2">
        <Text color="white" fontSize={14} fontWeight="bold" fontFamily="Inter">
          Top spend by category ({defaultCurrency})
        </Text>
      </View>
      <CarouselItemChart>
        {isEmpty ? (
          <View
            width="100%"
            height="100%"
            alignItems="center"
            justifyContent="center"
            gap="$3"
          >
            <CarouselItemText color="darkgray">No data available</CarouselItemText>
            <CircleSlash size={64} color="darkgray" />
            <View position="absolute" bottom={0}>
              {filters}
            </View>
          </View>
        ) : (
          <View flex={1} justifyContent="space-between">
            <View paddingHorizontal="$2" gap="$2">
              <View flexDirection="row" justifyContent="space-between" alignItems="baseline">
                <Text fontSize="$1" color="$gray10">
                  Top {processedData.length}
                </Text>
                <Text fontSize="$3" fontWeight="bold" color="white">
                  {formatCurrency(shownTotal, defaultCurrency ?? 'USD')}
                </Text>
              </View>
              <View flexDirection="row" height={10} borderRadius={5} overflow="hidden">
                {processedData.map((item) => {
                  const share = shownTotal > 0 ? item.total / shownTotal : 0;
                  const isDimmed = selectedId !== null && selectedId !== item.id;
                  return (
                    <View
                      key={item.id}
                      flex={share}
                      backgroundColor={
                        isDimmed ? withAlpha(colorMap[item.id], 0.25) : colorMap[item.id]
                      }
                    />
                  );
                })}
              </View>
              <View gap="$1.5">
                {processedData.map((item) => {
                  const pct =
                    overallTotal > 0 ? Math.round((item.total / overallTotal) * 100) : 0;
                  const isSelected = selectedId === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() =>
                        setSelectedId((current) => (current === item.id ? null : item.id))
                      }
                    >
                      <View
                        flexDirection="row"
                        alignItems="center"
                        gap="$2"
                        opacity={selectedId !== null && !isSelected ? 0.4 : 1}
                      >
                        <View
                          width={8}
                          height={8}
                          borderRadius={4}
                          backgroundColor={colorMap[item.id]}
                        />
                        <Text fontSize={11} color="white" flex={1} numberOfLines={1}>
                          {item.icon} {item.name}
                        </Text>
                        <Text fontSize={11} color="$gray10" fontWeight="600">
                          {pct}%
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
                {hiddenCategories > 0 && (
                  <Text fontSize={10} color="$gray10">
                    +{hiddenCategories} more {hiddenCategories === 1 ? 'category' : 'categories'}
                  </Text>
                )}
              </View>
            </View>
            <View height={16} justifyContent="center" paddingHorizontal="$3">
              <Text fontSize={11} color={selectedItem ? 'white' : '$gray10'} numberOfLines={1}>
                {selectedItem
                  ? `${selectedItem.icon} ${selectedItem.name} — ${formatCurrency(selectedItem.total, defaultCurrency ?? 'USD')}`
                  : 'Tap a category for details'}
              </Text>
            </View>
            {filters}
          </View>
        )}
      </CarouselItemChart>
    </CarouselItemWrapper>
  );
});

const FilterButtonText = styled(Text, {
  fontSize: 10,
  color: 'white',
  marginTop: -2,
});

const FilterButton = styled(Button, {
  alignSelf: 'flex-start',
  backgroundColor: '$gray',
  borderRadius: '$5',
  height: 22,
  paddingVertical: 0,
  paddingHorizontal: 10,
  alignItems: 'center',
  justifyContent: 'center',
  variants: {
    active: {
      true: {
        backgroundColor: '$stroberi',
      },
    },
  },
} as Record<string, unknown>) as React.ComponentType<
  React.ComponentProps<typeof Button> & { active?: boolean }
>;

type WithFiltersProps = {
  database: Database;
};
const WithFilters = ({ database }: WithFiltersProps) => {
  const [dateFilter, setDateFilter] =
    React.useState<SpendByCategoryDateFilter>('thisMonth');
  return (
    <SpendByCategory
      dateFilter={dateFilter}
      setDateFilter={setDateFilter}
      database={database}
    />
  );
};

export default WithFilters;
