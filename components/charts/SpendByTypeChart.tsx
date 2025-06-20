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
  sortKey: number;
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
            return dayjs().subtract(i, 'month');
          }).reverse();

          return last6Months
            .map(date => {
              const month = date.format('MMM');
              const year = date.year();
              const sortKey = date.valueOf();

              const total = transactions
                .filter(transaction => {
                  const transactionDate = dayjs(transaction.date);
                  return (
                    transactionDate.month() === date.month() &&
                    transactionDate.year() === date.year()
                  );
                })
                .reduce((acc, transaction) => acc + Math.abs(transaction.amountInBaseCurrency), 0);

              return {
                month,
                year,
                sortKey,
                total,
              };
            })
            .sort((a, b) => a.sortKey - b.sortKey);
        })
      ),
  };
})(({ chartData, type }: SpendByMonthProps) => {
  const { defaultCurrency } = useDefaultCurrency();

  const formatMonthLabel = (month: string) => {
    return month?.toString() || '';
  };

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
      formatXLabel={formatMonthLabel}
    />
  );
});
