import { withObservables } from '@nozbe/watermelondb/react';
import { Database, Q } from '@nozbe/watermelondb';
import { map, Observable } from 'rxjs';
import { TransactionModel } from '../../database/transaction-model';
import { CarouselItemWrapper } from '../carousel/CarouselItemWrapper';
import * as React from 'react';
import { CategoryModel } from '../../database/category-model';
import { CarouselItemText } from '../carousel/CarouselItemText';
import { CarouselItemChart } from '../carousel/CarouselItemChart';
import { BarChart } from '../BarChart';
import { useWindowDimensions, View } from 'tamagui';
import { CircleSlash } from '@tamagui/lucide-icons';

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
      .query(Q.where('amount', Q.lt(0)))
      .observe()
      .pipe(
        map(transactions => {
          const categories = transactions.reduce(
            (acc, transaction) => {
              const category = transaction.categoryId?.id || 'Uncategorized';
              if (!acc[category]) {
                acc[category] = 0;
              }
              acc[category] += Math.abs(transaction.amount);
              return acc;
            },
            {} as Record<string, number>
          );

          return Object.entries(categories).map(([category, total]) => ({
            category,
            total,
            name: 'test',
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
    .slice(0, 4);

  const dimensions = useWindowDimensions();
  const totalBars = data.length;
  return (
    <CarouselItemWrapper>
      <CarouselItemText>Top spend by category</CarouselItemText>
      <CarouselItemChart>
        {data.length === 0 ? (
          <View width={'100%'} height="100%" alignItems={'center'} justifyContent={'center'}>
            <CarouselItemText color={'darkgray'}>No data available</CarouselItemText>
            <CircleSlash size={64} color={'darkgray'} />
          </View>
        ) : (
          <BarChart
            xKey={'categoryName'}
            yKeys={['total']}
            barWidth={Math.min(dimensions.width / totalBars - 40, 60)}
            data={data}
          />
        )}
      </CarouselItemChart>
    </CarouselItemWrapper>
  );
});
