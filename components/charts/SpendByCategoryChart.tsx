import { type Database, Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import dayjs from 'dayjs';
import * as React from 'react';
import { map, type Observable } from 'rxjs';
import { Button, styled, Text, useWindowDimensions, View } from 'tamagui';
import type { CategoryModel } from '../../database/category-model';
import type { TransactionModel } from '../../database/transaction-model';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { calculateCategorySpending } from '../../lib/transactionAnalytics';
import { SpendBarChart } from './SpendBarChart';

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

  const formatCategoryLabel = React.useCallback(
    (categoryName: string) => {
      const str = categoryName?.toString() || '';
      if (!str) return '';

      const numCategories = processedData.length;
      const screenWidth = dimensions.width;

      let maxLength: number;
      if (numCategories <= 3) {
        maxLength = screenWidth < 350 ? 12 : 15;
      } else if (numCategories <= 5) {
        maxLength = screenWidth < 350 ? 8 : 10;
      } else {
        maxLength = screenWidth < 350 ? 6 : 8;
      }

      if (str.length <= maxLength) return str;

      if (maxLength >= 8) {
        const words = str.split(' ');
        if (words.length > 1 && words[0].length <= maxLength - 1) {
          return `${words[0]}...`;
        }
      }

      return `${str.substring(0, maxLength - 3)}...`;
    },
    [processedData.length, dimensions.width]
  );

  const totalCategories = chartData.filter((item) => item.total > 0).length;
  const hiddenCategories = Math.max(0, totalCategories - maxCategories);

  return (
    <SpendBarChart
      chartData={processedData}
      title={`Top spend by category (${defaultCurrency})`}
      xKey={'categoryName'}
      yKeys={['total']}
      isEmpty={processedData.length === 0}
      formatXLabel={formatCategoryLabel}
      footer={
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
      }
    />
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
});

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
