import { withObservables } from '@nozbe/watermelondb/react';
import { Database, Q } from '@nozbe/watermelondb';
import { map, Observable } from 'rxjs';
import { TransactionModel } from '../../database/transaction-model';
import * as React from 'react';
import { CategoryModel } from '../../database/category-model';
import { Button, styled, useWindowDimensions, View } from 'tamagui';
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

type SpendByCategoryDateFilter = 'all' | 'lastMonth' | 'thisMonth';
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

  if (dateFilter === 'lastMonth') {
    const startOfMonth = dayjs().subtract(1, 'month').startOf('month').toDate();
    const endOfMonth = dayjs().subtract(1, 'month').endOf('month').toDate();
    query = query.extend(Q.where('date', Q.gte(startOfMonth.getTime())));
    query = query.extend(Q.where('date', Q.lte(endOfMonth.getTime())));
  }
  if (dateFilter === 'thisMonth') {
    const startOfMonth = dayjs().startOf('month').toDate();
    const endOfMonth = dayjs().endOf('month').toDate();
    query = query.extend(Q.where('date', Q.gte(startOfMonth.getTime())));
    query = query.extend(Q.where('date', Q.lte(endOfMonth.getTime())));
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
  const data = chartData
    .map(({ category, total }) => ({
      category,
      total,
      categoryName: categories.find(c => c.id === category)?.name || 'Uncategorized',
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const dimensions = useWindowDimensions();
  const totalBars = data.length;
  const { defaultCurrency } = useDefaultCurrency();
  return (
    <SpendBarChart
      chartData={data}
      title={`Top spend by category (${defaultCurrency})`}
      xKey={'categoryName'}
      yKeys={['total']}
      isEmpty={data.length === 0}
      barCount={totalBars}
      barWidth={totalBars > 0 ? Math.min(dimensions.width / totalBars - 40, 60) : 0}
      footer={
        <View
          flexDirection={'row'}
          gap={'$2'}
          justifyContent={'center'}
          paddingHorizontal={'$2'}
          flexWrap={'wrap'}
          alignItems={'center'}>
          <FilterButton
            active={dateFilter === 'all'}
            onPress={() => {
              setDateFilter('all');
            }}>
            All time
          </FilterButton>
          <FilterButton
            active={dateFilter === 'lastMonth'}
            onPress={() => {
              setDateFilter('lastMonth');
            }}>
            Last month
          </FilterButton>
          <FilterButton
            active={dateFilter === 'thisMonth'}
            onPress={() => {
              setDateFilter('thisMonth');
            }}>
            This month
          </FilterButton>
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
  const [dateFilter, setDateFilter] = React.useState<SpendByCategoryDateFilter>('all');
  return (
    <SpendByCategory dateFilter={dateFilter} setDateFilter={setDateFilter} database={database} />
  );
};

export default WithFilters;
