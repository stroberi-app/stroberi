import { withObservables } from '@nozbe/watermelondb/react';
import { Database, Q } from '@nozbe/watermelondb';
import { map, Observable } from 'rxjs';
import { TransactionModel } from '../../database/transaction-model';
import * as React from 'react';
import { CategoryModel } from '../../database/category-model';
import { Button, styled, useWindowDimensions, View, Text } from 'tamagui';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { SpendBarChart } from './SpendBarChart';
import dayjs from 'dayjs';

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
  let query = database.collections
    .get<TransactionModel>('transactions')
    .query(Q.where('amountInBaseCurrency', Q.lt(0)));
  const today = dayjs();
  if (dateFilter === 'lastMonth') {
    const startOfMonth = today.subtract(1, 'month').startOf('month').toDate();
    const endOfMonth = today.subtract(1, 'month').endOf('month').toDate();
    query = query.extend(Q.where('date', Q.gte(startOfMonth.getTime())));
    query = query.extend(Q.where('date', Q.lte(endOfMonth.getTime())));
  }
  if (dateFilter === 'thisMonth') {
    const startOfMonth = today.startOf('month').toDate();
    const endOfMonth = today.endOf('month').toDate();
    query = query.extend(Q.where('date', Q.gte(startOfMonth.getTime())));
    query = query.extend(Q.where('date', Q.lte(endOfMonth.getTime())));
  }
  if (dateFilter === 'thisYear') {
    const startOfYear = today.startOf('year').toDate();
    const endOfYear = today.endOf('year').toDate();
    query = query.extend(Q.where('date', Q.gte(startOfYear.getTime())));
    query = query.extend(Q.where('date', Q.lte(endOfYear.getTime())));
  }
  return {
    categories: database.collections.get<CategoryModel>('categories').query().observe(),
    chartData: query.observeWithColumns(['categoryId', 'amountInBaseCurrency']).pipe(
      map(transactions => {
        const categories = transactions.reduce(
          (acc, transaction) => {
            const category = transaction.category?.id || 'Uncategorized';
            if (!acc[category]) {
              acc[category] = 0;
            }
            acc[category] += Math.abs(transaction.amountInBaseCurrency);
            return acc;
          },
          {} as Record<string, number>
        );

        return Object.entries(categories).map(([category, total]) => ({
          category,
          total,
        }));
      })
    ),
  };
})(({ chartData, categories, dateFilter, setDateFilter }: SpendByCategoryProps) => {
  const dimensions = useWindowDimensions();
  const { defaultCurrency } = useDefaultCurrency();

  // Calculate optimal number of categories to show based on screen width
  const maxCategories = React.useMemo(() => {
    const screenWidth = dimensions.width;
    if (screenWidth < 350) return 4; // Small screens
    if (screenWidth < 400) return 5; // Medium screens
    if (screenWidth < 500) return 6; // Larger screens
    return 7; // Very large screens
  }, [dimensions.width]);

  // Process and limit data
  const processedData = React.useMemo(() => {
    const dataWithNames = chartData
      .map(({ category, total }) => ({
        category,
        total,
        categoryName: categories.find(c => c.id === category)?.name || 'Uncategorized',
      }))
      .sort((a, b) => b.total - a.total);

    // Filter out categories with zero spending
    const nonZeroData = dataWithNames.filter(item => item.total > 0);
    
    return nonZeroData.slice(0, maxCategories);
  }, [chartData, categories, maxCategories]);

  // Dynamic label formatting based on number of categories and screen size
  const formatCategoryLabel = React.useCallback((categoryName: any) => {
    const str = categoryName?.toString() || '';
    if (!str) return '';
    
    const numCategories = processedData.length;
    const screenWidth = dimensions.width;
    
    // Calculate max label length based on available space
    let maxLength: number;
    if (numCategories <= 3) {
      maxLength = screenWidth < 350 ? 12 : 15; // More space per category
    } else if (numCategories <= 5) {
      maxLength = screenWidth < 350 ? 8 : 10; // Medium space
    } else {
      maxLength = screenWidth < 350 ? 6 : 8; // Less space per category
    }
    
    if (str.length <= maxLength) return str;
    
    // Smart truncation - try to keep meaningful parts
    if (maxLength >= 8) {
      // For longer allowed lengths, truncate at word boundaries if possible
      const words = str.split(' ');
      if (words.length > 1 && words[0].length <= maxLength - 1) {
        return words[0] + '...';
      }
    }
    
    return str.substring(0, maxLength - 3) + '...';
  }, [processedData.length, dimensions.width]);

  // Calculate if we should show a "show more" indicator
  const totalCategories = chartData.filter(item => item.total > 0).length;
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
          {/* Show hidden categories indicator */}
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
          
          {/* Filter buttons */}
          <View
            flexDirection={'row'}
            gap={'$2'}
            justifyContent={'center'}
            paddingHorizontal={'$2'}
            flexWrap={'wrap'}
            alignItems={'center'}>
            <FilterButton
              active={dateFilter === 'thisMonth'}
              onPress={() => {
                setDateFilter('thisMonth');
              }}>
              This month
            </FilterButton>
            <FilterButton
              active={dateFilter === 'lastMonth'}
              onPress={() => {
                setDateFilter('lastMonth');
              }}>
              Last month
            </FilterButton>
            <FilterButton
              active={dateFilter === 'thisYear'}
              onPress={() => {
                setDateFilter('thisYear');
              }}>
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
  const [dateFilter, setDateFilter] = React.useState<SpendByCategoryDateFilter>('thisMonth');
  return (
    <SpendByCategory dateFilter={dateFilter} setDateFilter={setDateFilter} database={database} />
  );
};

export default WithFilters;
