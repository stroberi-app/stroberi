import { type Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { CircleSlash } from '@tamagui/lucide-icons';
import dayjs from 'dayjs';
import * as React from 'react';
import { map, type Observable } from 'rxjs';
import { useWindowDimensions } from 'react-native';
import { Button, styled, Text, View } from 'tamagui';
import type { CategoryModel } from '../../database/category-model';
import type { TransactionModel } from '../../database/transaction-model';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { buildCategoryColorMap } from '../../lib/chartColors';
import { formatYAxisLabel } from '../../lib/chartUtils';
import { calculateCategorySpending } from '../../lib/transactionAnalytics';
import { CarouselItemChart } from '../carousel/CarouselItemChart';
import { CarouselItemText } from '../carousel/CarouselItemText';
import { CarouselItemWrapper } from '../carousel/CarouselItemWrapper';
import { HorizontalBarChart } from './HorizontalBarChart';

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
  const dimensions = useWindowDimensions();
  const { defaultCurrency } = useDefaultCurrency();

  const maxCategories = React.useMemo(() => {
    const screenWidth = dimensions.width;
    if (screenWidth < 350) return 4;
    if (screenWidth < 400) return 5;
    if (screenWidth < 500) return 6;
    return 7;
  }, [dimensions.width]);

  const processedData = React.useMemo(() => {
    const dataWithNames = chartData
      .map(({ category, total }) => ({
        category,
        total,
        categoryName: categories.find((c) => c.id === category)?.name || 'Uncategorized',
      }))
      .sort((a, b) => b.total - a.total);

    const nonZeroData = dataWithNames.filter((item) => item.total > 0);

    return nonZeroData.slice(0, maxCategories);
  }, [chartData, categories, maxCategories]);

  // Horizontal bars give category labels their own (vertical) axis, so they can
  // be far longer than the old rotated vertical-bar labels.
  const formatCategoryLabel = React.useCallback(
    (categoryName: string) => {
      const str = categoryName?.toString() || '';
      if (!str) return '';
      const maxLength = dimensions.width < 350 ? 12 : 16;
      return str.length > maxLength ? `${str.substring(0, maxLength - 1)}…` : str;
    },
    [dimensions.width]
  );

  const barColors = React.useMemo(() => {
    const colorMap = buildCategoryColorMap(processedData.map((item) => item.category));
    return processedData.map((item) => colorMap[item.category]);
  }, [processedData]);

  const totalCategories = chartData.filter((item) => item.total > 0).length;
  const hiddenCategories = Math.max(0, totalCategories - maxCategories);
  const isEmpty = processedData.length === 0;

  const filters = (
    <View gap="$2" alignItems="center">
      {hiddenCategories > 0 && (
        <View paddingHorizontal="$2" marginBottom="$1">
          <View
            backgroundColor="rgba(255, 255, 255, 0.1)"
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$3"
          >
            <Text fontSize={11} color="rgba(255, 255, 255, 0.7)">
              +{hiddenCategories} more categories
            </Text>
          </View>
        </View>
      )}

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
          This month
        </FilterButton>
        <FilterButton
          active={dateFilter === 'lastMonth'}
          onPress={() => {
            setDateFilter('lastMonth');
          }}
        >
          Last month
        </FilterButton>
        <FilterButton
          active={dateFilter === 'thisYear'}
          onPress={() => {
            setDateFilter('thisYear');
          }}
        >
          This year
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
          <>
            <HorizontalBarChart
              data={processedData}
              xKey={'categoryName'}
              yKey={'total'}
              colors={barColors}
              formatXLabel={formatCategoryLabel}
              formatValueLabel={(value) => formatYAxisLabel(value)}
            />
            {filters}
          </>
        )}
      </CarouselItemChart>
    </CarouselItemWrapper>
  );
});

const FilterButton = styled(Button, {
  alignSelf: 'flex-start',
  backgroundColor: '$gray',
  color: 'white',
  borderRadius: '$5',
  paddingVertical: '$1',
  paddingHorizontal: '$3',
  height: 'fit-content',
  fontSize: '$2',
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
