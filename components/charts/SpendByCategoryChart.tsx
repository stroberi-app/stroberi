import { withObservables } from '@nozbe/watermelondb/react';
import { Database, Q } from '@nozbe/watermelondb';
import { map, Observable } from 'rxjs';
import { TransactionModel } from '../../database/transaction-model';
import * as React from 'react';
import { CategoryModel } from '../../database/category-model';
import { useWindowDimensions } from 'tamagui';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { SpendBarChart } from './SpendBarChart';

type SpendByCategoryProps = {
  chartData: SpendByCategoryChartData;
  categories: CategoryModel[];
};
type SpendByCategoryChartData = {
  category: string;
  total: number;
}[];
export const SpendByCategory = withObservables<
  { database: Database },
  {
    chartData: Observable<SpendByCategoryChartData>;
    categories: Observable<CategoryModel[]>;
  }
>([], ({ database }) => {
  return {
    categories: database.collections.get<CategoryModel>('categories').query().observe(),
    chartData: database.collections
      .get<TransactionModel>('transactions')
      .query(Q.where('amountInBaseCurrency', Q.lt(0)))
      .observe()
      .pipe(
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
})(({ chartData, categories }: SpendByCategoryProps) => {
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
    />
  );
});
