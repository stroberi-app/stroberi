import { withObservables } from '@nozbe/watermelondb/react';
import { Database, Q } from '@nozbe/watermelondb';
import { map, Observable } from 'rxjs';
import { TransactionModel } from '../../database/transaction-model';
import { CarouselItemWrapper } from '../carousel/CarouselItemWrapper';
import { CarouselItemText } from '../carousel/CarouselItemText';
import { CarouselItemChart } from '../carousel/CarouselItemChart';
import { BarChart } from '../BarChart';
import * as React from 'react';
import { CircleSlash } from '@tamagui/lucide-icons';
import { View } from 'tamagui';
import dayjs from 'dayjs';

type SpendByMonthProps = {
  chartData: SpendByMonthChartData;
  type: 'expense' | 'income';
};
type SpendByMonthChartData = {
  month: string;
  year: number;
  total: number;
}[];
export const SpendByType = withObservables<
  { database: Database; type: 'expense' | 'income' },
  {
    chartData: Observable<SpendByMonthChartData>;
  }
>(['type'], ({ database, type }) => {
  return {
    chartData: database.collections
      .get<TransactionModel>('transactions')
      .query(Q.where('amount', type === 'income' ? Q.gte(0) : Q.lt(0)))
      .observe()
      .pipe(
        map(transactions => {
          const last6Months = Array.from({ length: 6 }, (_, i) => {
            return dayjs().subtract(i, 'month').toDate();
          }).reverse();

          return last6Months.map(date => {
            const month = date.toLocaleString('default', { month: 'short' });
            const year = date.getFullYear();
            const total = transactions
              .filter(transaction => {
                const transactionDate = new Date(transaction.date);
                return (
                  transactionDate.getMonth() === date.getMonth() &&
                  transactionDate.getFullYear() === date.getFullYear()
                );
              })
              .reduce((acc, transaction) => acc + Math.abs(transaction.amount), 0);
            return {
              month,
              year,
              total,
            };
          });
        })
      ),
  };
})(({ chartData, type }: SpendByMonthProps) => {
  return (
    <CarouselItemWrapper>
      <CarouselItemText>
        {type === 'expense' ? 'Spend by Month' : 'Income by Month'}
      </CarouselItemText>
      <CarouselItemChart>
        {chartData.every(el => el.total === 0) ? (
          <View width={'100%'} height="100%" alignItems={'center'} justifyContent={'center'}>
            <CarouselItemText color={'darkgray'}>No data available</CarouselItemText>
            <CircleSlash size={64} color={'darkgray'} />
          </View>
        ) : (
          <BarChart xKey={'month'} yKeys={['total']} data={chartData} />
        )}
      </CarouselItemChart>
    </CarouselItemWrapper>
  );
});
