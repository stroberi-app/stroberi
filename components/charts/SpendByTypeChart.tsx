import { withObservables } from '@nozbe/watermelondb/react';
import { Database, Q } from '@nozbe/watermelondb';
import { map, Observable } from 'rxjs';
import { TransactionModel } from '../../database/transaction-model';
import * as React from 'react';
import dayjs from 'dayjs';
import { useDefaultCurrency } from '../../hooks/useDefaultCurrency';
import { SpendBarChart } from './SpendBarChart';

type SpendByMonthProps = {
  chartData: SpendByMonthChartData;
  type: 'expense' | 'income';
};
export type SpendByMonthChartData = {
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
      .query(Q.where('amountInBaseCurrency', type === 'income' ? Q.gte(0) : Q.lt(0)))
      .observeWithColumns(['date', 'amountInBaseCurrency'])
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
              .reduce((acc, transaction) => acc + Math.abs(transaction.amountInBaseCurrency), 0);
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
  const { defaultCurrency } = useDefaultCurrency();
  return (
    <SpendBarChart
      chartData={chartData}
      title={
        type === 'expense'
          ? `Spend by Month (${defaultCurrency})`
          : `Income by Month (${defaultCurrency})`
      }
      isEmpty={chartData.every(el => el.total === 0)}
      xKey={'month'}
      yKeys={['total']}
    />
  );
});
